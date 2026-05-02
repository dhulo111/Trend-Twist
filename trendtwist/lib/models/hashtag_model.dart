class Hashtag {
  final int id;
  final String name;
  final int postCount;

  Hashtag({
    required this.id,
    required this.name,
    this.postCount = 0,
  });

  factory Hashtag.fromJson(Map<String, dynamic> json) {
    return Hashtag(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      postCount: json['post_count'] ?? 0,
    );
  }
}
