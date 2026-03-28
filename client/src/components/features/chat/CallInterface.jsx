import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMicOutline, IoMicOffOutline,
  IoVideocamOutline, IoVideocamOffOutline,
  IoCall, IoClose,
} from 'react-icons/io5';
import Avatar from '../../common/Avatar';

const CallInterface = ({
  callStatus,
  callType,
  otherUser,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  isMicMuted,
  isVideoOff,
  onToggleMic,
  onToggleVideo,
  callDuration = 0,
  formatDuration,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  // Attach remote stream — re-run on callStatus change to handle timing edge cases
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
      if (remoteStream) {
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, callStatus]);

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  const isConnected = callStatus === 'connected';
  const isIncoming = callStatus === 'incoming';
  const showVideoStreams = callType === 'video' && isConnected && remoteStream;

  const statusText = {
    calling: 'Calling…',
    connecting: 'Connecting…',
    incoming: `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
    connected: callType === 'voice' ? `Connected · ${formatDuration ? formatDuration(callDuration) : '00:00'}` : null,
  }[callStatus] ?? '';

  return (
    <AnimatePresence>
      <motion.div
        key="call-interface"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-gray-950 text-white select-none"
      >
        {/* ── Remote Video (full screen) ── */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">

          {/* Remote video stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${showVideoStreams ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Avatar / status overlay — shown for voice calls OR while connecting */}
          {(!showVideoStreams) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-4">
              {/* Ripple ring — only while NOT yet connected */}
              {!isConnected && (
                <div className="absolute w-52 h-52 md:w-72 md:h-72 rounded-full bg-accent/10 animate-ping" />
              )}
              <div className="relative">
                <Avatar
                  src={otherUser?.profile?.profile_picture}
                  size="2xl"
                  className="w-28 h-28 md:w-44 md:h-44 border-4 border-white/20 shadow-2xl relative z-10"
                />
                {/* Green pulse ring when connected */}
                {isConnected && (
                  <div className="absolute inset-0 rounded-full border-4 border-green-400/60 animate-pulse" />
                )}
              </div>

              <div className="text-center z-10">
                <h2 className="text-3xl md:text-5xl font-bold drop-shadow-lg">
                  {otherUser?.username}
                </h2>
                <p className={`mt-2 text-lg md:text-xl font-medium tracking-wide ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                  {statusText}
                </p>
                {/* Duration shown below when voice call connected */}
                {isConnected && callType === 'voice' && (
                  <p className="mt-1 text-4xl font-mono font-bold text-white tabular-nums">
                    {formatDuration ? formatDuration(callDuration) : '00:00'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Duration overlay on top of video when in a video call */}
          {showVideoStreams && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 bg-black/50 backdrop-blur-md rounded-full px-4 py-1 text-sm font-mono font-semibold tabular-nums">
              {formatDuration ? formatDuration(callDuration) : '00:00'}
            </div>
          )}

          {/* Local PiP video */}
          {callType === 'video' && localStream && (
            <div className="absolute top-4 right-4 w-28 h-40 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-gray-900">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 backdrop-blur-sm">
                  <IoVideocamOffOutline className="text-white/50 text-3xl" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Controls Footer ── */}
        <div className="absolute bottom-0 left-0 right-0 py-10 px-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center z-30">
          <div className="flex items-center gap-8 md:gap-12">
            {isIncoming ? (
              /* Incoming call — Decline / Accept */
              <>
                <button
                  onClick={onReject}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="Decline call"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-3xl group-hover:bg-red-600 transition-transform group-hover:scale-110 shadow-lg shadow-red-500/30">
                    <IoClose />
                  </div>
                  <span className="text-sm font-medium text-white/80">Decline</span>
                </button>
                <button
                  onClick={onAccept}
                  className="flex flex-col items-center gap-2 group"
                  aria-label="Accept call"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-3xl group-hover:bg-green-600 transition-transform group-hover:scale-110 shadow-lg shadow-green-500/30 animate-pulse">
                    <IoCall />
                  </div>
                  <span className="text-sm font-medium text-white/80">Accept</span>
                </button>
              </>
            ) : (
              /* In-call controls */
              <>
                {/* Mic Toggle */}
                <button
                  onClick={onToggleMic}
                  aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`p-4 md:p-5 rounded-full backdrop-blur-md transition-all hover:scale-110 ${isMicMuted ? 'bg-white text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'}`}
                >
                  {isMicMuted ? <IoMicOffOutline size={28} /> : <IoMicOutline size={28} />}
                </button>

                {/* End Call */}
                <button
                  onClick={onEnd}
                  aria-label="End call"
                  className="p-5 md:p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition-transform hover:scale-110 shadow-xl shadow-red-600/30"
                >
                  <IoCall size={36} className="transform rotate-[135deg]" />
                </button>

                {/* Camera Toggle (video calls only) */}
                {callType === 'video' && (
                  <button
                    onClick={onToggleVideo}
                    aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                    className={`p-4 md:p-5 rounded-full backdrop-blur-md transition-all hover:scale-110 ${isVideoOff ? 'bg-white text-gray-900' : 'bg-white/15 text-white hover:bg-white/25'}`}
                  >
                    {isVideoOff ? <IoVideocamOffOutline size={28} /> : <IoVideocamOutline size={28} />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallInterface;
