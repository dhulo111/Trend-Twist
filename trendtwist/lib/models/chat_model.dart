import 'user_model.dart';
import '../utils/parsers.dart';

class ChatRoom {
  final int id;
  final User otherUser;
  final String? lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;

  ChatRoom({
    required this.id,
    required this.otherUser,
    this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    return ChatRoom(
      id: json['id'],
      otherUser: SafeParser.parseUser(json['other_user']),
      lastMessage: json['last_message']?['content'],
      lastMessageTime: SafeParser.parseDateTime(json['last_message']?['created_at'] ?? json['updated_at']),
      unreadCount: json['unread_count'] ?? 0,
    );
  }
  ChatRoom copyWith({
    String? lastMessage,
    int? unreadCount,
  }) {
    return ChatRoom(
      id: id,
      otherUser: otherUser,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageTime: lastMessageTime,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}

class Message {
  final int id;
  final int senderId;
  final String content;
  final DateTime createdAt;

  Message({
    required this.id,
    required this.senderId,
    required this.content,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      senderId: json['author'],
      content: json['content'],
      createdAt: SafeParser.parseDateTime(json['timestamp'] ?? json['created_at']),
    );
  }

  Message copyWith({
    String? content,
  }) {
    return Message(
      id: id,
      senderId: senderId,
      content: content ?? this.content,
      createdAt: createdAt,
    );
  }
}
