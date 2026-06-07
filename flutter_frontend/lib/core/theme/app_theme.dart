import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFF050B1F);
  static const secondary = Color(0xFF08142E);
  static const card = Color(0xFF0B1736);
  static const neonBlue = Color(0xFF00C2FF);
  static const cyanGlow = Color(0xFF00E5FF);
  static const purple = Color(0xFF7B61FF);
  static const green = Color(0xFF00D26A);
  static const orange = Color(0xFFFFB020);
  static const grayText = Color(0xFFA7B0C0);
}

class AppTheme {
  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.neonBlue,
        secondary: AppColors.cyanGlow,
        surface: AppColors.card,
        error: Color(0xFFFF5B6E),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.secondary.withOpacity(0.9),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: const TextStyle(color: AppColors.grayText),
        labelStyle: const TextStyle(color: AppColors.grayText),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0x553DE7FF)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0x553DE7FF)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.cyanGlow, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: Color(0xFFFF5B6E)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.neonBlue,
          foregroundColor: AppColors.background,
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
    );
  }
}
