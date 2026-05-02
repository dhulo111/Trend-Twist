import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:dio/dio.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _pageController = PageController();
  int _currentStep = 0;

  // Controllers for inputs
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _otpController = TextEditingController();

  String? _selectedGender;
  bool _showRules = false;
  int _resendTimer = 0;
  Timer? _timer;
  String? _error;

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
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

  int _getStrength(String password) {
    int score = 0;
    if (password.isEmpty) return 0;
    if (password.length >= 8) score += 1;
    if (password.contains(RegExp(r'[A-Z]'))) score += 1;
    if (password.contains(RegExp(r'[a-z]'))) score += 1;
    if (password.contains(RegExp(r'[0-9]'))) score += 1;
    if (password.contains(RegExp(r'[^A-Za-z0-9]'))) score += 1;
    return score;
  }

  void _nextStep() {
    _pageController.nextPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    setState(() => _currentStep++);
  }

  void _prevStep() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    setState(() => _currentStep--);
  }

  Future<void> _handleDetailsSubmit(AuthProvider authProvider) async {
    setState(() => _error = null);

    // Validations
    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }

    if (_getStrength(_passwordController.text) < 5) {
      setState(() => _error = 'Please make sure your password meets all security requirements.');
      return;
    }

    if (_usernameController.text.isEmpty ||
        _emailController.text.isEmpty ||
        _passwordController.text.isEmpty ||
        _firstNameController.text.isEmpty) {
      setState(() => _error = 'Username, Email, Password and First Name are required.');
      return;
    }

    bool success = await authProvider.sendOTP(_emailController.text);
    if (success) {
      _startResendTimer();
      _nextStep();
    } else {
      setState(() => _error = authProvider.errorMessage ?? 'Failed to send OTP. Please try again.');
    }
  }

  Future<void> _handleFinalRegister(AuthProvider authProvider) async {
    setState(() => _error = null);

    if (_otpController.text.length < 6) {
      setState(() => _error = 'Please enter a valid 6-digit OTP.');
      return;
    }

    bool success = await authProvider.register(
      email: _emailController.text,
      otp: _otpController.text,
      username: _usernameController.text,
      firstName: _firstNameController.text,
      lastName: _lastNameController.text,
      phoneNumber: _phoneController.text,
      gender: _selectedGender,
      password: _passwordController.text,
    );

    if (success && mounted) {
      Navigator.pop(context);
    } else {
      setState(() => _error = authProvider.errorMessage ?? 'Registration failed. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      body: Stack(
        children: [
          // Background Image with dark overlay
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
            child: Column(
              children: [
                const SizedBox(height: 20),
                Image.asset('assets/logo1.png', height: 60),
                const SizedBox(height: 12),
                const Text(
                  'Create your account',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Join the conversation today',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 20),
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _buildDetailsStep(authProvider),
                      _buildOTPStep(authProvider),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: RichText(
                      text: const TextSpan(
                        text: 'Already have an account? ',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                        children: [
                          TextSpan(
                            text: 'Log in',
                            style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsStep(AuthProvider authProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          _buildTextField(_emailController, 'Email Address', Icons.email_outlined, keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildTextField(_usernameController, 'Username', Icons.alternate_email)),
              const SizedBox(width: 12),
              Expanded(child: _buildTextField(_phoneController, 'Phone (Optional)', Icons.phone_outlined, keyboardType: TextInputType.phone)),
            ],
          ),
          const SizedBox(height: 12),
          _buildPasswordField(_passwordController, 'Password (Min 8 characters)'),
          if (_showRules || _passwordController.text.isNotEmpty) _buildPasswordStrengthMeter(),
          const SizedBox(height: 12),
          _buildPasswordField(_confirmPasswordController, 'Confirm Password'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildTextField(_firstNameController, 'First Name', Icons.person_outline)),
              const SizedBox(width: 12),
              Expanded(child: _buildTextField(_lastNameController, 'Last Name', Icons.person_outline)),
            ],
          ),
          const SizedBox(height: 16),
          _buildGenderSelection(),
          const SizedBox(height: 24),
          _buildPrimaryButton(
            onPressed: authProvider.isLoading ? null : () => _handleDetailsSubmit(authProvider),
            isLoading: authProvider.isLoading,
            label: 'Verify & Continue',
          ),
          const SizedBox(height: 20),
          const Row(
            children: [
              Expanded(child: Divider(color: Colors.white24)),
              Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('OR', style: TextStyle(color: Colors.white30, fontSize: 12))),
              Expanded(child: Divider(color: Colors.white24)),
            ],
          ),
          const SizedBox(height: 20),
          _buildGoogleButton(authProvider),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildOTPStep(AuthProvider authProvider) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Column(
              children: [
                const Text(
                  'Verification Code',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'We\'ve sent a 6-digit OTP to\n${_emailController.text}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 6,
                  style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 12),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: '------',
                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.2)),
                    enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white.withOpacity(0.2))),
                    focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Colors.blueAccent, width: 2)),
                  ),
                ),
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: _prevStep,
                      child: const Text('Back', style: TextStyle(color: Colors.white70)),
                    ),
                    TextButton(
                      onPressed: _resendTimer > 0 || authProvider.isLoading ? null : () async {
                        bool success = await authProvider.sendOTP(_emailController.text);
                        if (success) {
                          _startResendTimer();
                        }
                      },
                      child: Text(
                        _resendTimer > 0 ? 'Resend in ${_resendTimer}s' : 'Resend OTP',
                        style: TextStyle(color: _resendTimer > 0 ? Colors.white30 : Colors.blueAccent),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _buildPrimaryButton(
            onPressed: authProvider.isLoading ? null : () => _handleFinalRegister(authProvider),
            isLoading: authProvider.isLoading,
            label: 'Create Account',
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, {TextInputType? keyboardType}) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 15),
      decoration: _inputDecoration(hint, icon),
    );
  }

  Widget _buildPasswordField(TextEditingController controller, String hint) {
    return TextField(
      controller: controller,
      obscureText: true,
      onChanged: (val) {
        if (hint.contains('Min 8') && !_showRules) {
          setState(() => _showRules = true);
        }
        setState(() {});
      },
      style: const TextStyle(color: Colors.white, fontSize: 15),
      decoration: _inputDecoration(hint, Icons.lock_outline),
    );
  }

  Widget _buildPasswordStrengthMeter() {
    final score = _getStrength(_passwordController.text);
    final labels = ['Weak', 'Weak', 'Medium', 'Medium', 'Strong', 'Strong'];
    final colors = [Colors.red, Colors.red, Colors.orange, Colors.orange, Colors.green, Colors.green];

    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('STRENGTH', style: TextStyle(color: Colors.white30, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
              Text(labels[score], style: TextStyle(color: colors[score], fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: List.generate(5, (index) {
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: index == 4 ? 0 : 4),
                  decoration: BoxDecoration(
                    color: index < score ? colors[score] : Colors.white10,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),
          _buildRequirement('Minimum 8 characters', _passwordController.text.length >= 8),
          _buildRequirement('One uppercase letter', _passwordController.text.contains(RegExp(r'[A-Z]'))),
          _buildRequirement('One lowercase letter', _passwordController.text.contains(RegExp(r'[a-z]'))),
          _buildRequirement('One number', _passwordController.text.contains(RegExp(r'[0-9]'))),
          _buildRequirement('One special character', _passwordController.text.contains(RegExp(r'[^A-Za-z0-9]'))),
        ],
      ),
    );
  }

  Widget _buildRequirement(String label, bool passed) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(passed ? Icons.check_circle_outline : Icons.cancel_outlined, color: passed ? Colors.green : Colors.white24, size: 14),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(color: passed ? Colors.white70 : Colors.white30, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildGenderSelection() {
    final options = [
      {'value': 'male', 'label': 'Male', 'icon': Icons.male, 'color': Colors.blue},
      {'value': 'female', 'label': 'Female', 'icon': Icons.female, 'color': Colors.pink},
      {'value': 'other', 'label': 'Other', 'icon': Icons.transgender, 'color': Colors.purple},
      {'value': 'prefer_not_to_say', 'label': 'Skip', 'icon': Icons.do_not_disturb_on_outlined, 'color': Colors.grey},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Gender (Optional)', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 10),
        Row(
          children: options.map((opt) {
            bool isSelected = _selectedGender == opt['value'];
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _selectedGender = opt['value'] as String),
                child: Container(
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    gradient: isSelected ? LinearGradient(colors: [(opt['color'] as Color).withOpacity(0.8), opt['color'] as Color]) : null,
                    color: isSelected ? null : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSelected ? Colors.white.withOpacity(0.2) : Colors.white.withOpacity(0.1)),
                  ),
                  child: Column(
                    children: [
                      Icon(opt['icon'] as IconData, color: isSelected ? Colors.white : Colors.white30, size: 20),
                      const SizedBox(height: 4),
                      Text(opt['label'] as String, style: TextStyle(color: isSelected ? Colors.white : Colors.white30, fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
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

  Widget _buildGoogleButton(AuthProvider authProvider) {
    return SizedBox(
      width: double.infinity,
      height: 55,
      child: OutlinedButton.icon(
        onPressed: () async {
          bool success = await authProvider.loginWithGoogle();
          if (success && mounted) {
            Navigator.pop(context);
          }
        },
        icon: BrandIcon(icon: FontAwesomeIcons.google, color: Colors.redAccent),
        label: const Text('Continue with Google', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: Colors.white.withOpacity(0.02),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white30, fontSize: 14),
      prefixIcon: Icon(icon, color: Colors.white30, size: 20),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      filled: true,
      fillColor: Colors.white.withOpacity(0.05),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Colors.blueAccent, width: 1.5),
      ),
    );
  }
}

class BrandIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  const BrandIcon({super.key, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => LinearGradient(
        colors: [color, color.withOpacity(0.7)],
      ).createShader(bounds),
      child: Icon(icon, size: 20, color: Colors.white),
    );
  }
}
