import 'package:flutter/material.dart';
import '../screens/profile_screen.dart';
import '../screens/post_detail_screen.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/post_model.dart';
import 'glass_container.dart';
import 'tier_badge.dart';
import 'user_avatar.dart';
import 'comment_sheet.dart';
import 'twist_sheet.dart';
import '../providers/auth_provider.dart';
import '../providers/post_provider.dart';
import 'package:provider/provider.dart';

class PostCard extends StatefulWidget {
  final Post post;
  final VoidCallback onLike;

  const PostCard({super.key, required this.post, required this.onLike});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> with SingleTickerProviderStateMixin {
  bool _showBigHeart = false;
  late AnimationController _heartAnimationController;
  late Animation<double> _heartScaleAnimation;

  @override
  void initState() {
    super.initState();
    _heartAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _heartScaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.2).chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0).chain(CurveTween(curve: Curves.easeIn)),
        weight: 50,
      ),
    ]).animate(_heartAnimationController);
  }

  @override
  void dispose() {
    _heartAnimationController.dispose();
    super.dispose();
  }

  void _handleDoubleTap() {
    setState(() {
      _showBigHeart = true;
    });
    _heartAnimationController.forward(from: 0.0).then((_) {
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) {
          setState(() {
            _showBigHeart = false;
          });
        }
      });
    });
    if (!widget.post.isLiked) {
      widget.onLike();
    }
  }

  void _showComments() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CommentSheet(
        postId: widget.post.id,
        authorUsername: widget.post.author.username,
      ),
    );
  }

  void _showTwistSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => TwistSheet(originalPost: widget.post),
    );
  }

  void _handleSave() {
    Provider.of<PostProvider>(context, listen: false).toggleSave(widget.post.id);
  }

  void _handleFollow() async {
    await Provider.of<PostProvider>(context, listen: false).toggleFollow(widget.post.author.id);
  }

  void _navigateToProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProfileScreen(username: widget.post.author.username),
      ),
    );
  }

  void _navigateToDetail() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PostDetailScreen(postId: widget.post.id, initialPost: widget.post),
      ),
    );
  }

  void _deletePost() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: const Text('Delete Post?'),
        content: const Text('This action cannot be undone and the post will be permanently removed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await Provider.of<PostProvider>(context, listen: false).deletePost(widget.post.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Post deleted successfully')));
      }
    }
  }

  void _reportPost() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Report Post'),
        children: [
          'Spam',
          'Inappropriate Content',
          'Harassment',
          'False Information',
          'Other'
        ].map((e) => SimpleDialogOption(
          onPressed: () => Navigator.pop(context, e),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Text(e),
          ),
        )).toList(),
      ),
    );

    if (reason != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Reported for $reason. We will review this post.')),
      );
    }
  }


  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Repost Indicator (if twist)
          if (widget.post.originalPost != null)
            Padding(
              padding: const EdgeInsets.only(left: 16.0, top: 12.0, bottom: 4.0),
              child: Row(
                children: [
                  Icon(FontAwesomeIcons.repeat, size: 12, color: isDark ? Colors.white54 : Colors.black45),
                  const SizedBox(width: 8),
                  Text(
                    '${widget.post.author.username} twisted',
                    style: TextStyle(
                      color: isDark ? Colors.white54 : Colors.black45,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),

          // 1. Post Header
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
            child: Row(
              children: [
                GestureDetector(
                  onTap: _navigateToProfile,
                  child: UserAvatar(
                    radius: 18,
                    imageUrl: widget.post.originalPost != null 
                      ? widget.post.originalPost!.author.profilePicture 
                      : widget.post.author.profilePicture,
                    showBorder: true,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: _navigateToProfile,
                        child: Text(
                          widget.post.originalPost != null 
                            ? widget.post.originalPost!.author.username 
                            : widget.post.author.username,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: isDark ? Colors.white : Colors.black,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                      if (widget.post.author.isCreator || widget.post.isExclusive) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.verified, color: Colors.blue, size: 14),
                      ],
                      const SizedBox(width: 6),
                      Text(
                        '•',
                        style: TextStyle(color: isDark ? Colors.white38 : Colors.black38, fontSize: 12),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        timeago.format(widget.post.createdAt, locale: 'en_short'),
                        style: TextStyle(
                          color: isDark ? Colors.white54 : Colors.black54,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.more_horiz, color: isDark ? Colors.white : Colors.black87, size: 22),
                  onPressed: () {
                    // Show options
                  },
                ),
              ],
            ),
          ),

          // 2. Media
          if (widget.post.originalPost != null)
            _buildOriginalPost(widget.post.originalPost!, isDark)
          else
            _buildMainMedia(isDark),

          // 3. Actions Row (Instagram Style from reference)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(
              children: [
                // Like Button & Count
                _buildActionItem(
                  icon: widget.post.isLiked ? FontAwesomeIcons.solidHeart : FontAwesomeIcons.heart,
                  color: widget.post.isLiked ? Colors.red : (isDark ? Colors.white : Colors.black87),
                  count: widget.post.likesCount.toLocaleString(),
                  onTap: widget.onLike,
                ),
                
                // Comment Button & Count
                _buildActionItem(
                  icon: FontAwesomeIcons.comment,
                  color: isDark ? Colors.white : Colors.black87,
                  count: widget.post.commentsCount.toString(),
                  onTap: _showComments,
                ),

                // Twist Button & Count
                _buildActionItem(
                  icon: FontAwesomeIcons.repeat,
                  color: isDark ? Colors.white : Colors.black87,
                  count: widget.post.twistsCount.toString(),
                  onTap: _showTwistSheet,
                ),

                // Share Button
                IconButton(
                  icon: Icon(
                    FontAwesomeIcons.paperPlane,
                    color: isDark ? Colors.white : Colors.black87,
                    size: 20,
                  ),
                  onPressed: () {},
                ),

                const Spacer(),
                
                // Bookmark Button
                IconButton(
                  icon: Icon(
                    widget.post.isSaved ? FontAwesomeIcons.solidBookmark : FontAwesomeIcons.bookmark,
                    color: isDark ? Colors.white : Colors.black87,
                    size: 20,
                  ),
                  onPressed: _handleSave,
                ),
              ],
            ),
          ),

          // 4. Caption Section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.post.content != null && widget.post.content!.isNotEmpty)
                  RichText(
                    text: TextSpan(
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontSize: 14,
                        height: 1.3,
                      ),
                      children: [
                        TextSpan(
                          text: '${widget.post.originalPost != null ? widget.post.originalPost!.author.username : widget.post.author.username} ',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        ..._renderContentSpans(widget.post.content!),
                      ],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                
                const SizedBox(height: 6),
                
                // Quick comment input (Avatar + hint)
                GestureDetector(
                  onTap: _showComments,
                  child: Row(
                    children: [
                      UserAvatar(
                        radius: 11, 
                        imageUrl: Provider.of<AuthProvider>(context).user?.profilePicture
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Add a comment...',
                        style: TextStyle(
                          color: isDark ? Colors.white38 : Colors.black38,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required Color color,
    required String count,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 22),
            if (count != '0') ...[
              const SizedBox(width: 6),
              Text(
                count,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  List<InlineSpan> _renderContentSpans(String content) {
    final List<InlineSpan> spans = [];
    final words = content.split(' ');

    for (var word in words) {
      if (word.startsWith('#')) {
        spans.add(TextSpan(
          text: '$word ',
          style: const TextStyle(color: Color(0xFF00376B), fontWeight: FontWeight.w500),
        ));
      } else if (word.startsWith('@')) {
        spans.add(TextSpan(
          text: '$word ',
          style: const TextStyle(color: Color(0xFF00376B), fontWeight: FontWeight.w500),
        ));
      } else {
        spans.add(TextSpan(text: '$word '));
      }
    }
    return spans;
  }

  Widget _buildMainMedia(bool isDark) {
    return GestureDetector(
      onTap: _navigateToDetail,
      onDoubleTap: _handleDoubleTap,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (widget.post.hasAccess == false)
            _buildLockedState()
          else if (widget.post.mediaFile != null)
            AspectRatio(
              aspectRatio: 4 / 5,
              child: CachedNetworkImage(
                imageUrl: widget.post.mediaFile!,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: isDark ? Colors.grey[900] : Colors.grey[100],
                  child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                ),
                errorWidget: (context, url, error) => Container(
                  color: isDark ? Colors.grey[900] : Colors.grey[100],
                  child: const Center(child: Icon(Icons.error_outline, color: Colors.white24)),
                ),
              ),
            )
          else
            const SizedBox.shrink(),

          if (_showBigHeart)
            ScaleTransition(
              scale: _heartScaleAnimation,
              child: Icon(
                FontAwesomeIcons.solidHeart,
                color: Colors.white.withOpacity(0.9),
                size: 100,
                shadows: [
                  Shadow(color: Colors.black.withOpacity(0.3), blurRadius: 20),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOriginalPost(Post original, bool isDark) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PostDetailScreen(postId: original.id, initialPost: original),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  UserAvatar(radius: 10, imageUrl: original.author.profilePicture),
                  const SizedBox(width: 8),
                  Text(
                    original.author.username,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    timeago.format(original.createdAt, locale: 'en_short'),
                    style: const TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                ],
              ),
            ),
            if (original.content != null && original.content!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 10, right: 10, bottom: 10),
                child: Text(
                  original.content!,
                  style: const TextStyle(fontSize: 13),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (original.mediaFile != null)
              CachedNetworkImage(
                imageUrl: original.mediaFile!,
                width: double.infinity,
                height: 200,
                fit: BoxFit.cover,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLockedState() {
    return AspectRatio(
      aspectRatio: 1,
      child: Stack(
        children: [
          if (widget.post.mediaFile != null)
            CachedNetworkImage(
              imageUrl: widget.post.mediaFile!,
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
            ),
          GlassContainer(
            blur: 30,
            opacity: 0.6,
            borderRadius: 0,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.lock_outline, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Exclusive Content',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Subscribe to ${widget.post.author.username} to unlock',
                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: const Text('Subscribe Now', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension NumberFormatExtension on int {
  String toLocaleString() {
    if (this >= 1000000) {
      return '${(this / 1000000).toStringAsFixed(1)}M';
    } else if (this >= 1000) {
      return '${(this / 1000).toStringAsFixed(1)}K';
    }
    return toString();
  }
}
