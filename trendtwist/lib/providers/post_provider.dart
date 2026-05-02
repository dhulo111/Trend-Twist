import 'package:flutter/material.dart';
import '../models/post_model.dart';
import '../models/story_model.dart';
import '../models/comment_model.dart';
import '../services/api_service.dart';
import '../config/constants.dart';
import '../utils/parsers.dart';
import 'dart:io';
import 'package:dio/dio.dart';
import '../models/twist_model.dart';

class PostProvider with ChangeNotifier {
  List<Post> _posts = [];
  List<Story> _stories = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _nextPageUrl;
  final ApiService _apiService = ApiService();

  final Set<int> _processingIds = {}; // For debouncing actions

  List<Post> get posts => _posts;
  List<Story> get stories => _stories;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _nextPageUrl != null;

  Future<void> fetchPosts({bool refresh = true}) async {
    if (refresh) {
      _isLoading = true;
      _posts = [];
      _nextPageUrl = null;
    } else {
      if (_nextPageUrl == null || _isLoadingMore) return;
      _isLoadingMore = true;
    }
    notifyListeners();

    try {
      // Use page_size=10 for initial fetch
      final url = refresh ? '/posts/?page_size=10' : _nextPageUrl!;
      final response = await _apiService.dio.get(url);
      
      if (response.statusCode == 200) {
        final data = response.data;
        final list = SafeParser.parseList(data);
        final newPosts = list.map((p) => Post.fromJson(p)).toList();
        
        if (refresh) {
          _posts = newPosts;
        } else {
          // Prevent duplicates
          final existingIds = _posts.map((p) => p.id).toSet();
          final uniqueNewPosts = newPosts.where((p) => !existingIds.contains(p.id)).toList();
          _posts.addAll(uniqueNewPosts);
        }
        
        if (data is Map && data.containsKey('next')) {
          String? nextUrl = data['next']?.toString();
          if (nextUrl != null && nextUrl.isNotEmpty) {
            _nextPageUrl = nextUrl.replaceFirst(AppConfig.apiUrl, '');
          } else {
            _nextPageUrl = null;
          }
        } else {
          _nextPageUrl = null;
        }
      }
    } catch (e) {
      debugPrint('Fetch posts error: $e');
    }

    _isLoading = false;
    _isLoadingMore = false;
    notifyListeners();

    // Progressive loading: if we just refreshed and there's more, 
    // fetch the next batch in the background to ensure consistency and speed.
    if (refresh && hasMore) {
      Future.delayed(const Duration(milliseconds: 500), () {
        fetchPosts(refresh: false);
      });
    }
  }

  Future<Post?> fetchPostById(int postId) async {
    try {
      final response = await _apiService.dio.get('/posts/$postId/');
      if (response.statusCode == 200) {
        return Post.fromJson(response.data);
      }
    } catch (e) {
      print('Fetch post by id error: $e');
    }
    return null;
  }

  Future<void> fetchStories() async {
    try {
      final response = await _apiService.dio.get('/stories/');
      if (response.statusCode == 200) {
        final list = SafeParser.parseList(response.data);
        _stories = list.map((s) => Story.fromJson(s)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Fetch stories error: $e');
    }
  }

  Future<void> toggleLike(int postId) async {
    if (_processingIds.contains(postId)) return;
    _processingIds.add(postId);

    int index = _posts.indexWhere((p) => p.id == postId);
    if (index == -1) {
      _processingIds.remove(postId);
      return;
    }

    final originalPost = _posts[index];
    final bool wasLiked = originalPost.isLiked;

    // Optimistic Update
    _posts[index] = originalPost.copyWith(
      isLiked: !wasLiked,
      likesCount: wasLiked ? originalPost.likesCount - 1 : originalPost.likesCount + 1,
    );
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/posts/$postId/like/');
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to like');
      }
      // Sync with real data
      if (response.data != null) {
        bool isLiked = response.data['status'] == 'liked';
        int likesCount = response.data['likes_count'] ?? _posts[index].likesCount;
        _posts[index] = _posts[index].copyWith(isLiked: isLiked, likesCount: likesCount);
        notifyListeners();
      }
    } catch (e) {
      // Revert
      _posts[index] = originalPost;
      notifyListeners();
      print('Toggle like error: $e');
    } finally {
      _processingIds.remove(postId);
    }
  }

