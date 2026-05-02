import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/reel_model.dart';
import '../providers/reel_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/navigation_provider.dart';
import 'user_avatar.dart';
import 'tier_badge.dart';
import 'reel_comment_sheet.dart';
import 'dart:math' as math;
import '../screens/profile_screen.dart';

import 'package:visibility_detector/visibility_detector.dart';

class ReelPlayer extends StatefulWidget {
  final Reel reel;
  final bool isVisible;

  const ReelPlayer({super.key, required this.reel, required this.isVisible});

  @override
  State<ReelPlayer> createState() => _ReelPlayerState();
}

class _ReelPlayerState extends State<ReelPlayer> with SingleTickerProviderStateMixin {
  VideoPlayerController? _controller;
  VideoPlayerController? _audioController;
  bool _initialized = false;
  bool _showHeart = false;
  bool _isMuted = false;
  late AnimationController _musicController;

  @override
  void initState() {
    super.initState();
    _musicController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat();
    
    _initController();
  }

  void _initController() {
    // 1. Initialize Main Media (Video only)
    if (widget.reel.mediaType == 'video') {
      _controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.reel.mediaFile),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      )..initialize().then((_) {
          if (mounted) {
            setState(() {
              _initialized = true;
              _controller?.setLooping(true);
              // Set volume based on mute state AND whether separate music exists
              if (widget.reel.musicUrl != null && widget.reel.musicUrl!.isNotEmpty) {
                _controller?.setVolume(0);
              } else {
                _controller?.setVolume(_isMuted ? 0 : 1);
              }
              
              if (widget.isVisible) {
                _controller?.play();
              }
            });
          }
        });
    } else {
      setState(() => _initialized = true);
    }

    // 2. Initialize Audio
    if (widget.reel.musicUrl != null && widget.reel.musicUrl!.isNotEmpty) {
      _audioController = VideoPlayerController.networkUrl(
        Uri.parse(widget.reel.musicUrl!),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      )..initialize().then((_) {
          if (mounted) {
            setState(() {
              _audioController?.setLooping(true);
              _audioController?.setVolume(_isMuted ? 0 : 1);
              if (widget.isVisible) {
                _audioController?.play();
              }
            });
          }
        });
    }

    // 3. Register View after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && widget.isVisible) {
        Provider.of<ReelProvider>(context, listen: false).registerView(widget.reel.id);
      }
    });
  }

  @override
  void didUpdateWidget(ReelPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_initialized) {
      if (widget.isVisible) {
        _controller?.play();
        _controller?.setLooping(true);
        _audioController?.play();
        _audioController?.setLooping(true);
      } else {
        _controller?.pause();
        _audioController?.pause();
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    _audioController?.dispose();
    _musicController.dispose();
    super.dispose();
  }

  void _handleDoubleTap() {
    setState(() => _showHeart = true);
    if (!widget.reel.isLiked) {
      Provider.of<ReelProvider>(context, listen: false).toggleLike(widget.reel.id);
    }
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) setState(() => _showHeart = false);
    });
  }

  void _togglePlay() {
    setState(() {
      if (_controller != null) {
        if (_controller!.value.isPlaying) {
          _controller?.pause();
          _audioController?.pause();
        } else {
          _controller?.play();
          _audioController?.play();
        }
      } else {
        if (_audioController != null) {
          _audioController!.value.isPlaying ? _audioController?.pause() : _audioController?.play();
        }
      }
    });
  }

  void _toggleMute() {
    setState(() {
      _isMuted = !_isMuted;
      // If we have separate music, only mute that (the video is already muted)
      if (widget.reel.musicUrl != null && widget.reel.musicUrl!.isNotEmpty) {
        _audioController?.setVolume(_isMuted ? 0 : 1);
      } else {
        // Otherwise mute the video
        _controller?.setVolume(_isMuted ? 0 : 1);
      }
    });
  }

  void _showComments() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ReelCommentSheet(reelId: widget.reel.id),
    );
  }

  void _navigateToProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProfileScreen(username: widget.reel.author.username),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return VisibilityDetector(
      key: Key('reel_player_${widget.reel.id}'),
      onVisibilityChanged: (info) {
        if (!mounted) return;
        if (info.visibleFraction < 0.1) {
          // If less than 10% visible, pause everything
          _controller?.pause();
          _audioController?.pause();
        } else if (info.visibleFraction > 0.8 && widget.isVisible) {
          // If more than 80% visible and current active reel, play
          _controller?.play();
          _audioController?.play();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // Media Content (Fitted)
            GestureDetector(
              onTap: _togglePlay,
              onDoubleTap: _handleDoubleTap,
              child: Container(
                color: Colors.black,
                child: _buildMediaContent(),
              ),
            ),

          // Mute Button Overlay (Top Right)
          Positioned(
            top: 15,
            right: 15,
            child: GestureDetector(
              onTap: _toggleMute,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black26,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _isMuted ? Icons.volume_off : Icons.volume_up,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),

          // Progress Bar (Slimmer at the bottom of the card)
          if (widget.reel.mediaType == 'video' && _controller != null && _controller!.value.isInitialized)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: SizedBox(
                height: 3,
                child: VideoProgressIndicator(
                  _controller!,
                  allowScrubbing: false,
                  colors: const VideoProgressColors(
                    playedColor: Color(0xFF8B5CF6),
                    bufferedColor: Colors.white24,
                    backgroundColor: Colors.transparent,
                  ),
                ),
              ),
            ),

          // Gradient Overlay (Subtle)
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withOpacity(0.3),
                      Colors.transparent,
                      Colors.transparent,
                      Colors.black.withOpacity(0.6),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0, 0.2, 0.7, 1],
                  ),
                ),
              ),
            ),
          ),

          // Right Sidebar Actions (Raised for visibility above navbar)
          Positioned(
            bottom: 100, 
            right: 12,
            child: Column(
              children: [
                _buildActionItem(
                  widget.reel.isLiked ? Icons.favorite : Icons.favorite_border,
                  widget.reel.likesCount.toString(),
                  color: widget.reel.isLiked ? Colors.red : Colors.white,
                  onTap: () => Provider.of<ReelProvider>(context, listen: false).toggleLike(widget.reel.id),
                ),
                const SizedBox(height: 20),
                _buildActionItem(
                  Icons.chat_bubble_outline,
                  widget.reel.commentsCount.toString(),
                  onTap: _showComments,
                ),
                const SizedBox(height: 20),
                _buildActionItem(
                  widget.reel.isSaved ? Icons.bookmark : Icons.bookmark_border,
                  '',
                  onTap: () => Provider.of<ReelProvider>(context, listen: false).toggleSave(widget.reel.id),
                ),
                const SizedBox(height: 20),
                _buildActionItem(Icons.share_outlined, ''),
                const SizedBox(height: 25),
                // Rotating Music Disc
                RotationTransition(
                  turns: _musicController,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white30, width: 2),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                      ),
                      child: UserAvatar(
                        radius: 12,
                        imageUrl: widget.reel.author.profilePicture,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom Info (Raised for visibility above navbar)
          Positioned(
            bottom: 80, 
            left: 15,
            right: 80,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // User Header
                Row(
                  children: [
                    GestureDetector(
                      onTap: _navigateToProfile,
                      child: Container(
                        padding: const EdgeInsets.all(1.5),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1),
                        ),
                        child: UserAvatar(
                          radius: 16,
                          imageUrl: widget.reel.author.profilePicture,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: GestureDetector(
                              onTap: _navigateToProfile,
                              child: Text(
                                widget.reel.author.username,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  letterSpacing: 0.3,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                          if (widget.reel.author.isCreator) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.verified, color: Colors.blue, size: 14),
                          ],
                          const SizedBox(width: 10),
                          // Follow Button
                          GestureDetector(
                            onTap: () => Provider.of<ReelProvider>(context, listen: false).toggleFollow(widget.reel.author.id),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.white, width: 1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                widget.reel.isFollowing ? 'Following' : 'Follow',
                                style: const TextStyle(
                                  color: Colors.white, 
                                  fontSize: 11, 
                                  fontWeight: FontWeight.w800
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Caption
                if (widget.reel.caption != null)
                  Text(
                    widget.reel.caption!,
                    style: const TextStyle(
                      color: Colors.white, 
                      fontSize: 14,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 10),
                // Music Ticker
                Row(
                  children: [
                    const Icon(Icons.music_note, color: Colors.white, size: 14),
                    const SizedBox(width: 6),
                    Expanded(
                      child: SizedBox(
                        height: 20,
                        child: _MusicTicker(
                          text: '${widget.reel.musicName ?? "Original Audio"} • ${widget.reel.author.username}',
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

  Widget _buildMediaContent() {
    if (widget.reel.mediaType == 'video') {
      return _initialized && _controller != null
          ? Center(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _controller!.value.size.width,
                  height: _controller!.value.size.height,
                  child: VideoPlayer(_controller!),
                ),
              ),
            )
          : const Center(child: CircularProgressIndicator(color: Colors.white70));
    } else {
      return Center(
        child: CachedNetworkImage(
          imageUrl: widget.reel.mediaFile,
          fit: BoxFit.contain,
          placeholder: (context, url) => const Center(child: CircularProgressIndicator(color: Colors.white70)),
          errorWidget: (context, url, error) => const Center(child: Icon(Icons.error, color: Colors.white)),
        ),
      );
    }
  }

  Widget _buildActionItem(IconData icon, String label, {Color color = Colors.white, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, color: color, size: 30),
          if (label.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}

class _MusicTicker extends StatefulWidget {
  final String text;
  const _MusicTicker({required this.text});

  @override
  State<_MusicTicker> createState() => _MusicTickerState();
}

class _MusicTickerState extends State<_MusicTicker> with SingleTickerProviderStateMixin {
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) => _animate());
  }

  void _animate() async {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    
    while (mounted) {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) break;
      await _scrollController.animateTo(
        maxScroll,
        duration: Duration(milliseconds: (maxScroll * 40).toInt()),
        curve: Curves.linear,
      );
      if (!mounted) break;
      _scrollController.jumpTo(0);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        Text(
          widget.text,
          style: const TextStyle(color: Colors.white, fontSize: 13),
        ),
        const SizedBox(width: 50),
        Text(
          widget.text,
          style: const TextStyle(color: Colors.white, fontSize: 13),
        ),
      ],
    );
  }
}
