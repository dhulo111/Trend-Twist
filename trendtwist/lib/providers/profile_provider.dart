import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../models/post_model.dart';
import '../models/reel_model.dart';
import '../services/api_service.dart';
import '../utils/parsers.dart';

class ProfileProvider with ChangeNotifier {
  User? _profileUser;
  List<Post> _userPosts = [];
  List<Post> _userTwists = [];
  List<Reel> _userReels = [];
  List<dynamic> _exclusiveContent = [];
  
  bool _isLoadingProfile = false;
  bool _isLoadingContent = false;
  String? _error;

  final ApiService _apiService = ApiService();

  User? get profileUser => _profileUser;
  List<Post> get userPosts => _userPosts;
  List<Post> get userTwists => _userTwists;
  List<Reel> get userReels => _userReels;
  List<dynamic> get exclusiveContent => _exclusiveContent;
  
  bool get isLoadingProfile => _isLoadingProfile;
  bool get isLoadingContent => _isLoadingContent;
  String? get error => _error;

  Future<void> fetchProfile(String username) async {
    _isLoadingProfile = true;
    _error = null;
    _profileUser = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/profiles/$username/');
      if (response.statusCode == 200) {
        _profileUser = User.fromJson(response.data);
        
        // If profile is accessible, fetch content
        if (!_profileUser!.isPrivate || _profileUser!.isFollowing || _profileUser!.id == 0) { // logic for owner needs current user id
           // Content fetching will be triggered separately or here
        }
      }
    } catch (e) {
      _error = 'Profile not found';
      print('Fetch profile error: $e');
    } finally {
      _isLoadingProfile = false;
      notifyListeners();
    }
  }

  Future<void> fetchUserContent(int userId) async {
    _isLoadingContent = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        _apiService.dio.get('/users/$userId/posts/'),
        _apiService.dio.get('/users/$userId/twists/'),
        _apiService.dio.get('/reels/user/$userId/'),
      ]);

      if (results[0].statusCode == 200) {
        final list = SafeParser.parseList(results[0].data);
        _userPosts = list.map((p) => Post.fromJson(p)).toList();
      }

      if (results[1].statusCode == 200) {
        final list = SafeParser.parseList(results[1].data);
        _userTwists = list.map((p) => Post.fromJson(p)).toList();
      }

      if (results[2].statusCode == 200) {
        final list = SafeParser.parseList(results[2].data);
        _userReels = list.map((r) => Reel.fromJson(r)).toList();
      }

      // Filter exclusive content
      _exclusiveContent = [
        ..._userPosts.where((p) => p.isExclusive),
        ..._userTwists.where((t) => t.isExclusive),
        ..._userReels.where((r) => r.isExclusive),
      ];

    } catch (e) {
      print('Fetch user content error: $e');
    } finally {
      _isLoadingContent = false;
      notifyListeners();
    }
  }

  void clearProfile() {
    _profileUser = null;
    _userPosts = [];
    _userTwists = [];
    _userReels = [];
    _exclusiveContent = [];
    _error = null;
    notifyListeners();
  }
}
