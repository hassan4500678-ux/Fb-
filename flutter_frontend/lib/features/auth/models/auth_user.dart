import 'dart:convert';

class AuthUser {
  const AuthUser({
    required this.id,
    required this.role,
    required this.name,
    required this.email,
    this.category,
    this.badge,
    this.profileImageUrl,
  });

  final String id;
  final String role;
  final String name;
  final String email;
  final String? category;
  final String? badge;
  final String? profileImageUrl;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] ?? '').toString(),
      role: (json['role'] ?? 'employee').toString(),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      category: json['category']?.toString(),
      badge: json['badge']?.toString(),
      profileImageUrl: json['profileImageUrl']?.toString() ?? json['profile_image_url']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'name': name,
        'email': email,
        'category': category,
        'badge': badge,
        'profileImageUrl': profileImageUrl,
      };

  String encode() => jsonEncode(toJson());

  static AuthUser? decode(String? value) {
    if (value == null || value.isEmpty) return null;
    final json = jsonDecode(value) as Map<String, dynamic>;
    return AuthUser.fromJson(json);
  }
}
