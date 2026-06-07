import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/neon_card.dart';
import '../../auth/models/auth_user.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    required this.user,
    required this.onLogout,
    super.key,
  });

  final AuthUser user;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: NeonBackdrop(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 10),
                sliver: SliverToBoxAdapter(
                  child: _Header(user: user, onLogout: onLogout),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
                sliver: SliverGrid.count(
                  crossAxisCount: MediaQuery.sizeOf(context).width > 560 ? 3 : 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.2,
                  children: const [
                    _MetricCard(title: 'Attendance', value: 'Live', color: AppColors.green),
                    _MetricCard(title: 'KPI', value: 'Ready', color: AppColors.neonBlue),
                    _MetricCard(title: 'Wallet', value: 'Secure', color: AppColors.cyanGlow),
                    _MetricCard(title: 'Payroll', value: 'Linked', color: AppColors.orange),
                    _MetricCard(title: 'Reports', value: 'PDF/XLSX', color: AppColors.purple),
                    _MetricCard(title: 'Leaderboard', value: 'Ranks', color: AppColors.green),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.user, required this.onLogout});

  final AuthUser user;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return NeonCard(
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: AppColors.neonBlue,
            child: Text(
              _initials(user.name),
              style: const TextStyle(
                color: AppColors.background,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome, ${user.name.isEmpty ? 'User' : user.name}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  '${user.role.toUpperCase()}${user.category == null ? '' : ' • ${user.category}'}${user.badge == null ? '' : ' • ${user.badge}'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.grayText, fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: onLogout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
    if (parts.isEmpty) return 'FB';
    final first = parts.first.substring(0, 1);
    final second = parts.length > 1 ? parts[1].substring(0, 1) : '';
    return '$first$second'.toUpperCase();
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.color,
  });

  final String title;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return NeonCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(Icons.auto_graph_rounded, color: color),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: AppColors.grayText, fontSize: 12)),
              const SizedBox(height: 4),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
