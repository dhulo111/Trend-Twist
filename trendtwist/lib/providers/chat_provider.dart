import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/chat_model.dart';
import '../services/api_service.dart';
import '../config/constants.dart';
import '../providers/auth_provider.dart';
import 'package:provider/provider.dart';
import '../services/encryption_service.dart';
import '../providers/call_provider.dart';
import '../services/provider_service.dart';

class ChatProvider with ChangeNotifier {
  List<ChatRoom> _rooms = [];
  List<Message> _messages = [];
  bool _isLoading = false;
  final ApiService _apiService = ApiService();
  WebSocketChannel? _channel;
  int? _activeUserId;
  int? _currentUserId;

  List<ChatRoom> get rooms => _rooms;
  List<Message> get messages => _messages;
  bool get isLoading => _isLoading;
  int? get activeUserId => _activeUserId;

  void update(AuthProvider auth) {
    _currentUserId = auth.user?.id;
  }

  Future<void> fetchRooms() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/chats/');
      if (response.statusCode == 200) {
        final List roomsData = response.data;
        
        List<ChatRoom> loadedRooms = [];
        for (var r in roomsData) {
          var room = ChatRoom.fromJson(r);
          if (room.lastMessage != null && _currentUserId != null) {
            final roomId = EncryptionService.getRoomId(
              isGroup: false,
              currentUserId: _currentUserId,
              otherUserId: room.otherUser.id,
            );
            final decrypted = await EncryptionService.decrypt(room.lastMessage!, roomId);
            room = room.copyWith(lastMessage: decrypted);
          }
          loadedRooms.add(room);
        }
        _rooms = loadedRooms;
      }
    } catch (e) {
      print('Fetch rooms error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchMessages(int userId) async {
    _isLoading = true;
    _messages = [];
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/chats/$userId/');
      if (response.statusCode == 200) {
        final List messagesData = response.data;
        
        List<Message> loadedMessages = [];
        final roomId = EncryptionService.getRoomId(
          isGroup: false,
          currentUserId: _currentUserId,
          otherUserId: userId,
        );

        for (var m in messagesData) {
          var message = Message.fromJson(m);
          final decrypted = await EncryptionService.decrypt(message.content, roomId);
          loadedMessages.add(message.copyWith(content: decrypted));
        }
        _messages = loadedMessages;
      }
    } catch (e) {
      print('Fetch messages error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  void connectToChat(int userId, String token) {
    if (_channel != null) {
      disconnect();
    }

    _activeUserId = userId;
    final wsUri = Uri.parse('${AppConfig.wsUrl}/chat/$userId/?token=$token');
    
    _channel = IOWebSocketChannel.connect(wsUri);
    
    _channel!.stream.listen(
      (data) async {
        final decoded = jsonDecode(data);
        if (decoded['type'] == 'chat_message') {
          var newMessage = Message.fromJson(decoded);
          
          final roomId = EncryptionService.getRoomId(
            isGroup: false,
            currentUserId: _currentUserId,
            otherUserId: userId,
          );
          
          final decrypted = await EncryptionService.decrypt(newMessage.content, roomId);
          newMessage = newMessage.copyWith(content: decrypted);

          // Avoid duplicates from optimistic update
          if (!_messages.any((m) => m.id == newMessage.id)) {
            _messages.add(newMessage);
            notifyListeners();
          }
        } else if (decoded['type'] == 'user_status') {
           // Handle online/offline status if needed
        } else if (decoded['type'] == 'call_signal') {
           Provider.of<CallProvider>(ProviderService.navigatorKey.currentContext!, listen: false)
               .handleSignal(decoded['data']);
        }
      },
      onError: (err) => print('WS Error: $err'),
      onDone: () => print('WS Closed'),
    );
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
    _activeUserId = null;
  }

  void sendCallSignal(Map<String, dynamic> data) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode(data));
    }
  }

  Future<void> sendMessage(int userId, String content, int currentUserId) async {
    // Optimistic Update
    final tempMessage = Message(
      id: DateTime.now().millisecondsSinceEpoch, // Temp ID
      senderId: currentUserId,
      content: content,
      createdAt: DateTime.now(),
    );
    
    _messages.add(tempMessage);
    notifyListeners();

    final roomId = EncryptionService.getRoomId(
      isGroup: false,
      currentUserId: currentUserId,
      otherUserId: userId,
    );
    final encryptedContent = await EncryptionService.encrypt(content, roomId);

    if (_channel != null) {
      _channel!.sink.add(jsonEncode({
        'type': 'chat_message',
        'message': encryptedContent,
      }));
    } else {
      // Fallback to REST if WS is not connected
      try {
        await _apiService.dio.post('/messages/send/', data: {
          'recipient_id': userId,
          'content': encryptedContent,
        });
      } catch (e) {
        print('Send message fallback error: $e');
        _messages.remove(tempMessage);
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
