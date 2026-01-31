// frontend/src/components/features/chat/ChatWindow.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import { getChatHistory } from '../../../api/chatApi';
import { AuthContext } from '../../../context/AuthContext';
import Message from './Message';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Avatar from '../../common/Avatar';
import { IoSend, IoCallOutline, IoVideocamOutline, IoArrowBack, IoEyeOutline } from 'react-icons/io5';
import config from '../../../config';
import CallInterface from './CallInterface';
import { useNavigate } from 'react-router-dom';

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const ChatWindow = ({ room, otherUser, onBack, onMessageUpdate }) => {
  const { authToken, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('Connecting...');

  // User Presence State
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // --- Calling State ---
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, connected, ended
  const [callType, setCallType] = useState('video'); // video, voice
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);

  const peerConnectionRef = useRef(null);
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

  // Refs for State Access inside WS Callbacks (Stale Closures Fix)
  const callStatusRef = useRef(callStatus);
  const incomingCallDataRef = useRef(incomingCallData);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    incomingCallDataRef.current = incomingCallData;
  }, [incomingCallData]);

  // --- 1. Fetch History on Load ---
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const history = await getChatHistory(otherUser.id);
        setMessages(history);
      } catch (e) {
        setMessages([]);
        console.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [otherUser.id]);


  // --- WebRTC Logic (Defined before WS to be available in closure if needed, though with Refs it's flexible) ---

  // 1. Helper to End Call
  const endCall = (sendSignal = true) => {
    if (sendSignal && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'call_ended' }));
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setCallStatus('idle');
    setIncomingCallData(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
  };

  // NOTE: endCallRef to be used in ws.onclose
  const endCallRef = useRef(endCall);
  useEffect(() => { endCallRef.current = endCall; });

  // 2. Helper to Create PC
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'new_ice_candidate',
          candidate: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // 3. Handle Signaling Messages
  // 3. Handle Signaling Messages
  const handleCallSignal = async (signal) => {
    const { data } = signal;
    const { type } = data;

    if (type === 'call_offer') {
      if (callStatusRef.current !== 'idle') {
        // Busy
        return;
      }
      setIncomingCallData(data);
      setCallType(data.callType);
      setCallStatus('incoming');
    }
    else if (type === 'call_answer') {
      if (callStatusRef.current === 'calling' && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        setCallStatus('connected');
      }
    }
    else if (type === 'new_ice_candidate') {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    }
    else if (type === 'call_ended') {
      endCallRef.current(false);
    }
  };

  // NOTE: handleCallSignalRef for WS
  const handleCallSignalRef = useRef(handleCallSignal);
  useEffect(() => { handleCallSignalRef.current = handleCallSignal; });


  // 4. Start Call
  const startCall = async (type) => {
    setCallType(type);
    setCallStatus('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'call_offer',
          sdp: offer,
          callType: type
        }));
      }

    } catch (err) {
      console.error("Error starting call:", err);
      setCallStatus('idle');
      if (err.name === 'NotReadableError') {
        alert("Camera/Microphone is already in use using by another app or tab. Please close them and try again.");
      } else {
        alert("Could not access camera/microphone");
      }
    }
  };

  // 5. Accept Call
  const acceptCall = async () => {
    const incomingData = incomingCallDataRef.current;
    if (!incomingData) return;

    setCallStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingData.callType === 'video',
        audio: true
      });
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'call_answer',
          sdp: answer
        }));
      }

      setCallStatus('connected');

    } catch (err) {
      console.error("Error accepting call:", err);
      if (err.name === 'NotReadableError') {
        alert("Camera/Microphone is already in use using by another app or tab. Please close them and try again.");
      } else {
        alert(`Connection failed: ${err.message}`);
      }
      endCallRef.current(true);
    }
  };

  // 6. Toggles
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMicMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(prev => !prev);
    }
  };


  // --- 2. WebSocket Connection Logic ---
  useEffect(() => {
    // Determine WS Host dynamically
    let wsProtocol = 'ws:';
    let wsHost = '127.0.0.1:8000';

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

    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${otherUser.id}/?token=${authToken.access}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('Connected.');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 'type': 'mark_read' }));
      }
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'user_status') {
        if (data.username === otherUser.username) {
          setIsOnline(data.is_online);
          setLastSeen(data.last_seen);
        }
      } else if (data.type === 'message_read') {
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      } else if (data.type === 'chat_message') {
        setMessages((prevMessages) => [...prevMessages, data]);
        if (data.author_username === otherUser.username) {
          ws.send(JSON.stringify({ 'type': 'mark_read' }));
        }
        if (onMessageUpdate) onMessageUpdate();
      } else if (data.type === 'message_updated') {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, content: data.content } : m));
      } else if (data.type === 'message_deleted') {
        setMessages(prev => prev.filter(m => m.id !== data.id));
      } else if (data.type === 'call_signal') {
        handleCallSignalRef.current(data);
      }
    };

    ws.onclose = () => {
      setWsStatus('Disconnected. Attempting to reconnect...');
      // Clean up call if disconnected
      endCallRef.current();
    };

    ws.onerror = (e) => {
      setWsStatus('Connection Error.');
      console.error('WebSocket Error:', e);
    };

    return () => {
      ws.close();
      endCallRef.current(false);
    };
  }, [otherUser.id, authToken]);

  // --- 3. Scroll to Bottom Effect ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // --- 4. Send Message Handler ---
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      'message': newMessage,
    }));

    if (onMessageUpdate) onMessageUpdate();

    setNewMessage('');
  };

  const handleEditMessage = (id, newContent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit_message',
        id: id,
        content: newContent
      }));
    }
  };

  const handleDeleteMessage = (id) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_message',
        id: id
      }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* --- Chat Header --- */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-glass-bg backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-text-primary">
            <IoArrowBack size={24} />
          </button>

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
                {lastSeen ? `Active ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
              </p>
            )}
          </div>
        </div>

        {/* Call Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IoCallOutline />}
            onClick={() => startCall('voice')}
          >
            Call
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IoVideocamOutline />}
            onClick={() => startCall('video')}
          >
            Video
          </Button>
        </div>
      </div>

      {/* Call Interface Overlay */}
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
      />

      {/* --- Message History --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="flex flex-col">
              <Message
                message={msg}
                currentUsername={user?.username}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
              {index === messages.length - 1 && msg.author_username === user?.username && msg.is_read && (
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