
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoMicOutline, IoMicOffOutline, IoVideocamOutline, IoVideocamOffOutline, IoCall, IoClose } from 'react-icons/io5';
import Avatar from '../../common/Avatar';

const CallInterface = ({
  callStatus, // 'calling', 'incoming', 'connected'
  callType,   // 'voice', 'video'
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
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach streams to video elements
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  if (callStatus === 'idle' || callStatus === 'ended') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-gray-900"
      >
        {/* --- Main Video Area (Remote) --- */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">

          {/* Remote Video Stream - Full Screen */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${callType === 'voice' || callStatus !== 'connected' || !remoteStream ? 'opacity-0 absolute inset-0' : 'opacity-100'}`}
          />

          {/* Avatar / Status Placeholder (Voice Call or Connecting) */}
          {(callType === 'voice' || callStatus !== 'connected' || !remoteStream) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 animate-pulse p-4">
              <div className="relative">
                <div className="absolute -inset-4 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
                <Avatar src={otherUser.profile?.profile_picture} size="2xl" className="w-32 h-32 md:w-48 md:h-48 border-4 border-accent relative z-10" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">{otherUser.username}</h2>
                <p className="text-gray-400 text-xl font-medium tracking-wide">
                  {callStatus === 'calling' ? 'Calling...' :
                    callStatus === 'connecting' ? 'Connecting...' :
                      callStatus === 'incoming' ? 'Incoming Call...' :
                        callStatus === 'connected' ? 'Connected' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) - Mirrored */}
          {callType === 'video' && localStream && (callStatus === 'connected' || callStatus === 'connecting') && (
            <div className="absolute top-4 right-4 w-32 h-44 md:w-56 md:h-72 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {/* Camera Off Indicator for Local User */}
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <IoVideocamOffOutline className="text-white/50 text-2xl" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Controls Footer (Transparent Overlay) --- */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center z-30">
          <div className="flex items-center gap-6 md:gap-10">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={onReject} className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 rounded-full bg-red-500/90 backdrop-blur-sm flex items-center justify-center text-white text-3xl group-hover:bg-red-600 transition-transform group-hover:scale-110 shadow-lg shadow-red-500/30">
                    <IoClose />
                  </div>
                  <span className="text-sm font-medium text-white/80">Decline</span>
                </button>
                <button onClick={onAccept} className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center justify-center text-white text-3xl group-hover:bg-green-600 transition-transform group-hover:scale-110 shadow-lg shadow-green-500/30 animate-pulse">
                    <IoCall />
                  </div>
                  <span className="text-sm font-medium text-white/80">Accept</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={onToggleMic} className={`p-4 md:p-5 rounded-full backdrop-blur-md transition-all ${isMicMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {isMicMuted ? <IoMicOffOutline size={28} /> : <IoMicOutline size={28} />}
                </button>

                <button onClick={onEnd} className="p-5 md:p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition-transform hover:scale-110 shadow-xl shadow-red-600/20 mx-2">
                  <IoCall size={36} className="transform rotate-[135deg]" />
                </button>

                {callType === 'video' && (
                  <button onClick={onToggleVideo} className={`p-4 md:p-5 rounded-full backdrop-blur-md transition-all ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
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
