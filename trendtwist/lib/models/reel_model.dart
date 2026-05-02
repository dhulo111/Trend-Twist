import 'user_model.dart';
import '../utils/parsers.dart';

class Reel {
  final int id;
  final User author;
  final String? caption;
  final String mediaFile;
  final String mediaType;
  final DateTime createdAt;
  final int likesCount;
  final int commentsCount;
  final bool isLiked;
  final bool isSaved;
  final bool isFollowing;
  final bool isExclusive;
  final bool hasAccess;
  final String? requiredTier;
  final String? musicName;
  final String? musicUrl;
  final String? editorJson;

  Reel({
    required this.id,
    required this.author,
    this.caption,
    required this.mediaFile,
    this.mediaType = 'video',
    required this.createdAt,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    this.isFollowing = false,
    this.isExclusive = false,
    this.hasAccess = true,
    this.requiredTier,
    this.musicName,
    this.musicUrl,
    this.editorJson,
  });

  factory Reel.fromJson(Map<String, dynamic> json) {
    // Flattened author fields support
    final String? authorUsername = json['author_username'];
    final String? authorProfilePicture = json['author_profile_picture'];
    
    User authorDetails;
    if (json['author_details'] != null) {
      authorDetails = User.fromJson(json['author_details']);
    } else if (json['author'] is Map) {
      authorDetails = User.fromJson(json['author']);
    } else {
      authorDetails = User(
        id: json['author'] is int ? json['author'] : 0,
        username: authorUsername ?? 'User ${json['author']}',
        email: '',
        profilePicture: authorProfilePicture,
      );
    }

    final String mediaFile = SafeParser.normalizeUrl(json['media_file'] ?? json['video'] ?? '');
    final String mediaType = json['media_type'] ?? (mediaFile.toLowerCase().contains('.jpg') || mediaFile.toLowerCase().contains('.png') ? 'image' : 'video');

    // Extract music from editor_json if missing at top level
    String? musicUrl = json['music_url'];
    String? musicName = json['music_name']?.toString();
    
    if (musicUrl == null || musicUrl.isEmpty) {
      if (json['editor_json'] != null) {
        try {
          final dynamic editorJsonRaw = json['editor_json'];
          Map<String, dynamic> editorData = {};
          
          if (editorJsonRaw is Map) {
            editorData = Map<String, dynamic>.from(editorJsonRaw);
          } else if (editorJsonRaw is String) {
            // If it's a string, we might need to parse it, but for now let's be safe
          }
          
          if (editorData['music'] != null && editorData['music']['previewUrl'] != null) {
            musicUrl = editorData['music']['previewUrl'];
            musicName = editorData['music']['title'] ?? editorData['music']['name'];
          }
        } catch (_) {}
      }
    }

    return Reel(
      id: json['id'] ?? 0,
      author: authorDetails,
      caption: json['caption']?.toString(),
      mediaFile: mediaFile,
      mediaType: mediaType,
      createdAt: SafeParser.parseDateTime(json['created_at']),
      likesCount: json['likes_count'] ?? 0,
      commentsCount: json['comments_count'] ?? 0,
      isLiked: SafeParser.parseBool(json['is_liked']),
      isSaved: SafeParser.parseBool(json['is_saved']),
      isFollowing: SafeParser.parseBool(json['is_following']),
      isExclusive: SafeParser.parseBool(json['is_exclusive']),
      hasAccess: SafeParser.parseBool(json['has_access'], defaultValue: true),
      requiredTier: json['required_tier']?.toString(),
      musicName: musicName,
      musicUrl: SafeParser.normalizeUrl(musicUrl),
      editorJson: json['editor_json'] is Map 
          ? json['editor_json'].toString() 
          : json['editor_json']?.toString(),
    );
  }

  Reel copyWith({
    int? id,
    User? author,
    String? caption,
    String? mediaFile,
    String? mediaType,
    DateTime? createdAt,
    int? likesCount,
    int? commentsCount,
    bool? isLiked,
    bool? isSaved,
    bool? isFollowing,
    bool? isExclusive,
    bool? hasAccess,
    String? requiredTier,
    String? musicName,
    String? musicUrl,
    String? editorJson,
  }) {
    return Reel(
      id: id ?? this.id,
      author: author ?? this.author,
      caption: caption ?? this.caption,
      mediaFile: mediaFile ?? this.mediaFile,
      mediaType: mediaType ?? this.mediaType,
      createdAt: createdAt ?? this.createdAt,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
      isFollowing: isFollowing ?? this.isFollowing,
      isExclusive: isExclusive ?? this.isExclusive,
      hasAccess: hasAccess ?? this.hasAccess,
      requiredTier: requiredTier ?? this.requiredTier,
      musicName: musicName ?? this.musicName,
      musicUrl: musicUrl ?? this.musicUrl,
      editorJson: editorJson ?? this.editorJson,
    );
  }
}
