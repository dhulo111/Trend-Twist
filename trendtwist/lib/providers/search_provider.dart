import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../models/hashtag_model.dart';
import '../models/post_model.dart';
import '../models/twist_model.dart';
import '../services/api_service.dart';

class SearchProvider with ChangeNotifier {
  List<User> _userResults = [];
  List<Hashtag> _trendingHashtags = [];
  List<dynamic> _trendingPosts = []; // Can be Post or Twist
  
  bool _isLoading = false;
  final ApiService _apiService = ApiService();

  List<User> get userResults => _userResults;
  List<Hashtag> get trendingHashtags => _trendingHashtags;
  List<dynamic> get trendingPosts => _trendingPosts;
  bool get isLoading => _isLoading;

  Future<void> fetchTrends() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/trends/hashtags/');
      if (response.statusCode == 200) {
        _trendingHashtags = (response.data as List).map((h) => Hashtag.fromJson(h)).toList();
      }
    } catch (e) {
      print('Fetch trends error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> searchUsers(String query) async {
    if (query.isEmpty) {
      _userResults = [];
      notifyListeners();
      return;
    }

    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/users/search/', queryParameters: {'q': query});
      if (response.statusCode == 200) {
        _userResults = (response.data as List).map((u) => User.fromJson(u)).toList();
      }
    } catch (e) {
      print('Search users error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchTrendingContent(String tag) async {
    _isLoading = true;
    _trendingPosts = [];
    notifyListeners();

    try {
      // Fetch public posts with the tag
      final postResp = await _apiService.dio.get('/posts/public/', queryParameters: {'tag': tag});
      // Fetch public twists with the tag
      final twistResp = await _apiService.dio.get('/twists/public/', queryParameters: {'tag': tag});

      List<dynamic> combined = [];
      if (postResp.statusCode == 200) {
        combined.addAll((postResp.data as List).map((p) => Post.fromJson(p)));
      }
      if (twistResp.statusCode == 200) {
        combined.addAll((twistResp.data as List).map((t) => Twist.fromJson(t)));
      }

      // Sort by date
      combined.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      _trendingPosts = combined;

    } catch (e) {
      print('Fetch trending content error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }
}
