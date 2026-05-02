import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Light Mode Colors
  static const Color lightBgPrimary = Color(0xFFF7F9FB);
  static const Color lightBgSecondary = Color(0xFFFFFFFF);
  static const Color lightBgAccent = Color(0xFFF8F7FF);
  static const Color lightTextPrimary = Color(0xFF1A1D21);
  static const Color lightTextSecondary = Color(0xFF5F6672);
  static const Color lightAccent = Color(0xFF7C3AED); // Vibrant Purple
  static const Color lightBorder = Color(0xFFE5E7EB);

  // Dark Mode Colors
  static const Color darkBgPrimary = Color(0xFF0F111A);
  static const Color darkBgSecondary = Color(0xFF1A1D26);
  static const Color darkBgAccent = Color(0xFF262933);
  static const Color darkTextPrimary = Color(0xFFF9FAFB);
  static const Color darkTextSecondary = Color(0xFF9CA3AF);
  static const Color darkAccent = Color(0xFFA78BFA); // Bright Neon Purple
  static const Color darkBorder = Color(0xFF262933);

  static ThemeData lightTheme = ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: lightBgPrimary,
    primaryColor: lightAccent,
    colorScheme: ColorScheme.light(
      primary: lightAccent,
      secondary: lightAccent,
      surface: lightBgSecondary,
      background: lightBgPrimary,
      onPrimary: Colors.white,
      onSurface: lightTextPrimary,
    ),
    textTheme: GoogleFonts.outfitTextTheme().apply(
      bodyColor: lightTextPrimary,
      displayColor: lightTextPrimary,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: lightBgSecondary.withOpacity(0.8),
      elevation: 0,
      centerTitle: true,
      iconTheme: IconThemeData(color: lightTextPrimary),
      titleTextStyle: GoogleFonts.outfit(
        color: lightTextPrimary,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
    ),
    cardTheme: CardThemeData(
      color: lightBgSecondary,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    dividerTheme: DividerThemeData(color: lightBorder, thickness: 1),
  );

  static ThemeData darkTheme = ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: darkBgPrimary,
    primaryColor: darkAccent,
    colorScheme: ColorScheme.dark(
      primary: darkAccent,
      secondary: darkAccent,
      surface: darkBgSecondary,
      background: darkBgPrimary,
      onPrimary: Colors.black,
      onSurface: darkTextPrimary,
    ),
    textTheme: GoogleFonts.outfitTextTheme().apply(
      bodyColor: darkTextPrimary,
      displayColor: darkTextPrimary,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: darkBgSecondary.withOpacity(0.8),
      elevation: 0,
      centerTitle: true,
      iconTheme: IconThemeData(color: darkTextPrimary),
      titleTextStyle: GoogleFonts.outfit(
        color: darkTextPrimary,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
    ),
    cardTheme: CardThemeData(
      color: darkBgSecondary,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    dividerTheme: DividerThemeData(color: darkBorder, thickness: 1),
  );
}
