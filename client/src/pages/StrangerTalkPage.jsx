// frontend/src/pages/StrangerTalkPage.jsx
// "Talk with Stranger" — Random video chat + live text chat using WebRTC + Django Channels

import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import config from '../config';

// --- Icons ---
import {
  IoVideocam, IoVideocamOff, IoMicOff, IoMic,
  IoArrowBack, IoStop, IoWarning,
  IoPeople, IoWifi, IoPersonOutline,
  IoSend, IoChatboxOutline, IoClose
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
  const { user } = useContext(AuthContext);

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
    if (pcRef.current) pcRef.current.close();
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
      if (pc.connectionState === 'connected') {
        setStatus(STATUS.MATCHED);
        setConnectionTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setConnectionTime(t => t + 1), 1000);
      }
    };
    pcRef.current = pc;
    return pc;
  }, []);

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
    let token = null;
    try {
      const raw = localStorage.getItem('authToken');
      if (raw) token = JSON.parse(raw)?.access;
    } catch (_) {}
    if (!token) token = localStorage.getItem('access_token');

    const ws = new WebSocket(`${wsUrl}?token=${token}`);
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
          break;

        case 'matched':
          setSwitchLoading(false);
          setStrangerInfo(data.stranger);
          roleRef.current = data.role;
          setStatus(STATUS.CALLING);
          if (data.role === 'offerer') await makeOffer(ws);
          break;

        case 'offer':
          if (roleRef.current === 'answerer') {
            const pc = createPeerConnection(ws);
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            for (const c of pendingIceCandidates.current) pc.addIceCandidate(new RTCIceCandidate(c));
            pendingIceCandidates.current = [];
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
            setStatus(STATUS.CALLING);
          }
          break;

        case 'answer':
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            for (const c of pendingIceCandidates.current) pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            pendingIceCandidates.current = [];
          }
          break;

        case 'ice_candidate':
          if (pcRef.current?.remoteDescription) pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          else pendingIceCandidates.current.push(data.candidate);
          break;

        case 'chat_message':
          setMessages(prev => [...prev, { sender: data.sender || 'Stranger', content: data.content, isMine: false }]);
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
  }, [closePeerConnection, createPeerConnection, getLocalStream, makeOffer]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', content: inputMessage }));
    setMessages(prev => [...prev, { sender: 'You', content: inputMessage, isMine: true }]);
    setInputMessage('');
  };

  const handleSwitch = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    setSwitchLoading(true);
    setStrangerInfo(null);
    closePeerConnection();
    wsRef.current.send(JSON.stringify({ type: 'switch' }));
  }, [closePeerConnection]);

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
        <div className="flex items-center gap-4">
          <button onClick={() => { handleStop(); navigate('/'); }} className="p-2 rounded-full hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary">
            <IoArrowBack size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg"><FaUserSecret className="text-white" /></div>
            <div className="hidden sm:block"><h1 className="font-bold text-sm tracking-wide uppercase">Stranger Talk</h1><p className="text-[10px] text-text-secondary opacity-70">Video & Live Chat</p></div>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${pill.color}`}>
          {(isWaiting || isCalling) && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
          <span className="truncate max-w-[120px]">{pill.label}</span>
          {isConnected && <span className="font-mono ml-2 border-l border-white/20 pl-2">{formatTime(connectionTime)}</span>}
        </div>

        <button onClick={() => { handleStop(); navigate('/'); }} className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/5">
          <IoClose size={18} /> <span className="hidden sm:inline">Exit Fullscreen</span>
        </button>
      </header>

      {/* --- CONTENT --- */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 bg-background-primary divide-x divide-border">
        
        {/* --- LEFT: Video Panel --- */}
        <div className="flex-1 flex flex-col relative bg-black min-h-0 overflow-hidden">
          {/* Remote Video */}
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
          
          {/* Stats/Overlay when not connected */}
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-secondary/90 backdrop-blur-sm z-10 text-center px-10">
              {isWaiting && (
                <div className="animate-in zoom-in-95 duration-500">
                  <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
                    <div className="absolute inset-4 rounded-full border-4 border-purple-500/40 animate-ping" style={{ animationDelay: '0.5s'}} />
                    <IoPeople className="text-6xl text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Searching for match...</h2>
                  <p className="text-text-secondary text-sm font-medium">Looking for random users globally</p>
                </div>
              )}
              {isCalling && (
                <div className="animate-in zoom-in-95 duration-500">
                   <IoWifi className="text-6xl text-orange-400 animate-pulse mx-auto mb-6" />
                   <h2 className="text-2xl font-black italic tracking-tighter uppercase">Connecting Peer...</h2>
                   <p className="text-text-secondary text-sm font-medium">@{strangerInfo?.username || 'Stranger'} is ready</p>
                </div>
              )}
              {status === STATUS.IDLE && (
                <div className="max-w-md">
                   <FaRandom className="text-6xl text-text-secondary/20 mx-auto mb-8" />
                   <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Meet New People</h2>
                   <p className="text-text-secondary mb-10 leading-relaxed font-normal">Connect anonymously with random TrendTwist users. Video and text chat in full screen mode.</p>
                   <button onClick={startSession} className="px-10 py-5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white font-black text-lg shadow-2xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Start Talking</button>
                </div>
              )}
              {status === STATUS.ERROR && <div className="text-red-400 font-bold"><IoWarning size={60} className="mx-auto mb-4"/>{error || 'Connection Failed'}</div>}
            </div>
          )}

          {/* Local Video PiP */}
          <div className="absolute bottom-6 right-6 w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-background-primary z-20 group transition-all hover:scale-105">
            <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity ${!isCamOn ? 'opacity-0' : 'opacity-100'}`} />
            {!isCamOn && <div className="absolute inset-0 flex items-center justify-center bg-background-secondary"><IoVideocamOff size={32} className="text-text-secondary/30" /></div>}
            <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-lg text-[10px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity">You</div>
          </div>

          {/* Stranger Name Overlay */}
          {isConnected && strangerInfo && (
            <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 animate-in slide-in-from-left-4 duration-500">
               <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-black text-white">?</div>
               <div><p className="text-xs font-black uppercase tracking-widest text-white/90">Stranger Connected</p><p className="text-sm font-bold text-purple-400">@{strangerInfo.username}</p></div>
            </div>
          )}
          
          {/* Video Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
            <button onClick={toggleMic} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}><IoMic size={20} /></button>
            <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}><IoVideocam size={20} /></button>
            <div className="w-px h-8 bg-white/10 mx-1" />
            <button onClick={handleSwitch} disabled={switchLoading || isWaiting} className="px-6 h-12 rounded-full bg-orange-500 text-white font-black uppercase italic tracking-tighter text-sm flex items-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-all">
              {switchLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiSwitchHorizontal size={20} />} Next
            </button>
            <button onClick={handleStop} className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500 text-white transition-all flex items-center justify-center"><IoStop size={22} /></button>
          </div>
        </div>

        {/* --- RIGHT: Chat Panel --- */}
        <div className="md:w-[400px] flex flex-col bg-background-secondary min-h-0">
          <div className="p-4 border-b border-border flex items-center justify-between bg-background-secondary/50">
            <div className="flex items-center gap-2"><IoChatboxOutline className="text-purple-400" /> <span className="text-xs font-black uppercase tracking-widest">Live Chat</span></div>
             <span className="text-[10px] font-bold text-text-secondary opacity-50">E2E ENCRYPTED*</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#0c0c0c]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
                <IoChatboxOutline size={48} className="mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest leading-loose">Messages will appear here once you're matched</p>
              </div>
            )}
            {messages.map((m, i) => m.system ? (
              <div key={i} className="text-center py-2"><span className="text-[10px] font-black uppercase italic text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full">{m.content}</span></div>
            ) : (
              <div key={i} className={`flex flex-col ${m.isMine ? 'items-end' : 'items-start'} max-w-[85%] ${m.isMine ? 'ml-auto' : 'mr-auto'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${m.isMine ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/5 text-text-primary rounded-tl-none border border-white/5'}`}>
                  {m.content}
                </div>
                <div className="mt-1 flex items-center gap-1.5 px-1"><span className="text-[9px] font-black uppercase tracking-tighter text-text-secondary">{m.isMine ? 'You' : `@${strangerInfo?.username || 'Stranger'}`}</span></div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-background-secondary/80 border-t border-border backdrop-blur-md">
            <div className="relative flex items-center">
              <input
                disabled={!isConnected}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isConnected ? "Type a message..." : "Waiting for match..."}
                className="w-full bg-white/5 border-none rounded-2xl py-4 pl-5 pr-14 text-sm font-medium focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-text-secondary/40"
              />
              <button
                disabled={!isConnected || !inputMessage.trim()}
                onClick={sendMessage}
                className="absolute right-2 w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-0 disabled:scale-90 transition-all shadow-lg shadow-purple-600/20"
              >
                <IoSend size={18} />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default StrangerTalkPage;
