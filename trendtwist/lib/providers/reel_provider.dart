import 'package:flutter/material.dart';
import '../models/reel_model.dart';
import '../models/comment_model.dart';
import '../services/api_service.dart';
import '../config/constants.dart';
import '../utils/parsers.dart';

class ReelProvider with ChangeNotifier {
  List<Reel> _reels = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _nextPageUrl;
  final ApiService _apiService = ApiService();
  final Set<int> _processingIds = {}; // For debouncing actions

  List<Reel> get reels => _reels;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _nextPageUrl != null;

  Future<void> fetchReels({bool refresh = true}) async {
    if (refresh) {
      _isLoading = true;
      _reels = [];
      _nextPageUrl = null;
    } else {
      if (_nextPageUrl == null || _isLoadingMore) return;
      _isLoadingMore = true;
    }
    notifyListeners();

    try {
      // Use page_size=10 for initial fetch
      final url = refresh ? '/reels/?page_size=10' : _nextPageUrl!;
      final response = await _apiService.dio.get(url);
      
      if (response.statusCode == 200) {
        final data = response.data;
        final list = SafeParser.parseList(data);
        final newReels = list.map((r) => Reel.fromJson(r)).toList();
        
        if (refresh) {
          _reels = newReels;
        } else {
          // Prevent duplicates
          final existingIds = _reels.map((r) => r.id).toSet();
          final uniqueNewReels = newReels.where((r) => !existingIds.contains(r.id)).toList();
          _reels.addAll(uniqueNewReels);
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
      debugPrint('Fetch reels error: $e');
    }

    _isLoading = false;
    _isLoadingMore = false;
    notifyListeners();

    // Progressive loading: fetch the next batch in the background after refresh
    if (refresh && hasMore) {
      Future.delayed(const Duration(milliseconds: 500), () {
        fetchReels(refresh: false);
      });
    }
  }

  Future<void> toggleLike(int reelId) async {
    if (_processingIds.contains(reelId)) return;
    _processingIds.add(reelId);

    int index = _reels.indexWhere((r) => r.id == reelId);
    if (index == -1) {
      _processingIds.remove(reelId);
      return;
    }

    final originalReel = _reels[index];
    final bool wasLiked = originalReel.isLiked;
    
    // Optimistic Update
    _reels[index] = originalReel.copyWith(
      isLiked: !wasLiked,
      likesCount: wasLiked ? originalReel.likesCount - 1 : originalReel.likesCount + 1,
    );
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/reels/$reelId/like/');
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to like');
      }
      // Optional: sync with real data from response
      if (response.data != null) {
        bool isLiked = response.data['status'] == 'liked';
        int likesCount = response.data['likes_count'] ?? _reels[index].likesCount;
        _reels[index] = _reels[index].copyWith(isLiked: isLiked, likesCount: likesCount);
        notifyListeners();
      }
    } catch (e) {
      // Revert on failure
      _reels[index] = originalReel;
      notifyListeners();
      print('Toggle like error: $e');
    } finally {
      _processingIds.remove(reelId);
    }
  }

  Future<void> toggleSave(int reelId) async {
    int index = _reels.indexWhere((r) => r.id == reelId);
    if (index == -1) return;

    final originalReel = _reels[index];
    
    // Optimistic Update
    _reels[index] = originalReel.copyWith(isSaved: !originalReel.isSaved);
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/user/toggle-save/', data: {
        'type': 'reel',
        'id': reelId,
      });
      if (response.statusCode != 200) throw Exception('Failed to save');
    } catch (e) {
      // Revert
      _reels[index] = originalReel;
      notifyListeners();
      print('Toggle save error: $e');
    }
  }

  Future<void> toggleFollow(int authorId) async {
    final List<Reel> originalReels = List.from(_reels);
    bool? firstIsFollowing;
    
    // Optimistic Update for all reels from this author
    for (int i = 0; i < _reels.length; i++) {
      if (_reels[i].author.id == authorId) {
        firstIsFollowing ??= !_reels[i].isFollowing;
        _reels[i] = _reels[i].copyWith(isFollowing: firstIsFollowing);
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
      _reels = originalReels;
      notifyListeners();
      print('Toggle follow error: $e');
    }
  }

  Future<void> registerView(int reelId) async {
    try {
      await _apiService.dio.post('/reels/$reelId/view/');
    } catch (e) {
      print('Register view error: $e');
    }
  }

  Future<List<Comment>> fetchComments(int reelId) async {
    try {
      final response = await _apiService.dio.get('/reels/$reelId/comments/');
      if (response.statusCode == 200) {
        final list = SafeParser.parseList(response.data);
        return list.map((c) => Comment.fromJson(c)).toList();
      }
    } catch (e) {
      print('Fetch reel comments error: $e');
    }
    return [];
  }

  Future<bool> addComment(int reelId, String text) async {
    int index = _reels.indexWhere((r) => r.id == reelId);
    if (index == -1) return false;

    final originalReel = _reels[index];

    // Optimistic Update
    _reels[index] = originalReel.copyWith(
      commentsCount: originalReel.commentsCount + 1,
    );
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/reels/$reelId/comments/', data: {
        'text': text,
      });
      if (response.statusCode == 201 || response.statusCode == 200) {
        return true;
      }
      throw Exception('Failed to comment');
    } catch (e) {
      // Revert
      _reels[index] = originalReel;
      notifyListeners();
      print('Add reel comment error: $e');
      return false;
    }
  }
}
