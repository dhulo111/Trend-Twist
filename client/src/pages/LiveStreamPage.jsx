import React, { useEffect, useRef, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { startLiveStream, endLiveStream, joinLiveStream } from '../api/storyApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IoClose, IoSend, IoEye, IoHeart,
  IoVideocam, IoVideocamOff, IoMic, IoMicOff
} from 'react-icons/io5';
import Avatar from '../components/common/Avatar';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// ─── Helper: broadcast-safe ICE candidate application ──────────────────────
const drainCandidates = async (pc, queue) => {
  while (queue.length > 0) {
    const c = queue.shift();
    try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
  }
};

const LiveStreamPage = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { user, authToken } = useContext(AuthContext);

  const [isHost, setIsHost] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [hearts, setHearts] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const processedMsgsRef = useRef(new Set());
  const isHostRef = useRef(false);
  const pendingCandidates = useRef([]);
  const negotiatingRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Toggle mic/cam (host only) ────────────────────────────────────────────
  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !isMicOn;
    stream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    setIsMicOn(enabled);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !isCamOn;
    stream.getVideoTracks().forEach(t => { t.enabled = enabled; });
    setIsCamOn(enabled);
  };

  // ─── Main Effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;
    let retryTimer = null;

    // ── createPC: builds a fresh RTCPeerConnection for the viewer ────────────
    const createViewerPC = (wsConn) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (ev) => {
        if (ev.candidate && wsConn.readyState === WebSocket.OPEN) {
          wsConn.send(JSON.stringify({ type: 'candidate', candidate: ev.candidate }));
        }
      };

      pc.ontrack = (ev) => {
        console.log('[Viewer] ontrack:', ev.track.kind, ev.streams);
        if (!destroyed && remoteVideoRef.current && ev.streams?.[0]) {
          remoteVideoRef.current.srcObject = ev.streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[ICE]', pc.iceConnectionState);
        if ((pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') && wsConn.readyState === WebSocket.OPEN) {
          // Ask host for a fresh offer
          wsConn.send(JSON.stringify({ type: 'request_offer' }));
        }
      };

      return pc;
    };

    // ── createHostPC: builds a fresh RTCPeerConnection for the host ──────────
    const createHostPC = (wsConn, stream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (ev) => {
        if (ev.candidate && wsConn.readyState === WebSocket.OPEN) {
          wsConn.send(JSON.stringify({ type: 'candidate', candidate: ev.candidate }));
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[Host ICE]', pc.iceConnectionState);
      };

      return pc;
    };

    // ── sendOffer: host creates+sends offer ───────────────────────────────────
    const sendOffer = async (pc, wsConn) => {
      if (!pc || negotiatingRef.current) return;
      if (pc.signalingState !== 'stable') {
        console.log('[Host] Skipping offer, state:', pc.signalingState);
        return;
      }
      negotiatingRef.current = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (wsConn.readyState === WebSocket.OPEN) {
          wsConn.send(JSON.stringify({ type: 'offer', sdp: offer }));
          console.log('[Host] Offer sent');
        }
      } catch (err) {
        console.error('[Host] Error sending offer:', err);
      } finally {
        negotiatingRef.current = false;
      }
    };

    const init = async () => {
      try {
        let actualStreamId;

        if (streamId === 'new') {
          isHostRef.current = true;
          setIsHost(true);
          const newStream = await startLiveStream({ title: `${user.username}'s Live` });
          setStreamData(newStream);
          actualStreamId = newStream.stream_id;
        } else {
          isHostRef.current = false;
          setIsHost(false);
          const joinedStream = await joinLiveStream(streamId);
          setStreamData(joinedStream);
          actualStreamId = streamId;
        }

        if (destroyed) return;

        // Host: get camera/mic
        let localStream = null;
        if (isHostRef.current) {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = localStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }

        if (destroyed) return;

        // Build WebSocket
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const ws = new WebSocket(`${wsProto}//${wsHost}/ws/live/${actualStreamId}/?token=${authToken.access}`);
        wsRef.current = ws;

        // Build initial PC
        let pc = isHostRef.current
          ? createHostPC(ws, localStream)
          : createViewerPC(ws);
        pcRef.current = pc;

        // ── Message handler ─────────────────────────────────────────────────
        ws.onmessage = async (ev) => {
          let data;
          try { data = JSON.parse(ev.data); } catch { return; }

          // ── Signaling ──────────────────────────────────────────────────────
          if (data.type === 'signal') {
            const sig = data.data;

            // ── VIEWER receives OFFER ────────────────────────────────────────
            if (sig.type === 'offer' && !isHostRef.current) {
              try {
                // If signaling is mid-flight, reset with rollback
                if (pc.signalingState !== 'stable') {
                  await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
                }
                await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
                await drainCandidates(pc, pendingCandidates.current);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
                  console.log('[Viewer] Answer sent');
                }
              } catch (err) {
                console.error('[Viewer] Error handling offer:', err);
              }
              return;
            }

            // ── HOST receives ANSWER ─────────────────────────────────────────
            if (sig.type === 'answer' && isHostRef.current) {
              if (pc.signalingState === 'have-local-offer') {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
                  await drainCandidates(pc, pendingCandidates.current);
                  console.log('[Host] Answer received, connection establishing');
                } catch (err) {
                  console.error('[Host] Error handling answer:', err);
                }
              }
              return;
            }

            // ── ICE CANDIDATE ────────────────────────────────────────────────
            if (sig.type === 'candidate') {
              if (pc.remoteDescription?.type) {
                try { await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)); } catch (_) {}
              } else {
                pendingCandidates.current.push(sig.candidate);
              }
              return;
            }

            // ── VIEWER requests offer from HOST ──────────────────────────────
            if (sig.type === 'request_offer' && isHostRef.current) {
              // Reset PC to stable if needed, then re-offer
              if (pc.signalingState !== 'stable') {
                console.log('[Host] Rebuilding PC for request_offer, state was:', pc.signalingState);
                pc.close();
                pc = createHostPC(ws, localStream);
                pcRef.current = pc;
                pendingCandidates.current = [];
              }
              await sendOffer(pc, ws);
              return;
            }
          }

          // ── Chat ──────────────────────────────────────────────────────────
          if (data.type === 'chat') {
            if (data.id && processedMsgsRef.current.has(data.id)) return;
            if (data.id) processedMsgsRef.current.add(data.id);
            setMessages(prev => [...prev, {
              id: data.id ?? `${Date.now()}-${Math.random()}`,
              username: data.username,
              content: data.content,
            }]);
            return;
          }

          // ── Viewer count ─────────────────────────────────────────────────
          if (data.type === 'viewer_count') {
            setViewerCount(data.count);
            return;
          }

          // ── Hearts ───────────────────────────────────────────────────────
          if (data.type === 'heart') {
            const id = Date.now() + Math.random();
            setHearts(prev => [...prev, { id, x: Math.random() * 60 + 20 }]);
            setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 2000);
          }
        };

        // ── WS Open ─────────────────────────────────────────────────────────
        ws.onopen = () => {
          console.log('[WS] Open, isHost:', isHostRef.current);

          if (isHostRef.current) {
            // Host: send offer after 800ms so WS is fully ready
            setTimeout(() => sendOffer(pc, ws), 800);
          } else {
            // Viewer: request an offer shortly after joining
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'request_offer' }));
                console.log('[Viewer] request_offer sent');
              }
            }, 600);

            // Retry every 5s if still no video
            retryTimer = setInterval(() => {
              if (destroyed) return clearInterval(retryTimer);
              const vid = remoteVideoRef.current;
              const hasVideo = vid?.srcObject && vid.srcObject.getVideoTracks().length > 0;
              if (!hasVideo && ws.readyState === WebSocket.OPEN) {
                console.log('[Viewer] No video yet, retrying request_offer');
                ws.send(JSON.stringify({ type: 'request_offer' }));
              } else if (hasVideo) {
                clearInterval(retryTimer);
              }
            }, 5000);
          }
        };

        ws.onclose = () => console.log('[WS] Closed');
        ws.onerror = (e) => console.error('[WS] Error:', e);

      } catch (err) {
        console.error('[Init] Failed:', err);
        if (!destroyed) navigate('/');
      } finally {
        if (!destroyed) setLoading(false);
      }
    };

    init();

    return () => {
      destroyed = true;
      if (retryTimer) clearInterval(retryTimer);
      wsRef.current?.close();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      wsRef.current = null;
      pcRef.current = null;
      localStreamRef.current = null;
    };
  }, [streamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── User Actions ──────────────────────────────────────────────────────────
  const handleSendHeart = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'heart' }));
    const id = Date.now() + Math.random();
    setHearts(prev => [...prev, { id, x: Math.random() * 60 + 20 }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 2000);
  };

  const handleSendMessage = () => {
    const ws = wsRef.current;
    if (!inputMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'chat', content: inputMessage }));
    setInputMessage('');
  };

  const handleEndStream = async () => {
    if (isHost) await endLiveStream().catch(() => {});
    navigate('/');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white font-black tracking-tighter text-2xl italic animate-pulse z-[100]">
        TRENDTWIST LIVE...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col z-[100] text-white font-sans">
      {/* HEART LAYER */}
      <div className="absolute inset-x-0 bottom-20 z-50 pointer-events-none">
        <AnimatePresence>
          {hearts.map(h => (
            <motion.div
              key={h.id}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -380, opacity: 0, scale: 1.4, x: (Math.random() - 0.5) * 80 }}
              exit={{ opacity: 0 }}
              style={{ left: `${h.x}%`, position: 'absolute' }}
              className="text-pink-500 drop-shadow-xl"
            >
              <IoHeart size={32} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* VIDEO LAYER */}
      <div className="absolute inset-0 z-0 bg-neutral-900">
        {isHost ? (
          <video ref={localVideoRef} autoPlay playsInline muted
            className="w-full h-full object-cover scale-x-[-1]" />
        ) : (
          <video ref={remoteVideoRef} autoPlay playsInline
            className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      {/* UI OVERLAY */}
      <div className="relative z-10 flex-1 flex flex-col p-5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 px-4 py-1 rounded-sm text-[11px] font-black italic tracking-tighter uppercase animate-pulse shadow-lg shadow-red-600/30">
              LIVE
            </div>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10">
              <IoEye size={15} className="text-white/80" />
              <span className="text-sm font-black tracking-tight">{viewerCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mic / Cam toggles — visible only to host */}
            {isHost && (
              <>
                <button
                  onClick={toggleMic}
                  className={`p-2.5 rounded-full border backdrop-blur-xl transition-all ${
                    isMicOn
                      ? 'bg-white/10 border-white/10 hover:bg-white/20'
                      : 'bg-red-600/80 border-red-500'
                  }`}
                  title={isMicOn ? 'Mute mic' : 'Unmute mic'}
                >
                  {isMicOn ? <IoMic size={20} /> : <IoMicOff size={20} />}
                </button>
                <button
                  onClick={toggleCam}
                  className={`p-2.5 rounded-full border backdrop-blur-xl transition-all ${
                    isCamOn
                      ? 'bg-white/10 border-white/10 hover:bg-white/20'
                      : 'bg-red-600/80 border-red-500'
                  }`}
                  title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isCamOn ? <IoVideocam size={20} /> : <IoVideocamOff size={20} />}
                </button>
              </>
            )}

            <button
              onClick={handleEndStream}
              className="p-2.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 hover:bg-red-600/80 transition-all group ml-1"
            >
              <IoClose size={22} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Host info */}
        <div className="mt-4 flex items-center gap-3">
          <Avatar src={streamData?.host_profile_picture} size="md" className="border-2 border-red-500 shadow-xl ring-2 ring-red-500/30" />
          <div className="drop-shadow-lg">
            <p className="font-black text-base tracking-tight leading-none">@{streamData?.host_username}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.18em]">Live Now</p>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="mt-auto flex flex-col" style={{ maxHeight: '45vh' }}>
          <div className="overflow-y-auto space-y-2.5 pb-5 scrollbar-hide pr-2">
            {messages.map(msg => (
              <div key={msg.id} className="flex items-end gap-2 max-w-[85vw] animate-in slide-in-from-bottom-3 fade-in duration-200">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-black uppercase flex-shrink-0">
                  {msg.username?.[0] ?? '?'}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 mb-0.5 tracking-tight ml-1">@{msg.username}</span>
                  <div className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-2xl rounded-bl-sm border border-white/8 shadow-xl">
                    <p className="text-[13px] font-semibold text-white leading-snug">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2.5 pb-1">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send a comment…"
                className="w-full bg-white/8 border border-white/12 rounded-full py-3.5 px-6 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/25 placeholder-white/30 backdrop-blur-2xl transition-all hover:bg-white/12"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-full disabled:opacity-0 transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                <IoSend size={15} />
              </button>
            </div>

            <button
              onClick={handleSendHeart}
              className="p-3.5 bg-pink-600/20 backdrop-blur-2xl rounded-full border border-pink-500/30 hover:bg-pink-600/40 transition-all active:scale-90 shadow-lg shadow-pink-500/20 group flex-shrink-0"
            >
              <IoHeart size={24} className="text-pink-500 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamPage;
