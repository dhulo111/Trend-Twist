import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/post_provider.dart';
import '../providers/theme_provider.dart';
import '../widgets/post_card.dart';
import '../widgets/story_circle.dart';
import 'story_view_screen.dart';
import 'stranger_talk_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<PostProvider>(context, listen: false).fetchPosts();
      Provider.of<PostProvider>(context, listen: false).fetchStories();
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    final threshold = 300.0; // Trigger slightly earlier for seamless experience

    if (currentScroll >= maxScroll - threshold) {
      final postProvider = Provider.of<PostProvider>(context, listen: false);
      if (postProvider.hasMore && !postProvider.isLoadingMore && !postProvider.isLoading) {
        postProvider.fetchPosts(refresh: false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final postProvider = Provider.of<PostProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: AppBar(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.9),
          elevation: 0,
          title: Row(
            children: [
              Image.asset('assets/logo1.png', height: 28),
              const SizedBox(width: 10),
              Text(
                'TrendTwist',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  fontSize: 22,
                  color: isDark ? Colors.white : Colors.black,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.search, color: isDark ? Colors.white : Colors.black87, size: 24),
              onPressed: () {},
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () => themeProvider.toggleTheme(),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1F222E) : Colors.black.withOpacity(0.05),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isDark ? Icons.wb_sunny_outlined : Icons.nightlight_round,
                  size: 16,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(Icons.favorite_border, color: isDark ? Colors.white : Colors.black87, size: 24),
              onPressed: () {},
            ),
            IconButton(
              icon: Icon(Icons.add, color: isDark ? Colors.white : Colors.black87, size: 28),
              onPressed: () {},
            ),
            const SizedBox(width: 8),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await postProvider.fetchPosts();
          await postProvider.fetchStories();
        },
        child: CustomScrollView(
          controller: _scrollController,
          cacheExtent: 1000, // Preload posts off-screen for seamless scrolling
          slivers: [
            const SliverToBoxAdapter(child: SizedBox(height: kToolbarHeight + 40)),
            // Stories section
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05), width: 1)),
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      const StoryCircle(isMe: true),
                      if (postProvider.stories.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(left: 25, right: 24),
                          child: Text(
                            'Follow users to see stories.',
                            style: TextStyle(color: isDark ? Colors.white38 : Colors.black45, fontSize: 13, fontWeight: FontWeight.w400),
                          ),
                        )
                      else
                        ...postProvider.stories.asMap().entries.map((entry) {
                          int index = entry.key;
                          var story = entry.value;
                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => StoryViewScreen(
                                    stories: postProvider.stories,
                                    initialIndex: index,
                                  ),
                                ),
                              );
                            },
                            child: StoryCircle(story: story),
                          );
                        }).toList(),
                    ],
                  ),
                ),
              ),
            ),
            
            // Post feed
            if (postProvider.isLoading && postProvider.posts.isEmpty)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    if (index < postProvider.posts.length) {
                      final post = postProvider.posts[index];
                      return PostCard(
                        post: post,
                        onLike: () => postProvider.toggleLike(post.id),
                      );
                    } else {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 32),
                        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                      );
                    }
                  },
                  childCount: postProvider.posts.length + (postProvider.hasMore ? 1 : 0),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
