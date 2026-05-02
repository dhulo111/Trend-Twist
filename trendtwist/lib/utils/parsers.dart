import '../models/user_model.dart';
import '../config/constants.dart';

class SafeParser {
  static User parseUser(dynamic data) {
    if (data is Map<String, dynamic>) {
      return User.fromJson(data);
    } else if (data is int) {
      return User(id: data, username: 'User $data', email: '');
    } else {
      return User(id: 0, username: 'Unknown', email: '');
    }
  }

  static DateTime parseDateTime(dynamic data) {
    if (data == null || data == '') {
      return DateTime.now();
    }
    try {
      return DateTime.parse(data.toString());
    } catch (e) {
      return DateTime.now();
    }
  }

  static List<dynamic> parseList(dynamic data) {
    if (data is List) {
      return data;
    } else if (data is Map) {
      if (data.containsKey('results')) return data['results'] as List;
      if (data.containsKey('data')) return data['data'] as List;
      if (data.containsKey('items')) return data['items'] as List;
      if (data.containsKey('reels')) return data['reels'] as List;
      if (data.containsKey('posts')) return data['posts'] as List;
    }
    return [];
  }

  static bool parseBool(dynamic data, {bool defaultValue = false}) {
    if (data is bool) {
      return data;
    }
    if (data == null) {
      return defaultValue;
    }
    if (data is int) {
      return data == 1;
    }
    if (data is String) {
      return data.toLowerCase() == 'true';
    }
    return defaultValue;
  }

  static String normalizeUrl(dynamic url) {
    if (url == null || url == '') return '';
    String urlStr = url.toString();
    if (urlStr.startsWith('http')) return urlStr;
    if (urlStr.startsWith('/media/')) return '${AppConfig.baseUrl}$urlStr';
    if (!urlStr.startsWith('/')) return '${AppConfig.baseUrl}/$urlStr';
    return '${AppConfig.baseUrl}$urlStr';
  }
}
