import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/post_provider.dart';
import 'user_avatar.dart';

class CreateTwistInput extends StatefulWidget {
  final VoidCallback onTwistCreated;

  const CreateTwistInput({super.key, required this.onTwistCreated});

  @override
  State<CreateTwistInput> createState() => _CreateTwistInputState();
}

class _CreateTwistInputState extends State<CreateTwistInput> {
  final _controller = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_controller.text.trim().isEmpty) return;
    
    setState(() => _isSubmitting = true);
    final success = await Provider.of<PostProvider>(context, listen: false).createTwist(
      0, // 0 or -1 could mean no original post, but check createTwist implementation
      _controller.text.trim(),
    );
    
    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        _controller.clear();
        widget.onTwistCreated();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.02),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              UserAvatar(radius: 20, imageUrl: auth.user?.profilePicture),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _controller,
                  maxLines: null,
                  decoration: InputDecoration(
                    hintText: "What's happening?",
                    hintStyle: TextStyle(color: Colors.grey[600], fontSize: 16),
                    border: InputBorder.none,
                  ),
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ],
          ),
          const Divider(height: 24, thickness: 0.5),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.image_outlined, color: Colors.blue),
                onPressed: () {},
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  elevation: 0,
                ),
                child: _isSubmitting 
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Row(
                      children: [
                        Text('Twist', style: TextStyle(fontWeight: FontWeight.bold)),
                        SizedBox(width: 6),
                        Icon(Icons.send_rounded, size: 16),
                      ],
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
