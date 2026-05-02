import 'package:flutter/material.dart';

class TierBadge extends StatelessWidget {
  final String tier;
  final double fontSize;

  const TierBadge({super.key, required this.tier, this.fontSize = 10});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label = tier.toUpperCase();

    switch (tier.toLowerCase()) {
      case 'elite':
        color = const Color(0xFFF59E0B); // Gold
        break;
      case 'pro':
        color = const Color(0xFF8B5CF6); // Purple
        break;
      default:
        color = const Color(0xFF10B981); // Green/Basic
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.5), width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
