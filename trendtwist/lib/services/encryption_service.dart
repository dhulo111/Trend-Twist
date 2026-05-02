import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';

class EncryptionService {
  static const String _appSecret = 'trendtwist-e2ee-v1';
  static final _cipher = AesGcm.with256bits();
  
  // Cache for derived keys to avoid expensive PBKDF2 on every message
  static final Map<String, SecretKey> _keyCache = {};

  static String getRoomId({
    required bool isGroup,
    int? currentUserId,
    int? otherUserId,
    int? groupId,
  }) {
    if (isGroup) {
      return 'group_$groupId';
    }
    final ids = [currentUserId.toString(), otherUserId.toString()]..sort();
    return 'dm_${ids[0]}_${ids[1]}';
  }

  static Future<SecretKey> _deriveKey(String roomId) async {
    if (_keyCache.containsKey(roomId)) {
      return _keyCache[roomId]!;
    }

    final pbkdf2 = Pbkdf2(
      macAlgorithm: Hmac.sha256(),
      iterations: 100000,
      bits: 256,
    );

    final secretKey = SecretKey(utf8.encode('$_appSecret:$roomId'));
    final salt = utf8.encode('salt:$roomId');

    final derivedKey = await pbkdf2.deriveKey(
      secretKey: secretKey,
      nonce: salt,
    );

    _keyCache[roomId] = derivedKey;
    return derivedKey;
  }

  static Future<String> encrypt(String plaintext, String roomId) async {
    try {
      final key = await _deriveKey(roomId);
      
      // AES-GCM encryption
      final secretBox = await _cipher.encrypt(
        utf8.encode(plaintext),
        secretKey: key,
      );

      // Web Crypto format: IV (12) + Ciphertext + Tag (16)
      final iv = secretBox.nonce;
      final ciphertext = secretBox.cipherText;
      final mac = secretBox.mac.bytes;

      final combined = Uint8List(iv.length + ciphertext.length + mac.length);
      combined.setAll(0, iv);
      combined.setAll(iv.length, ciphertext);
      combined.setAll(iv.length + ciphertext.length, mac);

      return base64Encode(combined);
    } catch (e) {
      print('[E2EE] Encryption failed: $e');
      return plaintext;
    }
  }

  static Future<String> decrypt(String encryptedBase64, String roomId) async {
    if (!_isEncrypted(encryptedBase64)) return encryptedBase64;

    try {
      final key = await _deriveKey(roomId);
      final combined = base64Decode(encryptedBase64);

      if (combined.length < 28) return encryptedBase64; // IV(12) + Tag(16) minimum

      // Extract IV (first 12 bytes)
      final iv = combined.sublist(0, 12);
      
      // Extract Mac/Tag (last 16 bytes)
      final mac = Mac(combined.sublist(combined.length - 16));
      
      // Extract Ciphertext (everything in between)
      final ciphertext = combined.sublist(12, combined.length - 16);

      final secretBox = SecretBox(
        ciphertext,
        nonce: iv,
        mac: mac,
      );

      final decryptedBytes = await _cipher.decrypt(
        secretBox,
        secretKey: key,
      );

      return utf8.decode(decryptedBytes);
    } catch (e) {
      print('[E2EE] Decryption failed: $e');
      return encryptedBase64;
    }
  }

  static bool _isEncrypted(String content) {
    if (content.length < 30) return false;
    // Basic regex check for base64
    final base64Regex = RegExp(r'^[A-Za-z0-9+/=]+$');
    return base64Regex.hasMatch(content.trim());
  }
}
