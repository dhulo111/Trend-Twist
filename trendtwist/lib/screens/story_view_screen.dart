import 'package:flutter/material.dart';
import '../models/story_model.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:video_player/video_player.dart';

class StoryViewScreen extends StatefulWidget {
  final List<Story> stories;
  final int initialIndex;

  const StoryViewScreen({super.key, required this.stories, required this.initialIndex});

  @override
  State<StoryViewScreen> createState() => _StoryViewScreenState();
}

class _StoryViewScreenState extends State<StoryViewScreen> {
  late PageController _pageController;
  int _currentIndex = 0;
  VideoPlayerController? _videoController;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: _currentIndex);
    _loadStory();
  }

  void _loadStory() {
    _videoController?.dispose();
    _videoController = null;
    
    final story = widget.stories[_currentIndex];
    if (story.mediaType == 'video') {
      _videoController = VideoPlayerController.networkUrl(Uri.parse(story.mediaFile))
        ..initialize().then((_) {
          setState(() {});
          _videoController!.play();
        });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTapDown: (details) {
          final width = MediaQuery.of(context).size.width;
          if (details.globalPosition.dx < width / 3) {
            // Previous
            if (_currentIndex > 0) {
              setState(() {
                _currentIndex--;
                _pageController.jumpToPage(_currentIndex);
                _loadStory();
              });
            }
          } else {
            // Next
            if (_currentIndex < widget.stories.length - 1) {
              setState(() {
                _currentIndex++;
                _pageController.jumpToPage(_currentIndex);
                _loadStory();
              });
            } else {
              Navigator.pop(context);
            }
          }
        },
        child: PageView.builder(
          controller: _pageController,
          physics: NeverScrollableScrollPhysics(),
          itemCount: widget.stories.length,
          itemBuilder: (context, index) {
            final story = widget.stories[index];
            return Stack(
              children: [
                Center(
                  child: story.mediaType == 'video'
                      ? (_videoController != null && _videoController!.value.isInitialized
                          ? AspectRatio(
                              aspectRatio: _videoController!.value.aspectRatio,
                              child: VideoPlayer(_videoController!),
                            )
                          : CircularProgressIndicator())
                      : CachedNetworkImage(
                          imageUrl: story.mediaFile,
                          fit: BoxFit.contain,
                        ),
                ),
                
                // Story Header
                Positioned(
                  top: 50,
                  left: 20,
                  right: 20,
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundImage: story.author.profilePicture != null
                            ? CachedNetworkImageProvider(story.author.profilePicture!)
                            : null,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        story.author.username,
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
