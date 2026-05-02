import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class UserAvatar extends StatelessWidget {
  final String? imageUrl;
  final double radius;
  final bool showBorder;

  const UserAvatar({
    super.key,
    this.imageUrl,
    this.radius = 20,
    this.showBorder = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget avatar = CircleAvatar(
      radius: radius,
      backgroundColor: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
      child: imageUrl == null || imageUrl!.isEmpty
          ? Icon(Icons.person, size: radius * 1.2, color: isDark ? Colors.grey : Colors.black45)
          : CachedNetworkImage(
              imageUrl: imageUrl!,
              imageBuilder: (context, imageProvider) => Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  image: DecorationImage(
                    image: imageProvider,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              placeholder: (context, url) => Center(
                child: SizedBox(
                  width: radius * 0.5,
                  height: radius * 0.5,
                  child: const CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
              errorWidget: (context, url, error) => Icon(
                Icons.person,
                size: radius * 1.2,
                color: isDark ? Colors.grey : Colors.black45,
              ),
            ),
    );

    if (showBorder) {
      return Container(
        padding: const EdgeInsets.all(2.0),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: [Color(0xFFFBBF24), Color(0xFFEC4899), Color(0xFF8B5CF6)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Theme.of(context).scaffoldBackgroundColor,
          ),
          child: avatar,
        ),
      );
    }

    return avatar;
  }
}
