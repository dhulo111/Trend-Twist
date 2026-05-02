import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/twist_model.dart';
import '../models/post_model.dart';
import 'user_avatar.dart';
import 'post_card.dart'; // Reuse PostCard styles
import '../screens/profile_screen.dart';
import '../screens/post_detail_screen.dart';

class TwistCard extends StatelessWidget {
  final Twist twist;

  const TwistCard({super.key, required this.twist});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              GestureDetector(
                onTap: () => _navigateToProfile(context, twist.author.username),
                child: UserAvatar(radius: 18, imageUrl: twist.author.profilePicture),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () => _navigateToProfile(context, twist.author.username),
                          child: Text(
                            twist.author.username,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          timeago.format(twist.createdAt, locale: 'en_short'),
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.more_horiz, size: 20, color: Colors.grey),
            ],
          ),
          
          const SizedBox(height: 10),

          // Content
          if (twist.content != null && twist.content!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                twist.content!,
                style: const TextStyle(fontSize: 15, height: 1.4),
              ),
            ),

          // Original Post Preview (if any)
          if (twist.originalPostData != null)
             _buildOriginalPostPreview(context, twist.originalPostData!, isDark),

          const SizedBox(height: 12),

          // Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildAction(FontAwesomeIcons.heart, twist.likesCount.toString(), Colors.grey),
              _buildAction(FontAwesomeIcons.comment, twist.commentsCount.toString(), Colors.grey),
              _buildAction(FontAwesomeIcons.repeat, twist.retwistsCount.toString(), Colors.green),
              _buildAction(FontAwesomeIcons.paperPlane, '', Colors.grey),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOriginalPostPreview(BuildContext context, Post post, bool isDark) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PostDetailScreen(postId: post.id, initialPost: post),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (post.mediaFile != null)
              Image.network(
                post.mediaFile!,
                width: double.infinity,
                height: 200,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  height: 100,
                  color: Colors.grey[900],
                  child: const Center(child: Icon(Icons.error_outline)),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      UserAvatar(radius: 10, imageUrl: post.author.profilePicture),
                      const SizedBox(width: 8),
                      Text(post.author.username, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  if (post.content != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        post.content!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, color: Colors.grey),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAction(IconData icon, String label, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        if (label.isNotEmpty && label != '0') ...[
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ],
    );
  }

  void _navigateToProfile(BuildContext context, String username) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProfileScreen(username: username),
      ),
    );
  }
}
