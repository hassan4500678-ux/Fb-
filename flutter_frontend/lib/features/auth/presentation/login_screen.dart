import 'package:flutter/material.dart';

import '../../../core/config/api_config.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/neon_card.dart';
import '../data/auth_repository.dart';
import '../models/auth_user.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.apiConfig,
    required this.authRepository,
    required this.onLogin,
    super.key,
  });

  final ApiConfig apiConfig;
  final AuthRepository authRepository;
  final ValueChanged<AuthUser> onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'hassanullahkhan989@gmail.com');
  final _passwordController = TextEditingController();
  late final TextEditingController _apiController;
  bool _loading = false;
  bool _hidePassword = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _apiController = TextEditingController(text: widget.apiConfig.baseUrl);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _apiController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await widget.authRepository.setApiBaseUrl(widget.apiConfig, _apiController.text);
      final user = await widget.authRepository.login(
        email: _emailController.text,
        password: _passwordController.text,
      );
      if (!mounted) return;
      widget.onLogin(user);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } on FormatException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Unable to login. Please check API URL and internet connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: NeonBackdrop(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 380;
              final horizontalPadding = isCompact ? 16.0 : 24.0;

              return SingleChildScrollView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.fromLTRB(
                  horizontalPadding,
                  18,
                  horizontalPadding,
                  bottomInset + 24,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight - 42),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 480),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _Header(isCompact: isCompact),
                          const SizedBox(height: 20),
                          NeonCard(
                            padding: EdgeInsets.all(isCompact ? 16 : 22),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Secure Login',
                                    textAlign: TextAlign.center,
                                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                          fontWeight: FontWeight.w800,
                                        ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Use a deployed API URL. Localhost does not work on physical Android devices.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: AppColors.grayText, fontSize: 12),
                                  ),
                                  const SizedBox(height: 18),
                                  TextFormField(
                                    controller: _apiController,
                                    keyboardType: TextInputType.url,
                                    textInputAction: TextInputAction.next,
                                    decoration: const InputDecoration(
                                      labelText: 'API Base URL',
                                      hintText: 'https://api.your-domain.com',
                                      prefixIcon: Icon(Icons.cloud_outlined),
                                    ),
                                    validator: (value) {
                                      final clean = value?.trim() ?? '';
                                      if (clean.isEmpty) return 'API base URL is required.';
                                      if (clean.contains('localhost') || clean.contains('127.0.0.1')) {
                                        return 'Use a deployed URL, not localhost.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 12),
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    autofillHints: const [AutofillHints.email],
                                    decoration: const InputDecoration(
                                      labelText: 'Email',
                                      prefixIcon: Icon(Icons.email_outlined),
                                    ),
                                    validator: (value) {
                                      final clean = value?.trim() ?? '';
                                      if (clean.isEmpty) return 'Email is required.';
                                      if (!clean.contains('@')) return 'Enter a valid email.';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 12),
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: _hidePassword,
                                    textInputAction: TextInputAction.done,
                                    onFieldSubmitted: (_) {
                                      if (!_loading) _login();
                                    },
                                    autofillHints: const [AutofillHints.password],
                                    decoration: InputDecoration(
                                      labelText: 'Password',
                                      prefixIcon: const Icon(Icons.lock_outline),
                                      suffixIcon: IconButton(
                                        onPressed: () => setState(() => _hidePassword = !_hidePassword),
                                        icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                                      ),
                                    ),
                                    validator: (value) {
                                      if ((value ?? '').isEmpty) return 'Password is required.';
                                      return null;
                                    },
                                  ),
                                  if (_error != null) ...[
                                    const SizedBox(height: 14),
                                    Text(
                                      _error!,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: Color(0xFFFF8A9A), fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                  const SizedBox(height: 18),
                                  ElevatedButton(
                                    onPressed: _loading ? null : _login,
                                    child: _loading
                                        ? const SizedBox(
                                            height: 22,
                                            width: 22,
                                            child: CircularProgressIndicator(strokeWidth: 2.4),
                                          )
                                        : const Text('Login'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.isCompact});

  final bool isCompact;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: isCompact ? 70 : 82,
          width: isCompact ? 70 : 82,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(colors: [AppColors.neonBlue, AppColors.purple]),
            boxShadow: [
              BoxShadow(
                color: AppColors.cyanGlow.withOpacity(0.35),
                blurRadius: 30,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Center(
            child: Text(
              'FB',
              style: TextStyle(color: AppColors.background, fontSize: 24, fontWeight: FontWeight.w900),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Faizan & Brothers EMS',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
                letterSpacing: -0.4,
              ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Production Flutter Android App',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.grayText),
        ),
      ],
    );
  }
}
