import 'user_model.dart';
import 'post_model.dart';
import '../utils/parsers.dart';

class Twist {
  final int id;
  final User author;
  final String? content;
  final String? mediaFile;
  final DateTime createdAt;
  final int likesCount;
  final int commentsCount;
  final int retwistsCount;
  final bool isLiked;
  final bool isSaved;
  final bool isExclusive;
  final bool hasAccess;
  final int? originalTwistId;
  final int? originalPostId;
  final Post? originalPostData;

  Twist({
    required this.id,
    required this.author,
    this.content,
    this.mediaFile,
    required this.createdAt,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.retwistsCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    this.isExclusive = false,
    this.hasAccess = true,
    this.originalTwistId,
    this.originalPostId,
    this.originalPostData,
  });

  factory Twist.fromJson(Map<String, dynamic> json) {
    User authorDetails;
    if (json['author_details'] != null) {
      authorDetails = User.fromJson(json['author_details']);
    } else if (json['author'] is Map) {
      authorDetails = User.fromJson(json['author']);
    } else {
      authorDetails = User(
        id: json['author'] is int ? json['author'] : 0,
        username: json['author_username'] ?? 'User ${json['author']}',
        email: '',
        profilePicture: json['author_profile_picture'],
      );
    }

    return Twist(
      id: json['id'],
      author: authorDetails,
      content: json['content'],
      mediaFile: SafeParser.normalizeUrl(json['media_file']),
      createdAt: SafeParser.parseDateTime(json['created_at']),
      likesCount: json['likes_count'] ?? 0,
      commentsCount: json['comments_count'] ?? 0,
      retwistsCount: json['retwists_count'] ?? 0,
      isLiked: SafeParser.parseBool(json['is_liked']),
      isSaved: SafeParser.parseBool(json['is_saved']),
      isExclusive: SafeParser.parseBool(json['is_exclusive']),
      hasAccess: SafeParser.parseBool(json['has_access'], defaultValue: true),
      originalTwistId: json['original_twist'],
      originalPostId: json['original_post'],
      originalPostData: json['original_post_data'] != null ? Post.fromJson(json['original_post_data']) : null,
    );
  }
}
