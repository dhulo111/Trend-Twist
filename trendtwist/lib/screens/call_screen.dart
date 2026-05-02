import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:provider/provider.dart';
import '../providers/call_provider.dart';
import '../providers/chat_provider.dart';
import '../widgets/user_avatar.dart';

class CallScreen extends StatefulWidget {
  const CallScreen({super.key});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initRenderers();
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();
    if (mounted) {
      setState(() {
        _isInitialized = true;
      });
    }
  }

  @override
  void dispose() {
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final callProvider = Provider.of<CallProvider>(context);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    if (callProvider.status == CallStatus.idle || !_isInitialized) {
      return const SizedBox.shrink();
    }

    _localRenderer.srcObject = callProvider.localStream;
    _remoteRenderer.srcObject = callProvider.remoteStream;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Remote Video
          if (callProvider.type == 'video' && callProvider.remoteStream != null)
            RTCVideoView(
              _remoteRenderer,
              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
            )
          else
            _buildAudioCallUI(callProvider),

          // Local Video (PiP)
          if (callProvider.type == 'video' && callProvider.localStream != null)
            Positioned(
              top: 50,
              right: 20,
              child: Container(
                width: 120,
                height: 180,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white24),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: RTCVideoView(
                    _localRenderer,
                    mirror: true,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  ),
                ),
              ),
            ),

          // Controls
          _buildControls(context, callProvider, chatProvider),

          // Overlay for incoming call
          if (callProvider.status == CallStatus.incoming)
            _buildIncomingCallOverlay(context, callProvider, chatProvider),
        ],
      ),
    );
  }

  Widget _buildAudioCallUI(CallProvider call) {
    return Container(
      width: double.infinity,
      color: Colors.black87,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          UserAvatar(
            radius: 80,
            imageUrl: call.otherUser?.profilePicture ?? '',
          ),
          const SizedBox(height: 30),
          Text(
            call.otherUser?.username ?? 'Unknown',
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Text(
            _getStatusText(call.status),
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 18),
          ),
          if (call.status == CallStatus.connected) ...[
            const SizedBox(height: 20),
            Text(
              _formatDuration(call.duration),
              style: const TextStyle(color: Colors.white, fontSize: 24, fontFamily: 'monospace'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildControls(BuildContext context, CallProvider call, ChatProvider chat) {
    if (call.status == CallStatus.incoming) return const SizedBox.shrink();

    return Positioned(
      bottom: 50,
      left: 0,
      right: 0,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildControlButton(
            onPressed: () => call.toggleMic(),
            icon: call.isMicMuted ? Icons.mic_off : Icons.mic,
            color: call.isMicMuted ? Colors.white : Colors.white24,
            iconColor: call.isMicMuted ? Colors.black : Colors.white,
          ),
          _buildControlButton(
            onPressed: () => call.endCall(chat),
            icon: Icons.call_end,
            color: Colors.red,
            iconColor: Colors.white,
            size: 70,
          ),
          if (call.type == 'video')
            _buildControlButton(
              onPressed: () => call.toggleVideo(),
              icon: call.isVideoOff ? Icons.videocam_off : Icons.videocam,
              color: call.isVideoOff ? Colors.white : Colors.white24,
              iconColor: call.isVideoOff ? Colors.black : Colors.white,
            ),
        ],
      ),
    );
  }

  Widget _buildIncomingCallOverlay(BuildContext context, CallProvider call, ChatProvider chat) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: Colors.black.withOpacity(0.95),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          UserAvatar(
            radius: 70,
            imageUrl: call.otherUser?.profilePicture ?? '',
          ),
          const SizedBox(height: 30),
          Text(
            call.otherUser?.username ?? 'Unknown',
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Text(
            'Incoming ${call.type} call...',
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 18),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(bottom: 100),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildControlButton(
                  onPressed: () => call.endCall(chat),
                  icon: Icons.call_end,
                  color: Colors.red,
                  iconColor: Colors.white,
                  size: 75,
                ),
                _buildControlButton(
                  onPressed: () => call.acceptCall(chat, call.incomingSdp),
                  icon: Icons.call,
                  color: Colors.green,
                  iconColor: Colors.white,
                  size: 75,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required VoidCallback onPressed,
    required IconData icon,
    required Color color,
    required Color iconColor,
    double size = 60,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: size * 0.5),
      ),
    );
  }

  String _getStatusText(CallStatus status) {
    switch (status) {
      case CallStatus.calling: return 'Calling...';
      case CallStatus.connecting: return 'Connecting...';
      case CallStatus.connected: return 'Connected';
      case CallStatus.incoming: return 'Incoming call...';
      default: return '';
    }
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}
