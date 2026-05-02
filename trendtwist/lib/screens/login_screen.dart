import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:dio/dio.dart';
import '../providers/auth_provider.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _pageController = PageController();
  int _currentStep = 0;

  // Controllers
  final _usernameEmailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();

  int _resendTimer = 0;
  Timer? _timer;
  String? _error;
  String? _successMsg;

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    _usernameEmailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  void _startResendTimer() {
    setState(() => _resendTimer = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendTimer > 0) {
        setState(() => _resendTimer--);
      } else {
        timer.cancel();
      }
    });
  }

  void _nextStep() {
    if (_currentStep < 2) {
      setState(() => _currentStep++);
      if (_pageController.hasClients) {
        _pageController.animateToPage(
          _currentStep,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
      if (_pageController.hasClients) {
        _pageController.animateToPage(
          _currentStep,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    }
  }

  Future<void> _handleUserCheck(AuthProvider authProvider) async {
    setState(() {
      _error = null;
      _successMsg = null;
    });

    if (_usernameEmailController.text.isEmpty) {
      setState(() => _error = 'Please enter your username or email.');
      return;
    }

    bool exists = await authProvider.checkUserExists(_usernameEmailController.text);
    if (!mounted) return;

    if (exists) {
      _nextStep();
    } else {
      setState(() => _error = authProvider.errorMessage ?? 'User not found. Please register first.');
    }
  }

  Future<void> _handleLogin(AuthProvider authProvider) async {
    setState(() {
      _error = null;
      _successMsg = null;
    });

    if (_passwordController.text.isEmpty) {
      setState(() => _error = 'Please enter your password.');
      return;
    }

    bool success = await authProvider.login(
      _usernameEmailController.text,
      _passwordController.text,
    );
    if (!mounted) return;

    if (success) {
      // Navigation is handled by the wrapper/auth guard
    } else {
      setState(() => _error = authProvider.errorMessage ?? 'Login failed. Please check your password.');
    }
  }

  Future<void> _handleForgotPassword(AuthProvider authProvider) async {
    setState(() {
      _error = null;
      _successMsg = null;
    });

    bool success = await authProvider.sendResetOTP(_usernameEmailController.text);
    if (!mounted) return;

    if (success) {
      _startResendTimer();
      _successMsg = 'Verification code sent to your email.';
      _nextStep();
    } else {
      setState(() => _error = authProvider.errorMessage ?? 'Failed to send verification code.');
    }
  }

  Future<void> _handleResetPassword(AuthProvider authProvider) async {
    setState(() {
      _error = null;
      _successMsg = null;
    });

    if (_otpController.text.length < 6) {
      setState(() => _error = 'Please enter a valid 6-digit code.');
      return;
    }
    if (_newPasswordController.text.length < 8) {
      setState(() => _error = 'New password must be at least 8 characters.');
      return;
    }

    bool success = await authProvider.resetPassword(
      _usernameEmailController.text,
      _otpController.text,
      _newPasswordController.text,
    );
    if (!mounted) return;

    if (success) {
      setState(() => _successMsg = 'Password reset successfully. You can now log in.');
      _prevStep();
      _passwordController.clear();
      _otpController.clear();
      _newPasswordController.clear();
    } else {
      setState(() => _error = authProvider.errorMessage ?? 'Failed to reset password.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      body: Stack(
        children: [
          // Background Image
          Container(
            decoration: BoxDecoration(
              image: DecorationImage(
                image: const AssetImage('assets/landing_bg.png'),
                fit: BoxFit.cover,
                colorFilter: ColorFilter.mode(
                  Colors.black.withOpacity(0.7),
                  BlendMode.darken,
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.asset('assets/logo1.png', height: 80),
                    const SizedBox(height: 24),
                    Text(
                      _currentStep == 0 ? 'Welcome back' : _currentStep == 1 ? 'Enter password' : 'Reset password',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _currentStep == 0 
                        ? 'Sign in to catch up with friends'
                        : _currentStep == 1
                        ? 'Enter password for ${_usernameEmailController.text}'
                        : 'Enter code sent to your email',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 32),
                    
                    if (_successMsg != null)
                      _buildInfoBanner(_successMsg!, Colors.greenAccent),
                    
                    if (_error != null && authProvider.blockInfo == null)
                      _buildInfoBanner(_error!, Colors.redAccent),

                    if (authProvider.blockInfo != null)
                      _buildBlockInfo(authProvider.blockInfo!),

                    const SizedBox(height: 16),
                    
                    SizedBox(
                      height: 400, // Fixed height for PageView to accommodate forms
                      child: PageView(
                        controller: _pageController,
                        physics: const NeverScrollableScrollPhysics(),
                        children: [
                          _buildStep1(authProvider),
                          _buildStep2(authProvider),
                          _buildStep3(authProvider),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const RegisterScreen()),
                        );
                      },
                      child: RichText(
                        text: const TextSpan(
                          text: "Don't have an account? ",
                          style: TextStyle(color: Colors.white70),
                          children: [
                            TextSpan(
                              text: 'Sign up',
                              style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep1(AuthProvider authProvider) {
    return Column(
      children: [
        _buildTextField(_usernameEmailController, 'Username or email address', Icons.person_outline),
        const SizedBox(height: 24),
        _buildPrimaryButton(
          onPressed: authProvider.isLoading ? null : () => _handleUserCheck(authProvider),
          isLoading: authProvider.isLoading,
          label: 'Continue',
        ),
        const SizedBox(height: 32),
        const Row(
          children: [
            Expanded(child: Divider(color: Colors.white24)),
            Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('OR', style: TextStyle(color: Colors.white30))),
            Expanded(child: Divider(color: Colors.white24)),
          ],
        ),
        const SizedBox(height: 32),
        _buildGoogleButton(authProvider),
      ],
    );
  }

  Widget _buildStep2(AuthProvider authProvider) {
    return Column(
      children: [
        _buildTextField(_passwordController, 'Password', Icons.lock_outline, obscureText: true),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: authProvider.isLoading ? null : () => _handleForgotPassword(authProvider),
            child: const Text('Forgot password?', style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 16),
        _buildPrimaryButton(
          onPressed: authProvider.isLoading ? null : () => _handleLogin(authProvider),
          isLoading: authProvider.isLoading,
          label: 'Sign In',
        ),
        const SizedBox(height: 16),
        _buildOutlineButton(
          onPressed: authProvider.isLoading ? null : _prevStep,
          label: 'Back to email',
        ),
      ],
    );
  }

  Widget _buildStep3(AuthProvider authProvider) {
    return Column(
      children: [
        _buildTextField(_otpController, '6-digit code', Icons.verified_user_outlined, keyboardType: TextInputType.number),
        const SizedBox(height: 16),
        _buildTextField(_newPasswordController, 'New password', Icons.lock_reset_outlined, obscureText: true),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _resendTimer > 0 || authProvider.isLoading ? null : () => _handleForgotPassword(authProvider),
            child: Text(
              _resendTimer > 0 ? 'Resend code in ${_resendTimer}s' : 'Resend code',
              style: TextStyle(color: _resendTimer > 0 ? Colors.white30 : Colors.blueAccent),
            ),
          ),
        ),
        const SizedBox(height: 16),
        _buildPrimaryButton(
          onPressed: authProvider.isLoading ? null : () => _handleResetPassword(authProvider),
          isLoading: authProvider.isLoading,
          label: 'Update password',
        ),
        const SizedBox(height: 16),
        _buildOutlineButton(
          onPressed: authProvider.isLoading ? null : _prevStep,
          label: 'Back',
        ),
      ],
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, {bool obscureText = false, TextInputType? keyboardType}) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white30),
        prefixIcon: Icon(icon, color: Colors.white30),
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.blueAccent, width: 2),
        ),
      ),
    );
  }

  Widget _buildPrimaryButton({required VoidCallback? onPressed, required bool isLoading, required String label}) {
    return SizedBox(
      width: double.infinity,
      height: 55,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blueAccent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 8,
          shadowColor: Colors.blueAccent.withOpacity(0.4),
        ),
        child: isLoading
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildOutlineButton({required VoidCallback? onPressed, required String label}) {
    return SizedBox(
      width: double.infinity,
      height: 55,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white24, width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildGoogleButton(AuthProvider authProvider) {
    return SizedBox(
      width: double.infinity,
      height: 55,
      child: OutlinedButton.icon(
        onPressed: () async {
          bool success = await authProvider.loginWithGoogle();
          if (success && mounted) {
            // Navigation handled by wrapper
          }
        },
        icon: const Icon(FontAwesomeIcons.google, size: 20, color: Colors.redAccent),
        label: const Text('Continue with Google', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: Colors.white.withOpacity(0.02),
        ),
      ),
    );
  }

  Widget _buildInfoBanner(String message, Color color) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: TextStyle(color: color, fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildBlockInfo(Map<String, dynamic> info) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Account Blocked', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          const Text(
            'Your account has been temporarily restricted for violating community guidelines.',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 16),
          _buildBlockDetail('Reason', info['block_reason'] ?? 'Administrative action'),
          const SizedBox(height: 8),
          _buildBlockDetail('Blocked Until', info['blocked_until'] ?? 'Unknown'),
          const SizedBox(height: 16),
          Text(
            'Contact: ${info['contact_email']}',
            style: const TextStyle(color: Colors.blueAccent, fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildBlockDetail(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
