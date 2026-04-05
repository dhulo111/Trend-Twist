// frontend/src/components/features/chat/ChatWindow.jsx

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { getChatHistory, getGroupMessages } from '../../../api/chatApi';
import { AuthContext } from '../../../context/AuthContext';
import Message from './Message';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import { IoSend, IoCallOutline, IoVideocamOutline, IoArrowBack, IoEyeOutline, IoPeople, IoLockClosed } from 'react-icons/io5';
import config from '../../../config';
import CallInterface from './CallInterface';
import { useNavigate } from 'react-router-dom';
import GroupDetailsModal from './GroupDetailsModal';
import { encryptMessage, decryptMessage, getRoomId, isEncrypted } from '../../../utils/encryption';

// --- ICE Server Config (STUN + public TURN for NAT traversal) ---
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // Free public TURN servers as fallback for symmetric NAT
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

const ChatWindow = ({ room, otherUser, onBack, onMessageUpdate, isGroup, activeChat, incomingCallDataFromState }) => {
  const { authToken, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('Connecting...');

  // Derive a stable room ID for encryption key derivation
  const roomId = user ? getRoomId({
    isGroup,
    currentUserId: user.id,
    otherUserId: otherUser?.id,
    groupId: activeChat?.id,
  }) : null;

  // --- User Presence State ---
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // --- Calling State ---
  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState('video');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callDuration, setCallDuration] = useState(0); // seconds
  const [showGroupDetails, setShowGroupDetails] = useState(false);

  // --- Refs ---
  const iceCandidatesQueue = useRef([]);
  const peerConnectionRef = useRef(null);
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null); // ← Fix stale closure: always current stream
  const callDurationRef = useRef(0);
  const callDurationTimerRef = useRef(null);

  // Refs for state access inside WS callbacks (stale closures fix)
  const callStatusRef = useRef(callStatus);
  const callTypeRef = useRef(callType);
  const incomingCallDataRef = useRef(incomingCallData);

  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { incomingCallDataRef.current = incomingCallData; }, [incomingCallData]);

  // Keep localStreamRef in sync
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // --- Call Duration Timer ---
  useEffect(() => {
    if (callStatus === 'connected') {
      callDurationRef.current = 0;
      setCallDuration(0);
      callDurationTimerRef.current = setInterval(() => {
        callDurationRef.current += 1;
        setCallDuration(callDurationRef.current);
      }, 1000);
    } else {
      clearInterval(callDurationTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callDurationTimerRef.current);
  }, [callStatus]);

  // --- 1. Fetch History on Load (with decryption) ---
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        let history;
        if (isGroup) {
          history = await getGroupMessages(activeChat.id);
        } else {
          history = await getChatHistory(otherUser.id);
        }

        // Decrypt history messages
        if (roomId) {
          history = await Promise.all(
            history.map(async (msg) => {
              if (msg.content && isEncrypted(msg.content)) {
                return { ...msg, content: await decryptMessage(msg.content, roomId) };
              }
              return msg;
            })
          );
        }

        setMessages(history);
      } catch (e) {
        setMessages([]);
        console.error('Failed to load history.', e);
      } finally {
        setLoading(false);
      }
    };
    if ((isGroup && activeChat) || (!isGroup && otherUser)) {
      fetchHistory();
    }
  }, [activeChat, otherUser, isGroup, roomId]);

  // --- Auto-Accept Global Call Handover ---
  useEffect(() => {
    if (incomingCallDataFromState && callStatus === 'idle') {
      console.log('[ChatWindow] Auto-accepting global handover call');
      setIncomingCallData(incomingCallDataFromState);
      setCallType(incomingCallDataFromState.callType);
      
      // We wrap in a small timeout to ensure the WebSocket 'accept' is finished first
      setTimeout(() => {
        acceptCall();
      }, 500);
    }
  }, [incomingCallDataFromState]);


  // ====================================================================
  //  WebRTC Logic
  // ====================================================================

  // 1. Helper to End Call (uses refs — no stale closures)
  const endCall = useCallback((sendSignal = true) => {
    const duration = callDurationRef.current;

    if (sendSignal && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'call_ended', duration }));

      // Persist call log in chat if call was actually connected
      if (callStatusRef.current === 'connected') {
        const callMsg = `☎️ ${callTypeRef.current === 'video' ? 'Video' : 'Voice'} call ended · ${formatDuration(duration)}`;
        wsRef.current.send(JSON.stringify({ message: callMsg }));
      }
    }

    // Cleanly close PeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop all media tracks (use ref — NOT stale state)
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    clearInterval(callDurationTimerRef.current);
    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCallData(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
    iceCandidatesQueue.current = [];
  }, []); // stable — uses only refs

  const endCallRef = useRef(endCall);
  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  // 2. Helper to Create PeerConnection
  const createPeerConnection = useCallback(() => {
    // Close any existing connection first
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'new_ice_candidate',
          candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        // Auto-transition caller to connected when tracks arrive
        setCallStatus(prev => prev === 'calling' ? 'connected' : prev);
      }
    };

    // Only end call on 'failed' — NOT on 'disconnected' (ICE restarts are normal)
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state:', state);
      if (state === 'failed') {
        endCallRef.current(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('[WebRTC] ICE state:', state);
      if (state === 'connected' || state === 'completed') {
        // Ensure status is 'connected' when ICE succeeds
        setCallStatus(prev => (prev === 'calling' || prev === 'connecting') ? 'connected' : prev);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // 3. Handle Signaling Messages (with ICE buffering)
  const handleCallSignal = useCallback(async (signal) => {
    const { data } = signal;
    const { type } = data;

    if (type === 'call_offer') {
      if (callStatusRef.current !== 'idle') return;
      setIncomingCallData(data);
      setCallType(data.callType);
      setCallStatus('incoming');
    }
    else if (type === 'call_answer') {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          setCallStatus('connected');
          // Flush buffered ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const c = iceCandidatesQueue.current.shift();
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c));
          }
        } catch (e) {
          console.error('[WebRTC] Error setting remote description from answer:', e);
        }
      }
    }
    else if (type === 'new_ice_candidate') {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (e) {
          console.warn('[WebRTC] Error adding ICE candidate (may be harmless):', e.message);
        }
      } else {
        // Buffer until remote description is set
        iceCandidatesQueue.current.push(data.candidate);
      }
    }
    else if (type === 'call_ended') {
      endCallRef.current(false);
    }
  }, []);

  const handleCallSignalRef = useRef(handleCallSignal);
  useEffect(() => { handleCallSignalRef.current = handleCallSignal; }, [handleCallSignal]);

  // 4. Start Call (Caller)
  const startCall = async (type) => {
    if (callStatus !== 'idle') return; // Prevent double-call
    setCallType(type);
    setCallStatus('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
      await pc.setLocalDescription(offer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'call_offer',
          sdp: offer,
          callType: type,
        }));
      }
    } catch (err) {
      console.error('[WebRTC] Error starting call:', err);
      setCallStatus('idle');
      setLocalStream(null);
      localStreamRef.current = null;

      if (err.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera/microphone found. Please connect a device and try again.');
      } else {
        alert(`Could not start call: ${err.message}`);
      }
    }
  };

  // 5. Accept Call (Receiver)
  const acceptCall = async () => {
    const incomingData = incomingCallDataRef.current;
    if (!incomingData) return;

    setCallStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingData.callType === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.sdp));

      // Flush buffered ICE candidates
      while (iceCandidatesQueue.current.length > 0) {
        const c = iceCandidatesQueue.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'call_answer', sdp: answer }));
      }

      setCallStatus('connected');
    } catch (err) {
      console.error('[WebRTC] Error accepting call:', err);
      if (err.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow permissions.');
      } else {
        alert(`Could not join call: ${err.message}`);
      }
      endCallRef.current(true); // Reject and notify caller
    }
  };

  // 6. Media Toggles
  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMicMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsVideoOff(prev => !prev);
    }
  };

  // --- Duration Formatter ---
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ====================================================================
  //  WebSocket Connection
  // ====================================================================
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if ((isGroup && !activeChat) || (!isGroup && !otherUser)) return;

    let wsProtocol = 'ws:';
    let wsHost = '127.0.0.1:8000';
    let reconnectTimeout;

    try {
      const url = new URL(config.API_BASE_URL);
      wsHost = url.host;
      wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    } catch (e) {
      if (window.location.hostname !== 'localhost') {
        wsHost = window.location.host;
        wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      }
    }

    const endpoint = isGroup ? `group/${activeChat.id}` : otherUser.id;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${endpoint}/?token=${authToken.access}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('Connected.');
      if (!isGroup) ws.send(JSON.stringify({ type: 'mark_read' }));
    };

    ws.onmessage = async (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'user_status') {
        if (!isGroup && data.username === otherUser.username) {
          setIsOnline(data.is_online);
          setLastSeen(data.last_seen);
        }
      } else if (data.type === 'message_read') {
        if (!isGroup) setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      } else if (data.type === 'chat_message') {
        let decryptedContent = data.content;
        if (roomId && data.content && isEncrypted(data.content)) {
          decryptedContent = await decryptMessage(data.content, roomId);
        }
        const decryptedMsg = { ...data, content: decryptedContent };

        setMessages(prev => {
          if (prev.find(m => m.id === decryptedMsg.id)) return prev;
          return [...prev, decryptedMsg];
        });
        if (!isGroup && data.author_username === otherUser.username) {
          ws.send(JSON.stringify({ type: 'mark_read' }));
        }
        if (onMessageUpdate) onMessageUpdate();
      } else if (data.type === 'message_updated') {
        let decryptedContent = data.content;
        if (roomId && data.content && isEncrypted(data.content)) {
          decryptedContent = await decryptMessage(data.content, roomId);
        }
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: decryptedContent } : m));
      } else if (data.type === 'message_deleted') {
        setMessages(prev => prev.filter(m => m.id !== data.id));
      } else if (data.type === 'call_signal') {
        // Backend now relays as 'call_signal'
        handleCallSignalRef.current(data);
      }
    };

    ws.onclose = () => {
      setWsStatus('Reconnecting...');
      // NOTE: Do NOT end the call here.
      // WebRTC peer connections are independent of the signaling WebSocket.
      // Once ICE is established the call continues P2P even if WS drops.
      reconnectTimeout = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 3000);
    };

    ws.onerror = (e) => {
      console.error('[WebSocket] Error:', e);
    };

    return () => {
      clearTimeout(reconnectTimeout);
      // Close the WebSocket cleanly - this does NOT end the call.
      // The peer connection (WebRTC) is separate and survives WS reconnects.
      ws.onclose = null; // Prevent the onclose handler from firing and scheduling
                         // another reconnect after we intentionally close the socket.
      ws.close(1000, 'Reconnecting or cleanup');
    };
  }, [activeChat, otherUser, isGroup, authToken, refreshTrigger]);

  // True component-unmount cleanup — ends any in-progress call.
  // This is separate from the WS effect so it only fires once, on unmount.
  useEffect(() => {
    return () => {
      endCallRef.current(false);
    };
  }, []); // Empty deps = only runs when component truly unmounts

  // --- 3. Scroll to Bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // --- 4. Send Message (encrypted) ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;

    const plaintext = newMessage;
    setNewMessage('');

    let payload = plaintext;
    if (roomId) {
      payload = await encryptMessage(plaintext, roomId);
    }

    wsRef.current.send(JSON.stringify({ message: payload }));
    if (onMessageUpdate) onMessageUpdate();
  };

  const handleEditMessage = async (id, newContent) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    let encryptedContent = newContent;
    if (roomId) encryptedContent = await encryptMessage(newContent, roomId);
    wsRef.current.send(JSON.stringify({ type: 'edit_message', id, content: encryptedContent }));
  };

  const handleDeleteMessage = (id) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'delete_message', id }));
    }
  };

  // ====================================================================
  //  Render Helpers
  // ====================================================================

  const renderHeaderInfo = () => {
    if (isGroup) {
      return (
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowGroupDetails(true)}>
          <Avatar src={activeChat.icon} size="md" />
          <div className="flex flex-col">
            <p className="font-semibold text-text-primary text-sm md:text-base">{activeChat.name}</p>
            <p className="text-xs text-text-secondary flex items-center">
              <IoPeople className="mr-1" /> {activeChat.members_count} members
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-3">
          <Avatar src={otherUser.profile?.profile_picture} size="md" />
          <div
            className="flex flex-col cursor-pointer hover:opacity-80 transition"
            onClick={() => navigate(`/profile/${otherUser.username}`)}
          >
            <p className="font-semibold text-text-primary text-sm md:text-base">{otherUser.username}</p>
            {isOnline ? (
              <p className="text-xs text-green-500 font-bold">Active now</p>
            ) : (
              <p className="text-xs text-text-secondary">
                {lastSeen
                  ? `Active ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Offline'}
              </p>
            )}
          </div>
        </div>
      );
    }
  };

  const E2EEBadge = () => (
    <div className="flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-500">
      <IoLockClosed className="h-2.5 w-2.5" />
      End-to-end encrypted
    </div>
  );

  // ====================================================================
  //  Render
  // ====================================================================
  return (
    <div className="flex h-full flex-col">
      {/* --- Chat Header --- */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-glass-bg backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-text-primary">
            <IoArrowBack size={24} />
          </button>
          {renderHeaderInfo()}
        </div>

        <div className="flex items-center gap-3">
          <E2EEBadge />
          {!isGroup && (
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IoCallOutline />}
                onClick={() => startCall('voice')}
                disabled={callStatus !== 'idle'}
              >
                Call
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IoVideocamOutline />}
                onClick={() => startCall('video')}
                disabled={callStatus !== 'idle'}
              >
                Video
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* --- Full-Screen Call Interface --- */}
      <CallInterface
        callStatus={callStatus}
        callType={callType}
        otherUser={otherUser}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptCall}
        onReject={() => endCall(true)}
        onEnd={() => endCall(true)}
        isMicMuted={isMicMuted}
        isVideoOff={isVideoOff}
        onToggleMic={toggleMic}
        onToggleVideo={toggleVideo}
        callDuration={callDuration}
        formatDuration={formatDuration}
      />

      {/* --- Message History --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : (
          messages.map((msg, index) => (
            <div key={msg.id ?? index} className="flex flex-col">
              <Message
                message={msg}
                currentUsername={user?.username}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
              {index === messages.length - 1 &&
                !isGroup &&
                msg.author_username === user?.username &&
                msg.is_read && (
                  <div className="flex justify-end pr-2 mt-1">
                    <span className="text-xs text-text-secondary flex items-center">
                      Seen <IoEyeOutline className="ml-1" />
                    </span>
                  </div>
                )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* --- Group Details Modal --- */}
      {showGroupDetails && isGroup && (
        <GroupDetailsModal
          group={{ ...activeChat, current_user_id: user.id }}
          onClose={() => setShowGroupDetails(false)}
          onUpdate={() => { if (onMessageUpdate) onMessageUpdate(); setShowGroupDetails(false); }}
          onDelete={() => { onBack(); }}
        />
      )}

      {/* --- Message Input --- */}
      <form onSubmit={handleSend} className="flex items-center border-t border-border p-4">
        <Input
          id="chatInput"
          type="text"
          placeholder="Send a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 mr-3"
        />
        <Button type="submit" disabled={!newMessage.trim()}>
          <IoSend className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;