import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/search_provider.dart';
import '../widgets/post_card.dart';
import '../widgets/twist_card.dart';
import '../models/post_model.dart';
import '../models/twist_model.dart';
import '../providers/post_provider.dart';

class TrendingFeedScreen extends StatefulWidget {
  final String hashtag;

  const TrendingFeedScreen({super.key, required this.hashtag});

  @override
  State<TrendingFeedScreen> createState() => _TrendingFeedScreenState();
}

class _TrendingFeedScreenState extends State<TrendingFeedScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<SearchProvider>(context, listen: false).fetchTrendingContent(widget.hashtag);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('#${widget.hashtag}', style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Consumer<SearchProvider>(
        builder: (context, search, child) {
          if (search.isLoading && search.trendingPosts.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (search.trendingPosts.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.tag, size: 64, color: Colors.grey[600]),
                  const SizedBox(height: 16),
                  Text(
                    'No posts found for #${widget.hashtag}',
                    style: TextStyle(color: Colors.grey[400], fontSize: 18),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => search.fetchTrendingContent(widget.hashtag),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: search.trendingPosts.length,
              itemBuilder: (context, index) {
                final item = search.trendingPosts[index];
                if (item is Post) {
                  return PostCard(
                    post: item,
                    onLike: () => Provider.of<PostProvider>(context, listen: false).toggleLike(item.id),
                  );
                } else if (item is Twist) {
                  return TwistCard(twist: item);
                }
                return const SizedBox.shrink();
              },
            ),
          );
        },
      ),
    );
  }
}
