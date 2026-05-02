import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';
import '../providers/call_provider.dart';
import '../providers/chat_provider.dart';
import '../services/provider_service.dart';
import '../services/api_service.dart';
import '../models/user_model.dart';
import '../utils/parsers.dart';
import '../screens/chat_detail_screen.dart';

import 'package:firebase_core/firebase_core.dart';

// ─────────────────────────────────────────────────────────────────────────────
// TOP-LEVEL: Background message handler (must be outside any class)
// ─────────────────────────────────────────────────────────────────────────────
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background isolate — must re-initialize Firebase before anything else
  await Firebase.initializeApp();

  // Initialize local notifications plugin (separate isolate has no shared state)
  const initSettings = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
  );
  await NotificationService.localNotifications.initialize(settings: initSettings);

  // Create channels in case they don't exist yet
  final plugin = NotificationService.localNotifications
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
  if (plugin != null) {
    await plugin.createNotificationChannel(NotificationService.messageChannel);
    await plugin.createNotificationChannel(NotificationService.callChannel);
  }

  await NotificationService.showLocalFromFcm(message);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────
class NotificationService {
  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin localNotifications =
      FlutterLocalNotificationsPlugin();

  // ── Channels ──────────────────────────────────────────────────────────────
  static const AndroidNotificationChannel messageChannel =
      AndroidNotificationChannel(
    'messages_channel',
    'Messages',
    description: 'New message notifications',
    importance: Importance.high,
  );

  static const AndroidNotificationChannel callChannel =
      AndroidNotificationChannel(
    'calls_channel',
    'Calls',
    description: 'Incoming call notifications',
    importance: Importance.max,
  );

  // ── Initialization ────────────────────────────────────────────────────────
  static Future<void> initialize() async {
    // 1. Request permissions
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    debugPrint('[FCM] Permission: ${settings.authorizationStatus}');

    // 2. Configure local notifications
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: _onLocalNotificationTap,
    );

