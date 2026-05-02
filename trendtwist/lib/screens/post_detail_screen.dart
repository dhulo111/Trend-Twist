import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/post_model.dart';
import '../providers/post_provider.dart';
import '../widgets/post_card.dart';

class PostDetailScreen extends StatelessWidget {
  final int postId;
  final Post? initialPost;

  const PostDetailScreen({super.key, required this.postId, this.initialPost});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
      ),
      body: FutureBuilder<Post?>(
        future: initialPost != null 
          ? Future.value(initialPost) 
          : Provider.of<PostProvider>(context, listen: false).fetchPostById(postId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          
          final post = snapshot.data;
          if (post == null) {
            return const Center(child: Text('Post not found'));
          }
          
          return SingleChildScrollView(
            child: PostCard(
              post: post,
              onLike: () => Provider.of<PostProvider>(context, listen: false).toggleLike(post.id),
            ),
          );
        },
      ),
    );
  }
}
