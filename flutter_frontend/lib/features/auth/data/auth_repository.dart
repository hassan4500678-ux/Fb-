import '../../../core/config/api_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/token_store.dart';
import '../models/auth_user.dart';

class AuthRepository {
  AuthRepository({
    required ApiClient apiClient,
    required TokenStore tokenStore,
  })  : _apiClient = apiClient,
        _tokenStore = tokenStore;

  final ApiClient _apiClient;
  final TokenStore _tokenStore;

  Future<void> setApiBaseUrl(ApiConfig config, String value) {
    return config.setBaseUrl(value, _tokenStore);
  }

  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    await _apiClient.healthCheck();
    final json = await _apiClient.postJson('/api/auth/login', {
      'email': email.trim(),
      'password': password,
    });

    final token = (json['token'] ?? '').toString();
    final userJson = json['user'] as Map<String, dynamic>?;
    if (token.isEmpty || userJson == null) {
      throw const FormatException('Login response did not include token and user.');
    }

    final user = AuthUser.fromJson(userJson);
    await _tokenStore.saveToken(token);
    await _tokenStore.saveUserJson(user.encode());
    return user;
  }

  Future<AuthUser?> restoreSession() async {
    final token = await _tokenStore.readToken();
    if (token == null || token.isEmpty) return null;

    try {
      final json = await _apiClient.getJson('/api/me');
      final userJson = json['user'] as Map<String, dynamic>?;
      if (userJson == null) return AuthUser.decode(await _tokenStore.readUserJson());
      final user = AuthUser.fromJson(userJson);
      await _tokenStore.saveUserJson(user.encode());
      return user;
    } catch (_) {
      await _tokenStore.clearToken();
      return null;
    }
  }

  Future<void> logout() => _tokenStore.clearAll();
}
