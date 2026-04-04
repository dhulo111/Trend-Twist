import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { startLiveStream, endLiveStream, joinLiveStream } from '../api/storyApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IoClose, IoSend, IoVideocam, IoVideocamOff, 
  IoMic, IoMicOff, IoPeople, IoEye, IoHeart 
} from 'react-icons/io5';
import Avatar from '../components/common/Avatar';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
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
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [loading, setLoading] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const processedMsgsRef = useRef(new Set());

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- WebSocket Setup ---
  const connectWebSocket = useCallback((id) => {
    let wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/live/${id}/?token=${authToken.access}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'signal') {
        handleSignalingData(data.data);
      } else if (data.type === 'chat') {
        if (!data.id || processedMsgsRef.current.has(data.id)) return;
        processedMsgsRef.current.add(data.id);

        setMessages(prev => [...prev, { 
          id: data.id,
          username: data.username, 
          content: data.content,
          isMine: data.username === user.username 
        }]);
      } else if (data.type === 'viewer_count') {
        setViewerCount(data.count);
      }
    };

    ws.onopen = async () => {
      console.log("Live WebSocket Connected");
      if (streamId === 'new') {
        await setupBroadcaster();
      } else {
        setupViewer();
      }
    };

    ws.onclose = () => {
      console.log("Live WebSocket closed");
    };
  }, [authToken, user?.username, streamId]);

  const handleSignalingData = async (data) => {
    if (!pcRef.current) return;
    
    if (data.type === 'offer') {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      wsRef.current.send(JSON.stringify({ type: 'answer', sdp: answer }));
    } else if (data.type === 'answer') {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === 'candidate') {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    }
  };

  // --- WebRTC Setup ---
  const setupBroadcaster = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
      };

      // Periodic offer to ensure joiners see video - but only if stable
      const sendOffer = async () => {
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current.send(JSON.stringify({ type: 'offer', sdp: offer }));
        }
      };
      
      setTimeout(sendOffer, 1000); // Initial offer
      const offerInterval = setInterval(sendOffer, 10000); // Keep-alive offer

      pcRef.current = pc;
      return () => clearInterval(offerInterval);
    } catch (err) {
      console.error("Broadcaster setup failed", err);
    }
  };

  const setupViewer = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(e => {});
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // --- Initializing ---
  useEffect(() => {
    const init = async () => {
      try {
        if (streamId === 'new') {
          setIsHost(true);
          const newStream = await startLiveStream({ title: `${user.username}'s Live` });
          setStreamData(newStream);
          connectWebSocket(newStream.stream_id);
        } else {
          setIsHost(false);
          const joinedStream = await joinLiveStream(streamId);
          setStreamData(joinedStream);
          connectWebSocket(streamId);
        }
      } catch (err) {
        console.error("Init failed", err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [streamId]);

  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    if (!wsRef.current) return;
    const originalOnMessage = wsRef.current.onmessage;
    wsRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'heart') {
        const id = Date.now() + Math.random();
        setHearts(prev => [...prev, { id, x: Math.random() * 60 + 20 }]);
        setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 2000);
      } else {
        originalOnMessage(event);
      }
    };
  }, [loading]);

  const handleSendHeart = () => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'heart' }));
    // Local animation
    const id = Date.now() + Math.random();
    setHearts(prev => [...prev, { id, x: Math.random() * 60 + 20 }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 2000);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', content: inputMessage }));
    // We REMOVED local setMessages call here. 
    // Messages will now only be added when received back from the WebSocket.
    // This prevents the "3 times" or duplicate message issue.
    setInputMessage('');
  };

  const handleEndStream = async () => {
    if (isHost) {
      await endLiveStream();
      navigate('/');
    } else {
      navigate('/');
    }
  };

  if (loading) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white font-black tracking-tighter text-2xl italic animate-pulse">TRENDTWIST LIVE...</div>;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col z-[100] text-white font-sans">
      {/* HEART ANIMATION LAYER */}
      <div className="absolute inset-x-0 bottom-20 z-50 pointer-events-none">
        <AnimatePresence>
          {hearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -400, opacity: 0, scale: 1.5, x: (Math.random() - 0.5) * 100 }}
              exit={{ opacity: 0 }}
              style={{ left: `${heart.x}%`, position: 'absolute' }}
              className="text-pink-500 shadow-pink-500/50 drop-shadow-xl"
            >
              <IoHeart size={32} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- VIDEO LAYER --- */}
      <div className="absolute inset-0 z-0 bg-neutral-900">
        {isHost ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
        ) : (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
      </div>

      {/* --- UI OVERLAY --- */}
      <div className="relative z-10 flex-1 flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 px-3 py-1 rounded-sm text-[11px] font-black italic tracking-tighter uppercase animate-pulse shadow-lg shadow-red-600/20 px-4">LIVE</div>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-1 rounded-full border border-white/10">
              <IoEye size={16} className="text-white/80" />
              <span className="text-sm font-black tracking-tight">{viewerCount}</span>
            </div>
          </div>
          <button 
            onClick={handleEndStream}
            className="p-2.5 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition-all border border-white/10 group"
          >
            <IoClose size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Host Info */}
        <div className="mt-6 flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
          <Avatar src={streamData?.host_profile_picture} size="lg" className="border-2 border-red-500 shadow-xl" />
          <div className="drop-shadow-lg">
            <p className="font-black text-lg tracking-tight leading-none">@{streamData?.host_username}</p>
            <div className="flex items-center gap-2 mt-1">
               <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
               <p className="text-[10px] text-white/80 font-bold uppercase tracking-[0.2em]">Live Now</p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="mt-auto flex flex-col max-h-[45vh] w-full max-w-[400px]">
          <div className="overflow-y-auto space-y-3 pb-6 scrollbar-hide pr-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <Avatar src={null} size="xs" fallback={msg.username[0]} className="mt-1 bg-white/10 font-bold" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/50 mb-0.5 tracking-tight">@{msg.username}</span>
                  <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl rounded-tl-none border border-white/5 shadow-2xl">
                    <p className="text-[13px] font-bold text-white shadow-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-3 pb-2">
            <div className="flex-1 relative group">
              <input 
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send a comment..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 px-7 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-white/30 backdrop-blur-2xl transition-all group-hover:bg-white/10"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white text-black rounded-full disabled:opacity-0 transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                <IoSend size={16} />
              </button>
            </div>
            
            <button 
              onClick={handleSendHeart}
              className="p-4 bg-pink-600/20 backdrop-blur-2xl rounded-full border border-pink-500/30 hover:bg-pink-600/40 transition-all active:scale-90 shadow-lg shadow-pink-500/20 group"
            >
              <IoHeart size={26} className="text-pink-500 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamPage;
