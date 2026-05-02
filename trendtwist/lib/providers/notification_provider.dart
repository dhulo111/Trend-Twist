import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/constants.dart';
import '../providers/call_provider.dart';
import '../services/notification_service.dart';

class NotificationProvider with ChangeNotifier {
  WebSocketChannel? _channel;
  bool _isConnected = false;
  Timer? _reconnectTimer;
  String? _lastToken;
  CallProvider? _lastCallProvider;

  bool get isConnected => _isConnected;

  // Called by ChangeNotifierProxyProvider2 when auth or call state changes
  void connect(String token, CallProvider callProvider) {
    _lastToken = token;
    _lastCallProvider = callProvider;

    // Already connected — no-op
    if (_channel != null && _isConnected) return;

    _openSocket(token, callProvider);
  }

  void _openSocket(String token, CallProvider callProvider) {
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;

    final wsUri = Uri.parse('${AppConfig.wsUrl}/notifications/?token=$token');
    try {
      _channel = IOWebSocketChannel.connect(
        wsUri,
        pingInterval: const Duration(seconds: 20),
      );
      _isConnected = true;
      debugPrint('[NotificationWS] Connecting to $wsUri');

      _channel!.stream.listen(
        (raw) => _handleMessage(raw, callProvider),
        onError: (err) {
          debugPrint('[NotificationWS] Error: $err');
          _handleDisconnect();
        },
        onDone: () {
          debugPrint('[NotificationWS] Closed');
          _handleDisconnect();
        },
      );
    } catch (e) {
      debugPrint('[NotificationWS] Connection failed: $e');
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic raw, CallProvider callProvider) {
    Map<String, dynamic> decoded;
    try {
      decoded = jsonDecode(raw as String) as Map<String, dynamic>;
    } catch (e) {
      return;
    }

    final type = decoded['type'] as String?;
    debugPrint('[NotificationWS] Received type: $type');

    switch (type) {
      // ── Call signal from ChatConsumer._global_alert_push ─────────────────
      case 'call_signal':
        NotificationService.handleCallSignal(decoded);
        break;

      // ── New chat message alert from SendMessageView ───────────────────────
      case 'chat_alert':
        final data = decoded['data'];
        if (data is Map<String, dynamic>) {
          NotificationService.handleChatAlert(data);
        }
        break;

      // ── Generic notification from signals.py ─────────────────────────────
      case 'notification_message':
        // Social notifications (likes, follows etc.) — no action needed here
        break;

      case 'ping':
        // Keep-alive ping from server — ignore
        break;

      default:
        debugPrint('[NotificationWS] Unknown type: $type – $decoded');
    }
  }

  void _handleDisconnect() {
    _isConnected = false;
    _channel = null;
    notifyListeners();
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      if (_lastToken != null && _lastCallProvider != null) {
        debugPrint('[NotificationWS] Reconnecting…');
        _openSocket(_lastToken!, _lastCallProvider!);
      }
    });
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _lastToken = null;
    _lastCallProvider = null;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
