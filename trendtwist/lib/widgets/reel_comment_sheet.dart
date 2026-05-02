import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/comment_model.dart';
import '../providers/reel_provider.dart';
import '../providers/auth_provider.dart';
import 'user_avatar.dart';
import 'package:timeago/timeago.dart' as timeago;

class ReelCommentSheet extends StatefulWidget {
  final int reelId;

  const ReelCommentSheet({super.key, required this.reelId});

  @override
  State<ReelCommentSheet> createState() => _ReelCommentSheetState();
}

class _ReelCommentSheetState extends State<ReelCommentSheet> {
  final TextEditingController _commentController = TextEditingController();
  List<Comment> _comments = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  Future<void> _loadComments() async {
    final comments = await Provider.of<ReelProvider>(context, listen: false).fetchComments(widget.reelId);
    if (mounted) {
      setState(() {
        _comments = comments;
        _isLoading = false;
      });
    }
  }

  void _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUser = authProvider.user;
    if (currentUser == null) return;

    // Optimistic Comment
    final optimisticComment = Comment(
      id: -1, // Temporary ID
      text: text,
      createdAt: DateTime.now(),
      author: currentUser,
    );

    setState(() {
      _comments.insert(0, optimisticComment);
    });

    _commentController.clear();

    final success = await Provider.of<ReelProvider>(context, listen: false).addComment(widget.reelId, text);
    
    if (success) {
      // Re-load to get real ID and synced data
      _loadComments();
    } else if (mounted) {
      // Revert on failure
      setState(() {
        _comments.removeWhere((c) => c.id == -1);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to post comment. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF121212) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(vertical: 15),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 15),
                const Text(
                  'Comments',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
          ),
          
          const Divider(height: 1),
          
          // Comments List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _comments.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.chat_bubble_outline, size: 60, color: isDark ? Colors.white24 : Colors.black12),
                            const SizedBox(height: 10),
                            const Text('No comments yet', style: TextStyle(color: Colors.grey)),
                            const Text('Be the first to comment!', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(15),
                        itemCount: _comments.length,
                        itemBuilder: (context, index) {
                          final comment = _comments[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 20.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                UserAvatar(radius: 18, imageUrl: comment.author.profilePicture),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            comment.author.username,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            timeago.format(comment.createdAt, locale: 'en_short'),
                                            style: const TextStyle(color: Colors.grey, fontSize: 11),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        comment.text,
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () {},
                                  icon: const Icon(Icons.favorite_border, size: 16, color: Colors.grey),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
          
          // Input
          Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 15,
              top: 10,
              left: 15,
              right: 15,
            ),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05))),
              color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
            ),
            child: Row(
              children: [
                Consumer<AuthProvider>(
                  builder: (context, auth, _) => UserAvatar(
                    radius: 18,
                    imageUrl: auth.user?.profilePicture,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: const InputDecoration(
                      hintText: 'Add a comment...',
                      border: InputBorder.none,
                      hintStyle: TextStyle(fontSize: 14),
                    ),
                    onSubmitted: (_) => _submitComment(),
                  ),
                ),
                TextButton(
                  onPressed: _submitComment,
                  child: const Text('Post', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
