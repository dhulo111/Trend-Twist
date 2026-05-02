import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:dio/dio.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/token_manager.dart';
import '../services/notification_service.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _errorMessage;
  Map<String, dynamic>? _blockInfo;
  final ApiService _apiService = ApiService();
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: '577064429439-bhmcm2f7sj08f1b0n3sgr7tj45cdha7j.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
  );

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get blockInfo => _blockInfo;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _loadUser();
  }

  Future<void> _loadUser() async {
    _isLoading = true;
    notifyListeners();
    
    Map<String, dynamic>? userData = await TokenManager.getUserData();
    if (userData != null) {
      _user = User.fromJson(userData);
      _token = await TokenManager.getAccessToken();
    }
    
    _isInitializing = false;
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    _blockInfo = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/auth/login/password/', data: {
        'username_or_email': username,
        'password': password,
      });

      if (response.statusCode == 200) {
        String access = response.data['access'];
        String refresh = response.data['refresh'];
        await TokenManager.saveTokens(access, refresh);
        _token = access;
        
        if (response.data['user'] != null) {
          _user = User.fromJson(response.data['user']);
        } else {
          final profileRes = await _apiService.dio.get('/user/');
          _user = User.fromJson(profileRes.data);
        }
        await TokenManager.saveUserData(_user!.toJson());
        
        // Register FCM token now that auth headers are set
        NotificationService.registerTokenAfterLogin();
        
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 && e.response?.data?['error'] == 'Account Blocked') {
        _blockInfo = e.response?.data;
      }
      _errorMessage = _parseError(e);
      print('Login error: $_errorMessage');
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
      print('Login error: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> checkUserExists(String usernameOrEmail) async {
    _isLoading = true;
    _errorMessage = null;
    _blockInfo = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/auth/check-user/', data: {
        'username_or_email': usernameOrEmail,
      });

      if (response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return response.data['exists'] == true;
      }
    } on DioException catch (e) {
      _errorMessage = _parseError(e);
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> sendResetOTP(String usernameOrEmail) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/auth/forgot-password/send-otp/', data: {
        'username_or_email': usernameOrEmail,
      });

      if (response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = _parseError(e);
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> resetPassword(String usernameOrEmail, String otp, String newPassword) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/auth/forgot-password/reset/', data: {
        'username_or_email': usernameOrEmail,
        'otp': otp,
        'new_password': newPassword,
      });

      if (response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = _parseError(e);
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> loginWithGoogle() async {
    _isLoading = true;
    notifyListeners();

    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final response = await _apiService.dio.post('/auth/google/', data: {
        'token': idToken,
      });

      if (response.statusCode == 200) {
        String access = response.data['access'];
        String refresh = response.data['refresh'];
        await TokenManager.saveTokens(access, refresh);
        _token = access;
        
        _user = User.fromJson(response.data['user']);
        await TokenManager.saveUserData(_user!.toJson());
        
        // Register FCM token now that auth headers are set
        NotificationService.registerTokenAfterLogin();
        
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Google login error: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> sendOTP(String email) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/auth/register/send-otp/', data: {
        'email': email,
      });

      if (response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = _parseError(e);
      print('Send OTP error: $_errorMessage');
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
      print('Send OTP error: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String email,
    required String otp,
    required String username,
    required String firstName,
    String? lastName,
    String? phoneNumber,
    String? gender,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post('/auth/register/password/', data: {
        'email': email,
        'otp': otp,
        'username': username,
        'first_name': firstName,
        'last_name': lastName,
        'phone_number': phoneNumber,
        'gender': gender,
        'password': password,
      });

      if (response.statusCode == 201) {
        String access = response.data['access'];
        String refresh = response.data['refresh'];
        await TokenManager.saveTokens(access, refresh);
        _token = access;
        
        _user = User.fromJson(response.data['user']);
        await TokenManager.saveUserData(_user!.toJson());
        
        // Register FCM token now that auth headers are set
        NotificationService.registerTokenAfterLogin();
        
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = _parseError(e);
      print('Register error: $_errorMessage');
    } catch (e) {
      _errorMessage = 'An unexpected error occurred.';
      print('Register error: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  String _parseError(DioException e) {
    if (e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map) {
        if (data.containsKey('error')) return data['error'].toString();
        if (data.containsKey('detail')) return data['detail'].toString();
        if (data.isNotEmpty) {
          final firstKey = data.keys.first;
          final firstVal = data[firstKey];
          String msg = firstVal is List ? firstVal.first.toString() : firstVal.toString();
          if (firstKey != 'error' && firstKey != 'detail') {
            return '$firstKey: $msg';
          }
          return msg;
        }
      }
      return data.toString();
    }
    return e.message ?? 'Connection error';
  }

  Future<void> logout() async {
    await TokenManager.clearTokens();
    await _googleSignIn.signOut();
    _user = null;
    _token = null;
    notifyListeners();
  }

  Future<bool> toggleFollow(int userId) async {
    try {
      final response = await _apiService.dio.post('/user/toggle-follow/', data: {
        'user_id': userId,
      });
      if (response.statusCode == 200) {
        // We could update the user model if it had a following list, 
        // but usually it's handled per-post or per-profile.
        return true;
      }
    } catch (e) {
      print('Toggle follow error: $e');
    }
    return false;
  }

  Future<bool> toggleSave(String type, int id) async {
    try {
      final response = await _apiService.dio.post('/user/toggle-save/', data: {
        'type': type,
        'id': id,
      });
      return response.statusCode == 200;
    } catch (e) {
      print('Toggle save error: $e');
    }
    return false;
  }
}
