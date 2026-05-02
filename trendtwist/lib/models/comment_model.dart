import 'user_model.dart';
import '../utils/parsers.dart';

class Comment {
  final int id;
  final User author;
  final String text;
  final DateTime createdAt;

  Comment({
    required this.id,
    required this.author,
    required this.text,
    required this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'],
      author: SafeParser.parseUser(json['author_details'] ?? json['author']),
      text: json['text'] ?? json['content'] ?? '',
      createdAt: SafeParser.parseDateTime(json['created_at']),
    );
  }
}
