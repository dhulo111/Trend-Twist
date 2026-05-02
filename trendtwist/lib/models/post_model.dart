import 'user_model.dart';
import '../utils/parsers.dart';

class Post {
  final int id;
  final User author;
  final String? content;
  final String? mediaFile;
  final DateTime createdAt;
  final int likesCount;
  final int commentsCount;
  final bool isLiked;
  final bool isSaved;
  final bool isExclusive;
  final bool hasAccess;
  final bool isFollowing;
  final String? location;
  final String? requiredTier;
  final int twistsCount;
  final Post? originalPost;

  Post({
    required this.id,
    required this.author,
    this.content,
    this.mediaFile,
    required this.createdAt,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    this.isExclusive = false,
    this.hasAccess = true,
    this.isFollowing = false,
    this.location,
    this.requiredTier,
    this.twistsCount = 0,
    this.originalPost,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    // Flattened author fields from backend
    final String? authorUsername = json['author_username'];
    final String? authorProfilePicture = json['author_profile_picture'];
    
    User authorDetails;
    if (json['author_details'] != null) {
      authorDetails = User.fromJson(json['author_details']);
    } else if (json['author'] is Map) {
      authorDetails = User.fromJson(json['author']);
    } else {
      // Fallback to flattened fields if nested data is missing
      authorDetails = User(
        id: json['author'] is int ? json['author'] : 0,
        username: authorUsername ?? 'User ${json['author']}',
        email: '',
        profilePicture: authorProfilePicture,
      );
    }

    return Post(
      id: json['id'],
      author: authorDetails,
      content: json['content'] ?? json['caption'],
      mediaFile: SafeParser.normalizeUrl(json['media_file'] ?? json['image'] ?? json['video']),
      createdAt: SafeParser.parseDateTime(json['created_at']),
      likesCount: json['likes_count'] ?? 0,
      commentsCount: json['comments_count'] ?? 0,
      isLiked: SafeParser.parseBool(json['is_liked']),
      isSaved: SafeParser.parseBool(json['is_saved']),
      isExclusive: SafeParser.parseBool(json['is_exclusive']),
      hasAccess: SafeParser.parseBool(json['has_access'], defaultValue: true),
      isFollowing: SafeParser.parseBool(json['is_following']),
      location: json['location'],
      requiredTier: json['required_tier'],
      twistsCount: json['twists_count'] ?? 0,
      originalPost: json['original_post'] != null ? Post.fromJson(json['original_post']) : null,
    );
  }

  Post copyWith({
    int? id,
    User? author,
    String? content,
    String? mediaFile,
    DateTime? createdAt,
    int? likesCount,
    int? commentsCount,
    bool? isLiked,
    bool? isSaved,
    bool? isExclusive,
    bool? hasAccess,
    bool? isFollowing,
    String? location,
    String? requiredTier,
    Post? originalPost,
    int? twistsCount,
  }) {
    return Post(
      id: id ?? this.id,
      author: author ?? this.author,
      content: content ?? this.content,
      mediaFile: mediaFile ?? this.mediaFile,
      createdAt: createdAt ?? this.createdAt,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
      isExclusive: isExclusive ?? this.isExclusive,
      hasAccess: hasAccess ?? this.hasAccess,
      isFollowing: isFollowing ?? this.isFollowing,
      location: location ?? this.location,
      requiredTier: requiredTier ?? this.requiredTier,
      twistsCount: twistsCount ?? this.twistsCount,
      originalPost: originalPost ?? this.originalPost,
    );
  }
}
