import 'package:dio/dio.dart';
import '../config/constants.dart';
import 'token_manager.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiUrl,
    connectTimeout: const Duration(seconds: 60),
    receiveTimeout: const Duration(seconds: 60),
  ));

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        String? token = await TokenManager.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          // Token expired, try to refresh
          String? refreshToken = await TokenManager.getRefreshToken();
          if (refreshToken != null) {
            try {
              final response = await Dio().post(
                '${AppConfig.apiUrl}/token/refresh/',
                data: {'refresh': refreshToken},
              );
              if (response.statusCode == 200) {
                String newAccess = response.data['access'];
                await TokenManager.saveTokens(newAccess, refreshToken);
                
                // Retry the original request
                e.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
                final cloneReq = await _dio.request(
                  e.requestOptions.path,
                  options: Options(
                    method: e.requestOptions.method,
                    headers: e.requestOptions.headers,
                  ),
                  data: e.requestOptions.data,
                  queryParameters: e.requestOptions.queryParameters,
                );
                return handler.resolve(cloneReq);
              }
            } catch (err) {
              await TokenManager.clearTokens();
              // Redirect to login could be handled by a provider or event bus
            }
          }
        }
        return handler.next(e);
      },
    ));
  }

  Dio get dio => _dio;
}
