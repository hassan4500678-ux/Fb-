import 'package:flutter/services.dart';

class TokenStore {
  static const _channel = MethodChannel('faizan_brothers_ems/secure_store');
  static const _tokenKey = 'jwt_token';
  static const _apiBaseUrlKey = 'api_base_url';
  static const _userKey = 'auth_user_json';

  Future<String?> readToken() => _read(_tokenKey);

  Future<void> saveToken(String token) => _write(_tokenKey, token);

  Future<void> clearToken() => _delete(_tokenKey);

  Future<String?> readApiBaseUrl() => _read(_apiBaseUrlKey);

  Future<void> saveApiBaseUrl(String value) => _write(_apiBaseUrlKey, value);

  Future<String?> readUserJson() => _read(_userKey);

  Future<void> saveUserJson(String value) => _write(_userKey, value);

  Future<void> clearAll() => _channel.invokeMethod<void>('clear');

  Future<String?> _read(String key) async {
    return _channel.invokeMethod<String>('read', {'key': key});
  }

  Future<void> _write(String key, String value) async {
    await _channel.invokeMethod<bool>('write', {'key': key, 'value': value});
  }

  Future<void> _delete(String key) async {
    await _channel.invokeMethod<bool>('delete', {'key': key});
  }
}
