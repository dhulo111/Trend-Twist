import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/navigation_provider.dart';
import '../widgets/glass_container.dart';
import '../widgets/user_avatar.dart';
import 'home_screen.dart';
import 'reels_screen.dart';
import 'search_screen.dart';
import 'messages_screen.dart';
import 'profile_screen.dart';
import '../providers/call_provider.dart';
import 'call_screen.dart';
import 'twists_screen.dart';
import 'stranger_talk_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  // Removed local _selectedIndex to use NavigationProvider instead

  final List<Widget> _screens = [
    const HomeScreen(),
    const ReelsScreen(),
    const MessagesScreen(),
    const TwistsScreen(),
    const StrangerTalkScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final navProvider = Provider.of<NavigationProvider>(context);
    final isDark = themeProvider.isDarkMode;
    final selectedIndex = navProvider.selectedIndex;
    final callProvider = Provider.of<CallProvider>(context);

    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          IndexedStack(
            index: selectedIndex,
            children: _screens,
          ),
          if (callProvider.status != CallStatus.idle)
            const CallScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        height: 70,
        margin: const EdgeInsets.only(bottom: 40, left: 24, right: 24),
        child: GlassContainer(
          borderRadius: 40,
          blur: selectedIndex == 1 ? 40 : 30,
          opacity: selectedIndex == 1 ? 0.1 : (isDark ? 0.15 : 0.7),
          color: selectedIndex == 1 ? Colors.black : (isDark ? Colors.black : Colors.white),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(context, 0, Icons.home_rounded, true, isDark, selectedIndex),
              _buildNavItem(context, 1, Icons.play_circle_outline_rounded, false, isDark, selectedIndex),
              _buildNavItem(context, 2, Icons.chat_bubble_outline_rounded, false, isDark, selectedIndex),
              _buildNavItem(context, 3, FontAwesomeIcons.earthAmericas, false, isDark, selectedIndex),
              _buildNavItem(context, 4, Icons.people_outline_rounded, false, isDark, selectedIndex),
              _buildProfileNavItem(context, 5, isDark, selectedIndex),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, int index, IconData icon, bool isSolid, bool isDark, int selectedIndex) {
    bool isSelected = selectedIndex == index;
    return GestureDetector(
      onTap: () => Provider.of<NavigationProvider>(context, listen: false).setIndex(index),
      child: Icon(
        icon,
        color: isSelected 
          ? const Color(0xFF8B5CF6) 
          : (selectedIndex == 1 || isDark ? Colors.white70 : Colors.black45),
        size: 28,
      ),
    );
  }

  Widget _buildProfileNavItem(BuildContext context, int index, bool isDark, int selectedIndex) {
    bool isSelected = selectedIndex == index;
    final authProvider = Provider.of<AuthProvider>(context);
    
    return GestureDetector(
      onTap: () => Provider.of<NavigationProvider>(context, listen: false).setIndex(index),
      child: Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected 
              ? const Color(0xFF8B5CF6) 
              : (selectedIndex == 1 ? Colors.white24 : Colors.transparent),
            width: 2,
          ),
        ),
        child: UserAvatar(
          radius: 14,
          imageUrl: authProvider.user?.profilePicture,
        ),
      ),
    );
  }
}
