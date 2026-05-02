import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/post_provider.dart';
import '../widgets/twist_card.dart';
import '../widgets/create_twist_input.dart';
import '../models/twist_model.dart';

class TwistsScreen extends StatefulWidget {
  const TwistsScreen({super.key});

  @override
  State<TwistsScreen> createState() => _TwistsScreenState();
}

class _TwistsScreenState extends State<TwistsScreen> {
  List<Twist> _twists = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchTwists();
  }

  Future<void> _fetchTwists() async {
    setState(() => _isLoading = true);
    final results = await Provider.of<PostProvider>(context, listen: false).fetchGlobalTwists();
    if (mounted) {
      setState(() {
        _twists = results;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchTwists,
          child: CustomScrollView(
            slivers: [
              // --- Header ---
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF8B5CF6).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(FontAwesomeIcons.earthAmericas, color: Color(0xFF8B5CF6), size: 28),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Global Feed',
                            style: GoogleFonts.outfit(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                          Text(
                            'See what the world is twisting about',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // --- Create Twist Input ---
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(
                  child: CreateTwistInput(onTwistCreated: _fetchTwists),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              // --- Twists List ---
              if (_isLoading)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_twists.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey[800]),
                        const SizedBox(height: 16),
                        const Text('No twists yet. Be the first!', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      return TwistCard(twist: _twists[index]);
                    },
                    childCount: _twists.length,
                  ),
                ),
                
              const SliverToBoxAdapter(child: SizedBox(height: 100)), // Bottom padding for nav bar
            ],
          ),
        ),
      ),
    );
  }
}
