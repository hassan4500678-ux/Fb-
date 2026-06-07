import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class NeonCard extends StatelessWidget {
  const NeonCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.card.withOpacity(0.86),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.cyanGlow.withOpacity(0.28)),
        boxShadow: [
          BoxShadow(
            color: AppColors.neonBlue.withOpacity(0.14),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: child,
    );
  }
}

class NeonBackdrop extends StatelessWidget {
  const NeonBackdrop({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.1,
          colors: [Color(0x553DE7FF), AppColors.background],
        ),
      ),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xAA08142E), AppColors.background],
          ),
        ),
        child: child,
      ),
    );
  }
}
