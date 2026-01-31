
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <div className="relative w-full max-w-md md:max-w-4xl h-[80vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

          {/* Main Video Area (Remote) */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {callType === 'video' && remoteStream && callStatus === 'connected' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              // Avatar placeholder for voice call or no video
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <Avatar src={otherUser.profile?.profile_picture} size="2xl" className="w-32 h-32 md:w-48 md:h-48 border-4 border-accent" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">{otherUser.username}</h2>
                <p className="text-gray-400 text-lg">
                  {callStatus === 'calling' ? 'Calling...' :
                    callStatus === 'connecting' ? 'Connecting...' :
                      callStatus === 'incoming' ? 'Incoming Call...' :
                        'Connected'}
                </p>
              </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {callType === 'video' && localStream && (callStatus === 'connected' || callStatus === 'connecting') && (
              <div className="absolute top-4 right-4 w-28 h-40 md:w-48 md:h-64 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg cursor-move z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted // Always mute local video to prevent echo
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div className="h-24 bg-gray-900/90 backdrop-blur border-t border-white/10 flex items-center justify-center gap-6 md:gap-8">

            {callStatus === 'incoming' ? (
              <>
                {/* Reject Button */}
                <button onClick={onReject} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl group-hover:bg-red-600 transition-transform group-hover:scale-110 shadow-lg shadow-red-500/30">
                    <IoClose />
                  </div>
                  <span className="text-xs text-gray-300">Decline</span>
                </button>

                {/* Accept Button */}
                <button onClick={onAccept} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl group-hover:bg-green-600 transition-transform group-hover:scale-110 shadow-lg shadow-green-500/30 animate-bounce">
                    <IoCall />
                  </div>
                  <span className="text-xs text-gray-300">Accept</span>
                </button>
              </>
            ) : (
              <>
                {/* Mute Toggle */}
                <button onClick={onToggleMic} className={`p-4 rounded-full transition-colors ${isMicMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {isMicMuted ? <IoMicOffOutline size={24} /> : <IoMicOutline size={24} />}
                </button>

                {/* End Call Button */}
                <button onClick={onEnd} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-transform hover:scale-110 shadow-lg">
                  <IoCall size={32} className="transform rotate-[135deg]" />
                </button>

                {/* Video Toggle */}
                {callType === 'video' && (
                  <button onClick={onToggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isVideoOff ? <IoVideocamOffOutline size={24} /> : <IoVideocamOutline size={24} />}
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
