import 'user_model.dart';
import '../utils/parsers.dart';

class Story {
  final int id;
  final User author;
  final String mediaFile;
  final String mediaType; // 'image' or 'video'
  final DateTime createdAt;
  final bool isViewed;

  Story({
    required this.id,
    required this.author,
    required this.mediaFile,
    required this.mediaType,
    required this.createdAt,
    this.isViewed = false,
  });

  factory Story.fromJson(Map<String, dynamic> json) {
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

    return Story(
      id: json['id'],
      author: authorDetails,
      mediaFile: json['media_file'] ?? json['file'] ?? json['media'] ?? '',
      mediaType: json['media_type'] ?? 'image',
      createdAt: SafeParser.parseDateTime(json['created_at']),
      isViewed: json['is_viewed'] ?? false,
    );
  }
}