    // 3. Create Android channels
    final androidPlugin = localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(messageChannel);
      await androidPlugin.createNotificationChannel(callChannel);
    }

    // 4. Foreground: show local notification
    FirebaseMessaging.onMessage.listen((msg) {
      debugPrint('[FCM] Foreground: ${msg.data}');
      showLocalFromFcm(msg);
    });

    // 5. Background→foreground: notification was tapped while app was in bg
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      debugPrint('[FCM] Opened from bg: ${msg.data}');
      _routeFromData(msg.data);
    });

    // 6. Terminated state: app was killed, user tapped notification
    _fcm.getInitialMessage().then((msg) {
      if (msg != null) {
        debugPrint('[FCM] Opened from killed: ${msg.data}');
        _routeFromData(msg.data);
      }
    });

    // 7. Token refresh listener
    _fcm.onTokenRefresh.listen((token) {
      debugPrint('[FCM] Token refreshed');
      _registerTokenWithServer(token);
    });
  }

  // ── Token Registration ────────────────────────────────────────────────────
  /// Call this once the user has successfully logged in (token is in headers).
  static Future<void> registerTokenAfterLogin() async {
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        await _registerTokenWithServer(token);
      }
    } catch (e) {
      debugPrint('[FCM] Token fetch error: $e');
    }
  }

  static Future<void> _registerTokenWithServer(String token) async {
    try {
      final api = ApiService();
      await api.dio.post('/auth/register-fcm/', data: {'registration_id': token});
      debugPrint('[FCM] Token registered: ${token.substring(0, 20)}...');
    } catch (e) {
      debugPrint('[FCM] Token registration failed: $e');
    }
  }

  // ── Called from WebSocket (foreground/background when app is alive) ────────
  /// Handles a chat_alert coming from the global notification WebSocket.
  static void handleChatAlert(Map<String, dynamic> data) {
    debugPrint('[WS] chat_alert received: $data');
    _showMessageNotification(data);
  }

  /// Handles a call_signal coming from the global notification WebSocket.
  static void handleCallSignal(Map<String, dynamic> payload) {
    debugPrint('[WS] call_signal received: ${payload['data']?['type']}');
    final context = ProviderService.navigatorKey.currentContext;
    if (context == null) return;

    final callProvider = Provider.of<CallProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final signalData = payload['data'] as Map<String, dynamic>?;
    if (signalData == null) return;

    final signalType = signalData['type'];
    if (signalType == 'call_offer') {
      final caller = User(
        id: _toInt(payload['caller_id']),
        username: payload['caller_username'] ?? '',
        email: '',
        profilePicture: SafeParser.normalizeUrl(payload['caller_profile_picture']),
      );
      callProvider.handleIncomingCall(caller, signalData['callType'] ?? 'voice', signalData);

      // Also show a call notification (for when app is backgrounded but alive)
      _showCallNotification(
        callerId: _toInt(payload['caller_id']),
        callerName: payload['caller_username'] ?? 'Someone',
        callType: signalData['callType'] ?? 'voice',
        payloadData: payload,
      );
    } else if (signalType == 'call_ended') {
      callProvider.handleSignal(signalData);
    } else {
      callProvider.handleSignal(signalData);
    }
  }

  // ── Show local notification for incoming message ──────────────────────────
  static Future<void> _showMessageNotification(Map<String, dynamic> data) async {
    final senderId = _toInt(data['sender_id'] ?? data['sender_username']);
    final senderName = data['sender'] ?? data['sender_username'] ?? 'Someone';
    final content = data['content'] ?? 'Sent you a message';

    // Don't show if already chatting with this person
    final context = ProviderService.navigatorKey.currentContext;
    if (context != null) {
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      if (chatProvider.activeUserId != null &&
          chatProvider.activeUserId == senderId) {
        debugPrint('[Notification] Skipping – already in chat with sender');
        return;
      }
    }

    await localNotifications.show(
      id: senderId,
      title: senderName,
      body: content,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          messageChannel.id,
          messageChannel.name,
          channelDescription: messageChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
      payload: jsonEncode({...data, 'notification_type': 'chat'}),
    );
  }

  // ── Show local notification for incoming call ─────────────────────────────
  static Future<void> _showCallNotification({
    required int callerId,
    required String callerName,
    required String callType,
    required Map<String, dynamic> payloadData,
  }) async {
    await localNotifications.show(
      id: 0,
      title: 'Incoming ${callType == 'video' ? 'Video' : 'Voice'} Call',
      body: '$callerName is calling...',
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          callChannel.id,
          callChannel.name,
          channelDescription: callChannel.description,
          importance: Importance.max,
          priority: Priority.max,
          fullScreenIntent: true,
          category: AndroidNotificationCategory.call,
          icon: '@mipmap/ic_launcher',
          actions: const [
            AndroidNotificationAction('accept', 'Accept', showsUserInterface: true),
            AndroidNotificationAction('reject', 'Reject', showsUserInterface: false, cancelNotification: true),
          ],
        ),
      ),
      payload: jsonEncode({...payloadData, 'notification_type': 'call'}),
    );
  }

  // ── Shows local notification from an FCM RemoteMessage ───────────────────
  static Future<void> showLocalFromFcm(RemoteMessage message) async {
    final data = message.data;
    final notifType = data['type'];

    if (notifType == 'chat_message' || notifType == 'chat_alert') {
      await _showMessageNotification(data);
    } else if (notifType == 'call_offer') {
      await _showCallNotification(
        callerId: _toInt(data['caller_id']),
        callerName: data['caller_username'] ?? 'Someone',
        callType: data['call_type'] ?? 'voice',
        payloadData: data,
      );
    }
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────
  static void _onLocalNotificationTap(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null) return;

    final data = Map<String, dynamic>.from(jsonDecode(payload));
    final actionId = response.actionId;

    if (actionId == 'accept') {
      _handleCallAction(data, accepted: true);
    } else if (actionId == 'reject') {
      _handleCallAction(data, accepted: false);
    } else {
      _routeFromData(data);
    }
  }

  static void _handleCallAction(Map<String, dynamic> data, {required bool accepted}) {
    final context = ProviderService.navigatorKey.currentContext;
    if (context == null) return;

    final callProvider = Provider.of<CallProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    if (accepted) {
      final caller = User(
        id: _toInt(data['caller_id']),
        username: data['caller_username'] ?? '',
        email: '',
        profilePicture: SafeParser.normalizeUrl(data['caller_profile_picture']),
      );
      final signalData = data['data'] is Map
          ? Map<String, dynamic>.from(data['data'] as Map)
          : data;

      callProvider.handleIncomingCall(
          caller, data['callType'] ?? signalData['callType'] ?? 'voice', signalData);
      callProvider.acceptCall(chatProvider, signalData);
    } else {
      if (callProvider.status == CallStatus.incoming) {
        callProvider.endCall(chatProvider);
      }
    }
  }

  /// Routes the user to the correct screen based on notification payload.
  /// Works for both FCM-opened (killed/bg) and local notification taps.
  static void _routeFromData(Map<String, dynamic> data) {
    final context = ProviderService.navigatorKey.currentContext;
    if (context == null) return;

    final notifType = data['notification_type'] ?? data['type'];

    if (notifType == 'chat' || notifType == 'chat_message' || notifType == 'chat_alert') {
      final senderId = _toInt(data['sender_id']);
      final senderUsername = data['sender_username'] ?? data['sender'] ?? '';
      if (senderId == 0 || senderUsername.isEmpty) return;

      final otherUser = User(
        id: senderId,
        username: senderUsername,
        email: '',
        profilePicture: SafeParser.normalizeUrl(data['sender_profile_picture']),
      );

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ChatDetailScreen(user: otherUser),
        ),
      );
    } else if (notifType == 'call' || notifType == 'call_offer') {
      // If the app opens from a call notification tap (not accept/reject button),
      // just ensure the call screen is shown (CallProvider status drives CallScreen overlay)
      final callProvider = Provider.of<CallProvider>(context, listen: false);
      if (callProvider.status == CallStatus.incoming ||
          callProvider.status == CallStatus.connecting ||
          callProvider.status == CallStatus.connected) {
        // CallScreen overlay in MainScreen will auto-show
      }
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  static int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    return int.tryParse(value.toString()) ?? 0;
  }
}
