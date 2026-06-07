import '../storage/token_store.dart';

class ApiConfig {
  ApiConfig({String? defaultBaseUrl})
      : _defaultBaseUrl = _normalize(
          defaultBaseUrl ?? const String.fromEnvironment('EMS_API_BASE_URL'),
        );

  final String _defaultBaseUrl;
  String? _runtimeBaseUrl;

  String get baseUrl => _runtimeBaseUrl ?? _defaultBaseUrl;

  bool get hasBaseUrl => baseUrl.isNotEmpty;

  Future<void> load(TokenStore store) async {
    final saved = await store.readApiBaseUrl();
    if (saved != null && saved.trim().isNotEmpty) {
      _runtimeBaseUrl = _normalize(saved);
    }
  }

  Future<void> setBaseUrl(String value, TokenStore store) async {
    _runtimeBaseUrl = _normalize(value);
    await store.saveApiBaseUrl(_runtimeBaseUrl ?? '');
  }

  static String _normalize(String value) {
    var clean = value.trim();
    if (clean.isEmpty) return '';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://$clean';
    }
    return clean.replaceAll(RegExp(r'/+$'), '');
  }
}
