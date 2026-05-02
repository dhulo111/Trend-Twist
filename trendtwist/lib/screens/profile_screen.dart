import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/profile_provider.dart';
import '../providers/post_provider.dart';
import '../widgets/glass_container.dart';
import '../widgets/tier_badge.dart';
import '../widgets/user_avatar.dart';
import '../models/post_model.dart';
import '../models/reel_model.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'post_detail_screen.dart';
import 'reels_screen.dart';
import '../widgets/post_card.dart';

class ProfileScreen extends StatefulWidget {
  final String? username;

  const ProfileScreen({super.key, this.username});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  void _loadData() {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final profileProvider = Provider.of<ProfileProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      String targetUsername = widget.username ?? authProvider.user?.username ?? '';
      
      if (targetUsername.isNotEmpty) {
        await profileProvider.fetchProfile(targetUsername);
        if (profileProvider.profileUser != null) {
          final user = profileProvider.profileUser!;
          final isOwner = user.id == authProvider.user?.id;
          final canView = !user.isPrivate || user.isFollowing || isOwner;
          
          if (canView) {
            profileProvider.fetchUserContent(user.id);
          }
        }
      }
      setState(() => _isInitialized = true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profileProvider = Provider.of<ProfileProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!_isInitialized || profileProvider.isLoadingProfile) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final user = profileProvider.profileUser;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(child: Text(profileProvider.error ?? 'User not found')),
      );
    }

    final isOwner = user.id == authProvider.user?.id;
    final canView = !user.isPrivate || user.isFollowing || isOwner;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      appBar: AppBar(
        title: Text(user.username, style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        actions: [
          if (isOwner) ...[
            IconButton(icon: const Icon(Icons.settings_outlined, size: 22), onPressed: () {}),
            IconButton(
              icon: const Icon(Icons.logout_rounded, size: 22, color: Colors.redAccent),
              onPressed: () => authProvider.logout(),
            ),
          ] else
            IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
        ],
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  _buildHeader(user, isOwner, isDark),
                  _buildBio(user, isDark),
                  _buildActions(user, isOwner, isDark),
                  const SizedBox(height: 20),
                ],
              ),
            ),
            if (canView)
              SliverPersistentHeader(
                pinned: true,
                delegate: _SliverAppBarDelegate(
                  TabBar(
                    controller: _tabController,
                    indicatorColor: const Color(0xFF8B5CF6),
                    labelColor: const Color(0xFF8B5CF6),
                    unselectedLabelColor: Colors.grey,
                    tabs: const [
                      Tab(icon: Icon(Icons.grid_on_outlined), text: 'POSTS'),
                      Tab(icon: Icon(Icons.repeat), text: 'TWISTS'),
                      Tab(icon: Icon(Icons.movie_outlined), text: 'REELS'),
                      Tab(icon: Icon(Icons.lock_outline), text: 'EXCLUSIVE'),
                    ],
                  ),
                  isDark ? Colors.black : Colors.white,
                ),
              ),
          ];
        },
        body: !canView
            ? _buildPrivateAccountState(isDark)
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildPostsGrid(profileProvider.userPosts, isDark),
                  _buildTwistsList(profileProvider.userTwists, isDark),
                  _buildReelsGrid(profileProvider.userReels, isDark),
                  _buildExclusiveGrid(profileProvider.exclusiveContent, isDark),
                ],
              ),
      ),
    );
  }

  Widget _buildHeader(user, bool isOwner, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Row(
        children: [
          UserAvatar(
            radius: 40,
            imageUrl: user.profilePicture,
            showBorder: true,
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStatColumn('Posts', '${user.postsCount}'),
                _buildStatColumn('Followers', '${user.followersCount}'),
                _buildStatColumn('Following', '${user.followingCount}'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBio(user, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(user.username, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              if (user.isCreator) ...[
                const SizedBox(width: 8),
                const TierBadge(tier: 'elite'),
              ],
            ],
          ),
          if (user.bio != null && user.bio!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(user.bio!, style: TextStyle(color: isDark ? Colors.white70 : Colors.black87)),
            ),
        ],
      ),
    );
  }

  Widget _buildActions(user, bool isOwner, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                if (!isOwner) {
                  Provider.of<PostProvider>(context, listen: false).toggleFollow(user.id);
                  // Refresh profile to update counts
                  Provider.of<ProfileProvider>(context, listen: false).fetchProfile(user.username);
                }
              },
              child: GlassContainer(
                borderRadius: 12,
                padding: const EdgeInsets.symmetric(vertical: 10),
                blur: 10,
                opacity: isDark ? 0.1 : 0.05,
                child: Center(
                  child: Text(
                    isOwner ? 'Edit Profile' : (user.isFollowing ? 'Following' : 'Follow'),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () {},
              child: GlassContainer(
                borderRadius: 12,
                padding: const EdgeInsets.symmetric(vertical: 10),
                blur: 10,
                opacity: isDark ? 0.1 : 0.05,
                child: Center(
                  child: Text(
                    isOwner ? 'Share Profile' : 'Message',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatColumn(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildPrivateAccountState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('This Account is Private', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Follow to see their photos and videos.', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildPostsGrid(List<Post> posts, bool isDark) {
    if (posts.isEmpty) return _buildEmptyState(Icons.grid_on_outlined, 'No Posts Yet');
    
    return GridView.builder(
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 2,
        mainAxisSpacing: 2,
      ),
      itemCount: posts.length,
      itemBuilder: (context, index) {
        final post = posts[index];
        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => PostDetailScreen(postId: post.id, initialPost: post),
              ),
            );
          },
          child: _buildGridItem(post.mediaFile, post.isExclusive),
        );
      },
    );
  }

  Widget _buildReelsGrid(List<Reel> reels, bool isDark) {
    if (reels.isEmpty) return _buildEmptyState(Icons.movie_outlined, 'No Reels Yet');
    
    return GridView.builder(
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 9/16,
        crossAxisSpacing: 2,
        mainAxisSpacing: 2,
      ),
      itemCount: reels.length,
      itemBuilder: (context, index) {
        final reel = reels[index];
        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ReelsScreen(initialReelId: reel.id),
              ),
            );
          },
          child: _buildGridItem(reel.mediaFile, reel.isExclusive, isReel: true),
        );
      },
    );
  }

  Widget _buildTwistsList(List<Post> twists, bool isDark) {
    if (twists.isEmpty) return _buildEmptyState(Icons.repeat, 'No Twists Yet');
    
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: twists.length,
      separatorBuilder: (context, index) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final twist = twists[index];
        return PostCard(
          post: twist,
          onLike: () => Provider.of<PostProvider>(context, listen: false).toggleLike(twist.id),
        );
      },
    );
  }

  Widget _buildExclusiveGrid(List<dynamic> content, bool isDark) {
    if (content.isEmpty) return _buildEmptyState(Icons.lock_outline, 'No Exclusive Content');
    
    return GridView.builder(
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 2,
        mainAxisSpacing: 2,
      ),
      itemCount: content.length,
      itemBuilder: (context, index) {
        final item = content[index];
        String? mediaFile;
        int? id;
        bool isReel = false;

        if (item is Post) {
          mediaFile = item.mediaFile;
          id = item.id;
        } else if (item is Reel) {
          mediaFile = item.mediaFile;
          id = item.id;
          isReel = true;
        }
        
        return GestureDetector(
          onTap: () {
            if (id != null) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => isReel 
                    ? ReelsScreen(initialReelId: id) 
                    : PostDetailScreen(postId: id!, initialPost: item is Post ? item : null),
                ),
              );
            }
          },
          child: _buildGridItem(mediaFile, true, isReel: isReel),
        );
      },
    );
  }

  Widget _buildGridItem(String? imageUrl, bool isExclusive, {bool isReel = false}) {
    return Stack(
      children: [
        Positioned.fill(
          child: imageUrl != null && imageUrl.isNotEmpty
              ? CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(color: Colors.grey[900]),
                  errorWidget: (context, url, error) => Container(color: Colors.grey[900], child: const Icon(Icons.error)),
                )
              : Container(color: Colors.grey[900]),
        ),
        if (isExclusive)
          const Positioned(
            top: 8,
            left: 8,
            child: Icon(Icons.lock, size: 16, color: Colors.white70),
          ),
        if (isReel)
          const Positioned(
            bottom: 8,
            right: 8,
            child: Icon(Icons.play_arrow, size: 16, color: Colors.white70),
          ),
      ],
    );
  }

  Widget _buildEmptyState(IconData icon, String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: Colors.grey.withOpacity(0.5)),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar, this._backgroundColor);

  final TabBar _tabBar;
  final Color _backgroundColor;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: _backgroundColor,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
