import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart';
import '../providers/chat_provider.dart';
import '../models/user_model.dart';

enum CallStatus { idle, calling, incoming, connecting, connected, ended }

class CallProvider with ChangeNotifier {
  CallStatus _status = CallStatus.idle;
  String _type = 'video';
  User? _otherUser;
  dynamic _incomingSdp;
  
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  
  bool _isMicMuted = false;
  bool _isVideoOff = false;
  
  int _duration = 0;
  Timer? _timer;

  CallStatus get status => _status;
  String get type => _type;
  User? get otherUser => _otherUser;
  dynamic get incomingSdp => _incomingSdp;
  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  bool get isMicMuted => _isMicMuted;
  bool get isVideoOff => _isVideoOff;
  int get duration => _duration;

  final Map<String, dynamic> _iceServers = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
    ]
  };

  // --- External Trigger (Incoming Call) ---
  void handleIncomingCall(User caller, String type, dynamic sdp) {
    if (_status != CallStatus.idle) return;
    _otherUser = caller;
    _type = type;
    _incomingSdp = sdp;
    _status = CallStatus.incoming;
    notifyListeners();
  }

  // --- Actions ---
  Future<void> startCall(User user, String type, ChatProvider chatProvider) async {
    if (_status != CallStatus.idle) return;
    
    _otherUser = user;
    _type = type;
    _status = CallStatus.calling;
    notifyListeners();

    try {
      // Request Permissions
      await [Permission.camera, Permission.microphone].request();
      
      final Map<String, dynamic> constraints = {
        'audio': true,
        'video': type == 'video' ? {
          'facingMode': 'user',
          'width': 1280,
          'height': 720,
        } : false,
      };

      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      _peerConnection = await createPeerConnection(_iceServers);
      
      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      _peerConnection!.onIceCandidate = (candidate) {
        chatProvider.sendCallSignal({
          'type': 'new_ice_candidate',
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          }
        });
      };

      _peerConnection!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
          _remoteStream = event.streams[0];
          notifyListeners();
        }
      };

      _peerConnection!.onConnectionState = (state) {
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          _status = CallStatus.connected;
          _startTimer();
          notifyListeners();
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed || 
                   state == RTCPeerConnectionState.RTCPeerConnectionStateClosed) {
          endCall(chatProvider);
        }
      };

      RTCSessionDescription offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);

      chatProvider.sendCallSignal({
        'type': 'call_offer',
        'sdp': offer.toMap(),
        'callType': type,
      });

    } catch (e) {
      print('Start call error: $e');
      endCall(chatProvider);
    }
  }

  Future<void> acceptCall(ChatProvider chatProvider, dynamic incomingSdp) async {
    if (_status != CallStatus.incoming) return;
    
    _status = CallStatus.connecting;
    notifyListeners();

    try {
      // Request Permissions
      await [Permission.camera, Permission.microphone].request();

      final Map<String, dynamic> constraints = {
        'audio': true,
        'video': _type == 'video' ? true : false,
      };

      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      _peerConnection = await createPeerConnection(_iceServers);
      
      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      _peerConnection!.onIceCandidate = (candidate) {
        chatProvider.sendCallSignal({
          'type': 'new_ice_candidate',
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          }
        });
      };

      _peerConnection!.onTrack = (event) {
        if (event.streams.isNotEmpty) {
          _remoteStream = event.streams[0];
          notifyListeners();
        }
      };

      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(incomingSdp['sdp'], incomingSdp['type'])
      );

      RTCSessionDescription answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      chatProvider.sendCallSignal({
        'type': 'call_answer',
        'sdp': answer.toMap(),
      });

    } catch (e) {
      print('Accept call error: $e');
      endCall(chatProvider);
    }
  }

  Future<void> handleSignal(dynamic data) async {
    final type = data['type'];
    
    if (type == 'call_answer') {
      if (_peerConnection != null) {
        await _peerConnection!.setRemoteDescription(
          RTCSessionDescription(data['sdp']['sdp'], data['sdp']['type'])
        );
      }
    } else if (type == 'new_ice_candidate') {
      if (_peerConnection != null) {
        final candidateData = data['candidate'];
        await _peerConnection!.addCandidate(
          RTCIceCandidate(
            candidateData['candidate'],
            candidateData['sdpMid'],
            candidateData['sdpMLineIndex'],
          )
        );
      }
    } else if (type == 'call_ended') {
      _cleanup();
    }
  }

  void endCall(ChatProvider chatProvider) {
    chatProvider.sendCallSignal({
      'type': 'call_ended',
      'duration': _duration,
    });
    _cleanup();
  }

  void _cleanup() {
    _timer?.cancel();
    _localStream?.getTracks().forEach((t) => t.stop());
    _localStream?.dispose();
    _remoteStream?.dispose();
    _peerConnection?.dispose();
    
    _peerConnection = null;
    _localStream = null;
    _remoteStream = null;
    _status = CallStatus.idle;
    _duration = 0;
    _otherUser = null;
    _isMicMuted = false;
    _isVideoOff = false;
    
    notifyListeners();
  }

  void _startTimer() {
    _timer?.cancel();
    _duration = 0;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _duration++;
      notifyListeners();
    });
  }

  void toggleMic() {
    if (_localStream != null) {
      _isMicMuted = !_isMicMuted;
      _localStream!.getAudioTracks().forEach((t) => t.enabled = !_isMicMuted);
      notifyListeners();
    }
  }

  void toggleVideo() {
    if (_localStream != null && _type == 'video') {
      _isVideoOff = !_isVideoOff;
      _localStream!.getVideoTracks().forEach((t) => t.enabled = !_isVideoOff);
      notifyListeners();
    }
  }
}
