// frontend/src/pages/StrangerTalkPage.jsx
// "Talk with Stranger" — Random video chat + live text chat using WebRTC + Django Channels

import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import config from '../config';

// --- Icons ---
import {
  IoVideocam, IoVideocamOff, IoMicOff, IoMic,
  IoArrowBack, IoStop, IoWarning,
  IoPeople, IoWifi, IoPersonOutline,
  IoSend, IoChatboxOutline, IoClose,
  IoMaleOutline, IoFemaleOutline, IoMaleFemaleOutline
} from 'react-icons/io5';
import { FaRandom, FaUserSecret } from 'react-icons/fa';
import { HiSwitchHorizontal } from 'react-icons/hi';

// STUN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const STATUS = {
  IDLE: 'idle',
  CONNECTING_WS: 'connecting_ws',
  WAITING: 'waiting',
  MATCHED: 'matched',
  CALLING: 'calling',
  ERROR: 'error',
  STOPPED: 'stopped',
};

function buildWsUrl(apiBase) {
  const base = apiBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
  return `${base}/ws/stranger/`;
}

const StrangerTalkPage = () => {
  const navigate = useNavigate();
  const { user, authToken } = useContext(AuthContext);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidates = useRef([]);
  const roleRef = useRef(null);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const handleSwitchRef = useRef(null); // Ref to avoid stale closures in WebRTC callbacks

  // State
  const [status, setStatus] = useState(STATUS.IDLE);
  const [strangerInfo, setStrangerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [connectionTime, setConnectionTime] = useState(0);
  const [switchLoading, setSwitchLoading] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatOpenMobile, setIsChatOpenMobile] = useState(false);
  const [floatingMessages, setFloatingMessages] = useState([]);
  
  // Gender filter state
  const [preferredGender, setPreferredGender] = useState('any');

  // Floating messages helper
  const addFloatingMessage = useCallback((sender, content, isMine) => {
    const id = Date.now() + Math.random();
    setFloatingMessages(prev => [...prev.slice(-4), { id, sender, content, isMine }]);
    setTimeout(() => {
       setFloatingMessages(prev => prev.filter(m => m.id !== id));
    }, 4500); // Overlay duration
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Media helper
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      setError('Camera/microphone access denied.');
      setStatus(STATUS.ERROR);
      return null;
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setConnectionTime(0);
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingIceCandidates.current = [];
    roleRef.current = null;
    setMessages([]); // Clear chat for new stranger
  }, []);

  const createPeerConnection = useCallback((ws) => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }
    pc.onicecandidate = (event) => {
      if (event.candidate && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ice_candidate', candidate: event.candidate }));
      }
    };
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      console.log('WebRTC connectionState:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setStatus(STATUS.MATCHED);
        setConnectionTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setConnectionTime(t => t + 1), 1000);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Use ref to avoid stale closure
        if (handleSwitchRef.current) handleSwitchRef.current();
      }
    };
    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC iceConnectionState:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setStatus(STATUS.MATCHED);
        setConnectionTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setConnectionTime(t => t + 1), 1000);
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        if (handleSwitchRef.current) handleSwitchRef.current();
      }
    };
    pcRef.current = pc;
    return pc;
  }, []);  // No deps needed since we use refs for callbacks

  const makeOffer = useCallback(async (ws) => {
    const pc = createPeerConnection(ws);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
      setStatus(STATUS.CALLING);
    } catch (err) { console.error(err); }
  }, [createPeerConnection]);

  const startSession = useCallback(async () => {
    setError(null);
    setStatus(STATUS.CONNECTING_WS);
    setStrangerInfo(null);
    closePeerConnection();

    if (!localStreamRef.current) await getLocalStream();
    else if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

    const wsUrl = buildWsUrl(config.API_BASE_URL);
    const token = authToken?.access;
    
    if (!token) {
      setError('You must be logged in to use this feature.');
      setStatus(STATUS.ERROR);
      return;
    }

    // Build WebSocket URL with gender preference
    let wsConnUrl = `${wsUrl}?token=${token}`;
    if (preferredGender && preferredGender !== 'any') {
      wsConnUrl += `&preferred_gender=${preferredGender}`;
    }

    const ws = new WebSocket(wsConnUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (_) { return; }

      switch (data.type) {
        case 'waiting':
          setStatus(STATUS.WAITING);
          setStrangerInfo(null);
          setSwitchLoading(false);
          closePeerConnection();
          pendingIceCandidates.current = [];
          break;

        case 'matched':
          setSwitchLoading(false);
          setStrangerInfo(data.stranger);
          roleRef.current = data.role;
          setStatus(STATUS.CALLING);
          pendingIceCandidates.current = []; // Clear for NEW match
          if (data.role === 'offerer') await makeOffer(ws);
          break;

        case 'offer':
          if (roleRef.current === 'answerer') {
            const pc = createPeerConnection(ws);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              for (const c of pendingIceCandidates.current) {
                pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
              }
              pendingIceCandidates.current = [];
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
              setStatus(STATUS.CALLING);
            } catch (err) {
              console.error('Error handling offer:', err);
              handleSwitch();
            }
          }
          break;

        case 'answer':
          if (pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              for (const c of pendingIceCandidates.current) {
                pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
              }
              pendingIceCandidates.current = [];
            } catch (err) {
              console.error('Error handling answer:', err);
              handleSwitch();
            }
          }
          break;

        case 'ice_candidate':
          try {
            if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
              pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
            } else {
              pendingIceCandidates.current.push(data.candidate);
            }
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
          break;

        case 'chat_message':
          setMessages(prev => [
            ...prev, 
            { 
              sender: data.sender || 'Stranger', 
              content: data.content, 
              isMine: false,
              timestamp: new Date().toISOString()
            }
          ]);
          addFloatingMessage(data.sender || 'Stranger', data.content, false);
          break;

        case 'partner_left':
          setStrangerInfo(null);
          closePeerConnection();
          setMessages(prev => [...prev, { system: true, content: 'Partner has left the conversation.' }]);
          break;

        default: break;
      }
    };

    ws.onerror = () => {
      setError('Connection failed.');
      setStatus(STATUS.ERROR);
    };
    ws.onclose = () => { if (pcRef.current) closePeerConnection(); };
  }, [closePeerConnection, createPeerConnection, getLocalStream, makeOffer, preferredGender]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', content: inputMessage }));
    setMessages(prev => [...prev, { sender: 'You', content: inputMessage, isMine: true }]);
    addFloatingMessage('You', inputMessage, true);
    setInputMessage('');
  };

  const handleSwitch = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    setSwitchLoading(true);
    setStrangerInfo(null);
    closePeerConnection();
    wsRef.current.send(JSON.stringify({ type: 'switch' }));
  }, [closePeerConnection]);

  // Keep the ref in sync so WebRTC callbacks always call the latest version
  useEffect(() => {
    handleSwitchRef.current = handleSwitch;
  }, [handleSwitch]);

  const handleStop = useCallback(() => {
    setStatus(STATUS.STOPPED);
    closePeerConnection();
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'stop' })); wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [closePeerConnection]);

  const toggleMic = () => { if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled); setIsMicOn(v => !v); };
  const toggleCam = () => { if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled); setIsCamOn(v => !v); };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current); closePeerConnection();
      if (wsRef.current) wsRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [closePeerConnection]);

  const isConnected = status === STATUS.MATCHED;
  const isCalling = status === STATUS.CALLING;
  const isWaiting = status === STATUS.WAITING;
  const isActive = isConnected || isCalling || isWaiting;

  const formatTime = (secs) => `${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;

  const statusConfig = {
    [STATUS.IDLE]: { label: 'Talk Stranger', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    [STATUS.CONNECTING_WS]: { label: 'Connecting...', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    [STATUS.WAITING]: { label: 'Finding Stranger...', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    [STATUS.CALLING]: { label: 'Linking...', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    [STATUS.MATCHED]: { label: 'Live', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    [STATUS.ERROR]: { label: 'Error', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    [STATUS.STOPPED]: { label: 'Stopped', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  };
  const pill = statusConfig[status] || statusConfig[STATUS.IDLE];

  return (
    <div className="fixed inset-0 overflow-hidden bg-background-primary text-text-primary flex flex-col select-none z-50">
      
      {/* --- HEADER --- */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => { handleStop(); navigate('/'); }} className="p-2 rounded-full hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary">
            <IoArrowBack size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg"><FaUserSecret className="text-white text-xs" /></div>
            <div className="hidden xs:block"><h1 className="font-bold text-xs tracking-wide uppercase">Stranger Talk</h1></div>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-widest ${pill.color}`}>
          {(isWaiting || isCalling) && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
          <span className="truncate max-w-[80px] sm:max-w-[120px]">{pill.label}</span>
          {isConnected && <span className="font-mono ml-1 border-l border-white/20 pl-2">{formatTime(connectionTime)}</span>}
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsChatOpenMobile(!isChatOpenMobile)}
             className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-text-primary relative"
           >
              <IoChatboxOutline size={20} />
              {messages.some(m => !m.isMine && !m.system) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              )}
           </button>
           <button onClick={() => { handleStop(); navigate('/'); }} className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-md border border-red-500/20">
            <IoClose size={16} /> <span className="hidden sm:inline">Exit</span>
           </button>
        </div>
      </header>

      {/* --- CONTENT --- */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 bg-background-primary divide-x divide-border relative">
        
        {/* --- LEFT: Video Panel --- */}
        <div className="flex-1 flex flex-col relative bg-black min-h-0 overflow-hidden">
          {/* Remote Video */}
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
          
          {/* Stats/Overlay when not connected */}
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-secondary/95 backdrop-blur-sm z-10 text-center px-6">
              {isWaiting && (
                <div className="animate-in zoom-in-95 duration-500">
                  <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
                    <IoPeople className="text-5xl text-purple-400" />
                  </div>
                  <h2 className="text-xl font-black mb-1 uppercase italic tracking-tighter">Finding Stranger...</h2>
                  <p className="text-text-secondary text-xs">Waiting for random users to connect</p>
                </div>
              )}
              {isCalling && (
                <div className="animate-in zoom-in-95 duration-500">
                   <IoWifi className="text-5xl text-orange-400 animate-pulse mx-auto mb-5" />
                   <h2 className="text-xl font-black italic tracking-tighter uppercase">Linking...</h2>
                   <p className="text-text-secondary text-xs">@{strangerInfo?.username || 'Stranger'} found</p>
                </div>
              )}
              {status === STATUS.IDLE && (
                <div className="max-w-xs sm:max-w-md animate-in slide-in-from-bottom-4 duration-500">
                   <FaRandom className="text-5xl text-text-secondary/20 mx-auto mb-6" />
                   <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase mb-2">Meet New People</h1>
                   <p className="text-text-secondary text-xs sm:text-sm mb-6 leading-relaxed">Connect anonymously with random TrendTwist users globally.</p>
                   
                   {/* Start Talking Button */}
                   <button onClick={startSession} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white font-black text-base shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Start Talking</button>

                   {/* Gender Filter Section */}
                   <div className="mt-6 w-full">
                     <div className="flex items-center justify-center gap-2 mb-3">
                       <div className="h-px flex-1 bg-white/10" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Filter by Gender</span>
                       <div className="h-px flex-1 bg-white/10" />
                     </div>
                     <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
                       {[
                         { value: 'any', label: 'Anyone', icon: <IoPeople className="text-base" />, gradient: 'from-gray-500 to-gray-600' },
                         { value: 'male', label: 'Male', icon: <IoMaleOutline className="text-base" />, gradient: 'from-blue-500 to-cyan-500' },
                         { value: 'female', label: 'Female', icon: <IoFemaleOutline className="text-base" />, gradient: 'from-pink-500 to-rose-500' },
                         { value: 'other', label: 'Other', icon: <IoMaleFemaleOutline className="text-base" />, gradient: 'from-purple-500 to-violet-500' },
                       ].map((opt) => (
                         <button
                           key={opt.value}
                           onClick={(e) => { e.stopPropagation(); setPreferredGender(opt.value); }}
                           className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border-2 transition-all duration-300
                             ${
                               preferredGender === opt.value
                                 ? `border-transparent bg-gradient-to-br ${opt.gradient} text-white shadow-lg shadow-purple-500/10 scale-105`
                                 : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:bg-white/10'
                             }
                           `}
                         >
                           {opt.icon}
                           <span className="text-[9px] font-bold uppercase tracking-wide">{opt.label}</span>
                         </button>
                       ))}
                     </div>
                     <p className="text-[10px] text-text-secondary/50 text-center mt-2 italic">
                       {preferredGender === 'any' 
                         ? 'You will be matched with anyone randomly'
                         : `You will only be matched with ${preferredGender} users`
                       }
                     </p>
                   </div>
                </div>
              )}
              {status === STATUS.ERROR && <div className="text-red-400 font-bold"><IoWarning size={40} className="mx-auto mb-3"/>{error || 'Connection Failed'}</div>}
            </div>
          )}

          {/* Local Video PiP */}
          <div className="absolute bottom-24 md:bottom-6 right-4 md:right-6 w-24 h-36 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-background-primary z-20 group transition-all">
            <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity ${!isCamOn ? 'opacity-0' : 'opacity-100'}`} />
            {!isCamOn && <div className="absolute inset-0 flex items-center justify-center bg-background-secondary"><IoVideocamOff size={24} className="text-text-secondary/30" /></div>}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-lg text-[8px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity">You</div>
          </div>

          {/* Stranger Name Overlay */}
          {isConnected && strangerInfo && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 animate-in slide-in-from-left-4 duration-500 z-30">
               <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-black text-white text-[10px]">?</div>
               <div><p className="text-[8px] font-black uppercase tracking-widest text-white/70 leading-none mb-0.5">Stranger</p><p className="text-xs font-bold text-purple-400">@{strangerInfo.username}</p></div>
            </div>
          )}

          {/* Floating Message Overlays (Bottom-Left Corner) */}
          <div className="absolute left-6 bottom-24 flex flex-col gap-2 z-40 pointer-events-none max-w-[280px] sm:max-w-[320px]">
            <AnimatePresence>
              {floatingMessages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -40, scale: 0.9, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.8, x: -20, filter: 'blur(12px)' }}
                  className={`
                    px-4 py-3 rounded-[22px] shadow-2xl backdrop-blur-3xl border flex items-start gap-3
                    ${m.isMine 
                      ? 'bg-purple-600/30 border-purple-500/40 text-white shadow-purple-500/10' 
                      : 'bg-black/60 border-white/10 text-white shadow-black/40'
                    }
                  `}
                >
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] 
                    ${m.isMine ? 'bg-purple-500/30' : 'bg-white/10'}`}>
                    {m.isMine ? 'U' : 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-0.5">{m.sender}</p>
                    <p className="text-xs font-semibold leading-snug line-clamp-3">{m.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Video Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3 z-30 bg-black/20 backdrop-scroll rounded-full p-2 border border-white/5">
            <button onClick={toggleMic} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}><IoMic size={18} /></button>
            <button onClick={toggleCam} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}><IoVideocam size={18} /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={handleSwitch} disabled={switchLoading || isWaiting} className="px-5 md:px-6 h-10 md:h-12 rounded-full bg-orange-500 text-white font-black uppercase italic tracking-tighter text-xs md:text-sm flex items-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20">
              {switchLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiSwitchHorizontal size={18} />} Next
            </button>
            <button onClick={handleStop} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-red-500 text-white transition-all flex items-center justify-center"><IoStop size={18} /></button>
          </div>
        </div>

        {/* --- RIGHT: Chat Panel (Toggleable on Mobile) --- */}
        <div className={`
          ${isChatOpenMobile ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          fixed md:static bottom-0 left-0 w-full md:w-[350px] lg:w-[400px] h-[70vh] md:h-full
          flex flex-col bg-background-secondary z-40 transition-transform duration-300 ease-out
          border-t md:border-t-0 border-border shadow-2xl md:shadow-none
        `}>
          {/* Mobile Handle */}
          <div className="md:hidden w-12 h-1 bg-white/20 rounded-full mx-auto my-3" />

          <div className="p-4 border-b border-border flex items-center justify-between bg-background-secondary/50">
            <div className="flex items-center gap-2"><IoChatboxOutline className="text-purple-400" /> <span className="text-xs font-black uppercase tracking-widest">Live Chat</span></div>
             <button onClick={() => setIsChatOpenMobile(false)} className="md:hidden p-1 text-text-secondary"><IoClose size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#0c0c0c]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                <IoChatboxOutline size={32} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-loose">No messages yet</p>
              </div>
            )}
            {messages.map((m, i) => m.system ? (
              <div key={i} className="text-center py-2"><span className="text-[9px] font-black uppercase italic text-orange-400 bg-orange-400/10 px-4 py-1.5 rounded-full border border-orange-500/10">{m.content}</span></div>
            ) : (
              <div key={i} className={`flex flex-col ${m.isMine ? 'items-end' : 'items-start'} max-w-[88%] ${m.isMine ? 'ml-auto' : 'mr-auto'} group`}>
                <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-lg transition-all
                  ${m.isMine ? 'bg-purple-600 text-white rounded-tr-none shadow-purple-900/10' : 'bg-white/15 text-white/95 rounded-tl-none border border-white/10 shadow-black/20'}`}>
                  {m.content}
                </div>
                <div className="mt-1 flex items-center gap-1.5 px-1 opacity-60 group-hover:opacity-100 transition-opacity">
                   <div className={`w-1 h-1 rounded-full ${m.isMine ? 'bg-purple-400' : 'bg-white/40'}`} />
                   <span className="text-[8px] font-black uppercase tracking-tighter text-text-secondary">
                     {m.isMine ? 'You' : `@${strangerInfo?.username || 'Stranger'}`}
                   </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 pb-8 md:pb-4 bg-background-secondary/80 border-t border-border backdrop-blur-md">
            <div className="relative flex items-center">
              <input
                disabled={!isConnected}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isConnected ? "Message..." : "Waiting..."}
                className="w-full bg-white/5 border-none rounded-xl py-3 pl-4 pr-12 text-sm font-medium focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
              <button
                disabled={!isConnected || !inputMessage.trim()}
                onClick={sendMessage}
                className="absolute right-1.5 w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center disabled:opacity-0 transition-all"
              >
                <IoSend size={14} />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default StrangerTalkPage;
