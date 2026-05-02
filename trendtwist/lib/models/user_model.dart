import '../utils/parsers.dart';

class User {
  final int id;
  final String username;
  final String email;
  final String? profilePicture;
  final String? bio;
  final bool isCreator;
  final bool isPrivate;
  final bool isFollowing;
  final bool isSubscribed;
  final int followersCount;
  final int followingCount;
  final int postsCount;
  final int storiesCount;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.profilePicture,
    this.bio,
    this.isCreator = false,
    this.isPrivate = false,
    this.isFollowing = false,
    this.isSubscribed = false,
    this.followersCount = 0,
    this.followingCount = 0,
    this.postsCount = 0,
    this.storiesCount = 0,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>?;
    
    return User(
      id: json['id'] ?? 0,
      username: json['username'] ?? profile?['username'] ?? '',
      email: json['email'] ?? profile?['email'] ?? '',
      profilePicture: SafeParser.normalizeUrl(json['profile_picture'] ?? profile?['profile_picture']),
      bio: json['bio'] ?? profile?['bio'],
      isCreator: SafeParser.parseBool(json['is_creator'] ?? profile?['is_creator']),
      isPrivate: SafeParser.parseBool(json['is_private'] ?? profile?['is_private']),
      isFollowing: SafeParser.parseBool(json['is_following']),
      isSubscribed: SafeParser.parseBool(json['is_subscribed']),
      followersCount: json['followers_count'] ?? 0,
      followingCount: json['following_count'] ?? 0,
      postsCount: json['posts_count'] ?? 0,
      storiesCount: json['stories_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'profile_picture': profilePicture,
      'bio': bio,
      'is_creator': isCreator,
      'is_private': isPrivate,
      'is_following': isFollowing,
      'is_subscribed': isSubscribed,
      'followers_count': followersCount,
      'following_count': followingCount,
      'posts_count': postsCount,
      'stories_count': storiesCount,
    };
  }

  User copyWith({
    int? id,
    String? username,
    String? email,
    String? profilePicture,
    String? bio,
    bool? isCreator,
    bool? isPrivate,
    bool? isFollowing,
    bool? isSubscribed,
    int? followersCount,
    int? followingCount,
    int? postsCount,
    int? storiesCount,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      profilePicture: profilePicture ?? this.profilePicture,
      bio: bio ?? this.bio,
      isCreator: isCreator ?? this.isCreator,
      isPrivate: isPrivate ?? this.isPrivate,
      isFollowing: isFollowing ?? this.isFollowing,
      isSubscribed: isSubscribed ?? this.isSubscribed,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      postsCount: postsCount ?? this.postsCount,
      storiesCount: storiesCount ?? this.storiesCount,
    );
  }
}
