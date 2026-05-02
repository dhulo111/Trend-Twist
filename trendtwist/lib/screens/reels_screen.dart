import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/reel_provider.dart';
import '../providers/navigation_provider.dart';
import '../widgets/reel_player.dart';
import 'package:visibility_detector/visibility_detector.dart';

class ReelsScreen extends StatefulWidget {
  final int? initialReelId;
  const ReelsScreen({super.key, this.initialReelId});

  @override
  State<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends State<ReelsScreen> {
  late PageController _pageController;
  int _currentIndex = 0;
  bool _hasScrolledToInitial = false;
  int _lastReselectSignal = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.88);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final reelProvider = Provider.of<ReelProvider>(context, listen: false);
      await reelProvider.fetchReels(refresh: true);
      
      if (widget.initialReelId != null && !_hasScrolledToInitial) {
        int index = reelProvider.reels.indexWhere((r) => r.id == widget.initialReelId);
        if (index != -1) {
          setState(() {
            _currentIndex = index;
            _hasScrolledToInitial = true;
          });
          _pageController.jumpToPage(index);
        }
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final navProvider = Provider.of<NavigationProvider>(context);
    if (navProvider.selectedIndex == 1 && navProvider.reselectSignal > _lastReselectSignal) {
      _lastReselectSignal = navProvider.reselectSignal;
      _refreshReels();
    }
  }

  Future<void> _refreshReels() async {
    final reelProvider = Provider.of<ReelProvider>(context, listen: false);
    if (_pageController.hasClients) {
      _pageController.animateToPage(
        0, 
        duration: const Duration(milliseconds: 300), 
        curve: Curves.easeOut
      );
    }
    await reelProvider.fetchReels(refresh: true);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reelProvider = Provider.of<ReelProvider>(context);
    final navProvider = Provider.of<NavigationProvider>(context);
    final bool isPageActive = navProvider.selectedIndex == 1;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          reelProvider.isLoading && reelProvider.reels.isEmpty
              ? const Center(child: CircularProgressIndicator(color: Colors.white70))
              : reelProvider.reels.isEmpty
                  ? _buildEmptyState(reelProvider)
                  : PageView.builder(
                      scrollDirection: Axis.vertical,
                      controller: _pageController,
                      itemCount: reelProvider.reels.length,
                      onPageChanged: (index) {
                        setState(() {
                          _currentIndex = index;
                        });
                        // Load more
                        if (index >= reelProvider.reels.length - 3 && reelProvider.hasMore) {
                          reelProvider.fetchReels(refresh: false);
                        }
                      },
                      itemBuilder: (context, index) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: ReelPlayer(
                              reel: reelProvider.reels[index],
                              isVisible: isPageActive && _currentIndex == index,
                            ),
                          ),
                        );
                      },
                    ),
          
          // Top Header Overlay
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Reels',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ReelProvider reelProvider) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.videocam_off_outlined, color: Colors.white24, size: 80),
          const SizedBox(height: 16),
          const Text(
            'No Reels Yet',
            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Captured moments will appear here.',
            style: TextStyle(color: Colors.white54),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => reelProvider.fetchReels(refresh: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            ),
            child: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
}
