import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../config/api_config.dart';
import '../storage/token_store.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient({
    required ApiConfig config,
    required TokenStore tokenStore,
    Duration timeout = const Duration(seconds: 8),
  })  : _config = config,
        _tokenStore = tokenStore,
        _timeout = timeout;

  final ApiConfig _config;
  final TokenStore _tokenStore;
  final Duration _timeout;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 6);

  Future<Map<String, dynamic>> getJson(String path) async {
    return _sendJson('GET', path);
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) {
    return _sendJson('POST', path, body: body);
  }

  Future<void> healthCheck() async {
    await getJson('/health');
  }

  Future<Map<String, dynamic>> _sendJson(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    if (!_config.hasBaseUrl) {
      throw const ApiException('Please enter a deployed API base URL.');
    }

    final uri = Uri.parse('${_config.baseUrl}$path');
    HttpClientRequest request;
    try {
      request = await _client.openUrl(method, uri).timeout(_timeout);
    } on TimeoutException {
      throw const ApiException('API connection timed out. Check your server URL.');
    } on SocketException {
      throw const ApiException('Network request failed. API is not reachable from this device.');
    } on FormatException {
      throw const ApiException('Invalid API URL.');
    }

    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');

    final token = await _tokenStore.readToken();
    if (token != null && token.isNotEmpty) {
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
    }

    if (body != null) {
      request.write(jsonEncode(body));
    }

    final response = await request.close().timeout(_timeout);
    final responseBody = await response.transform(utf8.decoder).join();

    if (response.statusCode == HttpStatus.unauthorized) {
      await _tokenStore.clearToken();
    }

    Map<String, dynamic> json;
    try {
      json = responseBody.isEmpty ? <String, dynamic>{} : jsonDecode(responseBody) as Map<String, dynamic>;
    } on FormatException {
      throw ApiException('API returned an invalid response.', statusCode: response.statusCode);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        (json['error'] ?? json['message'] ?? 'API request failed.').toString(),
        statusCode: response.statusCode,
      );
    }

    return json;
  }
}
