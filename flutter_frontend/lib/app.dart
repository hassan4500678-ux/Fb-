import 'package:flutter/material.dart';

import 'core/config/api_config.dart';
import 'core/network/api_client.dart';
import 'core/storage/token_store.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/models/auth_user.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/dashboard/presentation/dashboard_screen.dart';

class FaizanBrothersEmsApp extends StatefulWidget {
  const FaizanBrothersEmsApp({super.key});

  @override
  State<FaizanBrothersEmsApp> createState() => _FaizanBrothersEmsAppState();
}

class _FaizanBrothersEmsAppState extends State<FaizanBrothersEmsApp> {
  late final TokenStore _tokenStore;
  late final ApiConfig _apiConfig;
  late final ApiClient _apiClient;
  late final AuthRepository _authRepository;
  AuthUser? _user;
  bool _booting = true;

  @override
  void initState() {
    super.initState();
    _tokenStore = TokenStore();
    _apiConfig = ApiConfig();
    _apiClient = ApiClient(config: _apiConfig, tokenStore: _tokenStore);
    _authRepository = AuthRepository(apiClient: _apiClient, tokenStore: _tokenStore);
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    await _apiConfig.load(_tokenStore);
    final user = await _authRepository.restoreSession();
    if (!mounted) return;
    setState(() {
      _user = user;
      _booting = false;
    });
  }

  Future<void> _handleLogin(AuthUser user) async {
    setState(() => _user = user);
  }

  Future<void> _handleLogout() async {
    await _authRepository.logout();
    if (!mounted) return;
    setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Faizan & Brothers EMS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: _booting
          ? const _BootScreen()
          : _user == null
              ? LoginScreen(
                  apiConfig: _apiConfig,
                  authRepository: _authRepository,
                  onLogin: _handleLogin,
                )
              : DashboardScreen(user: _user!, onLogout: _handleLogout),
    );
  }
}

class _BootScreen extends StatelessWidget {
  const _BootScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