  Future<void> toggleSave(int postId) async {
    int index = _posts.indexWhere((p) => p.id == postId);
    if (index == -1) return;

    final originalPost = _posts[index];

    // Optimistic Update
    _posts[index] = originalPost.copyWith(isSaved: !originalPost.isSaved);
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/user/toggle-save/', data: {
        'type': 'post',
        'id': postId,
      });
      if (response.statusCode != 200) throw Exception('Failed to save');
    } catch (e) {
      // Revert
      _posts[index] = originalPost;
      notifyListeners();
      print('Toggle save error: $e');
    }
  }

  Future<List<Comment>> fetchComments(int postId) async {
    try {
      final response = await _apiService.dio.get('/posts/$postId/comments/');
      if (response.statusCode == 200) {
        final list = SafeParser.parseList(response.data);
        return list.map((c) => Comment.fromJson(c)).toList();
      }
    } catch (e) {
      print('Fetch comments error: $e');
    }
    return [];
  }

  Future<bool> addComment(int postId, String text) async {
    int index = _posts.indexWhere((p) => p.id == postId);
    if (index == -1) return false;

    final originalPost = _posts[index];

    // Optimistic Update
    _posts[index] = originalPost.copyWith(
      commentsCount: originalPost.commentsCount + 1,
    );
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/posts/$postId/comments/', data: {
        'text': text,
      });
      if (response.statusCode == 201 || response.statusCode == 200) {
        return true;
      }
      throw Exception('Failed to add comment');
    } catch (e) {
      // Revert
      _posts[index] = originalPost;
      notifyListeners();
      print('Add comment error: $e');
      return false;
    }
  }

  Future<bool> createTwist(int originalPostId, String content, {File? media}) async {
    try {
      Map<String, dynamic> data = {
        'content': content,
      };

      if (originalPostId > 0) {
        data['original_post'] = originalPostId;
      }

      FormData formData = FormData.fromMap(data);

      if (media != null) {
        formData.files.add(MapEntry(
          'media_file',
          await MultipartFile.fromFile(media.path),
        ));
      }

      final response = await _apiService.dio.post('/twists/', data: formData);
      if (response.statusCode == 201 || response.statusCode == 200) {
        // Update local state for twistsCount
        int idx = _posts.indexWhere((p) => p.id == originalPostId);
        if (idx != -1) {
          _posts[idx] = _posts[idx].copyWith(twistsCount: _posts[idx].twistsCount + 1);
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      print('Create twist error: $e');
    }
    return false;
  }

  Future<bool> deletePost(int postId) async {
    try {
      final response = await _apiService.dio.delete('/posts/$postId/');
      if (response.statusCode == 204 || response.statusCode == 200) {
        _posts.removeWhere((p) => p.id == postId);
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Delete post error: $e');
    }
    return false;
  }

  Future<void> toggleFollow(int authorId) async {
    final List<Post> originalPosts = List.from(_posts);
    bool? firstIsFollowing;

    // Optimistic Update
    for (int i = 0; i < _posts.length; i++) {
      if (_posts[i].author.id == authorId) {
        firstIsFollowing ??= !_posts[i].isFollowing;
        _posts[i] = _posts[i].copyWith(isFollowing: firstIsFollowing);
      }
    }
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/user/toggle-follow/', data: {
        'user_id': authorId,
      });
      if (response.statusCode != 200) throw Exception('Failed to follow');
    } catch (e) {
      // Revert
      _posts = originalPosts;
      notifyListeners();
      print('Toggle follow error: $e');
    }
  }

  Future<List<Twist>> fetchGlobalTwists() async {
    try {
      final response = await _apiService.dio.get('/twists/public/');
      if (response.statusCode == 200) {
        final list = SafeParser.parseList(response.data);
        return list.map((t) => Twist.fromJson(t)).toList();
      }
    } catch (e) {
      print('Fetch global twists error: $e');
    }
    return [];
  }
}
