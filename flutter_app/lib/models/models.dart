// lib/models/models.dart

class Beer {
  final String id;
  final String name;
  final String degrees;
  final double price;
  final String? style;
  final String? brewery;
  final String? description;

  Beer({
    required this.id,
    required this.name,
    required this.degrees,
    required this.price,
    this.style,
    this.brewery,
    this.description,
  });

  factory Beer.fromJson(Map<String, dynamic> json) {
    return Beer(
      id: json['id'] as String,
      name: json['name'] as String,
      degrees: json['degrees'] as String,
      price: (json['price'] as num).toDouble(),
      style: json['style'] as String?,
      brewery: json['brewery'] as String?,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'degrees': degrees,
      'price': price,
      'style': style,
      'brewery': brewery,
      'description': description,
    };
  }
}

class Pub {
  final String id;
  final String name;
  final double lat;
  final double lng;
  final String? address;
  final String? notes;
  final List<Beer> beers;
  final String? updatedAt;

  Pub({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    this.address,
    this.notes,
    required this.beers,
    this.updatedAt,
  });

  factory Pub.fromJson(Map<String, dynamic> json) {
    var beersList = json['beers'] as List? ?? [];
    return Pub(
      id: json['id'] as String,
      name: json['name'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      address: json['address'] as String?,
      notes: json['notes'] as String?,
      beers: beersList.map((b) => Beer.fromJson(b as Map<String, dynamic>)).toList(),
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'lat': lat,
      'lng': lng,
      'address': address,
      'notes': notes,
      'beers': beers.map((b) => b.toJson()).toList(),
      'updatedAt': updatedAt,
    };
  }
}

class UserProfile {
  final String email;
  final String name;
  final String? picture;

  UserProfile({
    required this.email,
    required this.name,
    this.picture,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      email: json['email'] as String,
      name: json['name'] as String,
      picture: json['picture'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'name': name,
      'picture': picture,
    };
  }

  UserProfile copyWith({String? name, String? picture}) {
    return UserProfile(
      email: email,
      name: name ?? this.name,
      picture: picture ?? this.picture,
    );
  }
}

class BeerVisit {
  final String id;
  final String pubId;
  final String pubName;
  final String? beerId;
  final String? beerName;
  final String? degrees;
  final String? style;
  final String? brewery;
  final DateTime timestamp;

  BeerVisit({
    required this.id,
    required this.pubId,
    required this.pubName,
    this.beerId,
    this.beerName,
    this.degrees,
    this.style,
    this.brewery,
    required this.timestamp,
  });

  factory BeerVisit.fromJson(Map<String, dynamic> json) {
    return BeerVisit(
      id: json['id'] as String,
      pubId: json['pubId'] as String,
      pubName: json['pubName'] as String,
      beerId: json['beerId'] as String?,
      beerName: json['beerName'] as String?,
      degrees: json['degrees'] as String?,
      style: json['style'] as String?,
      brewery: json['brewery'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'pubId': pubId,
      'pubName': pubName,
      'beerId': beerId,
      'beerName': beerName,
      'degrees': degrees,
      'style': style,
      'brewery': brewery,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

class UserPassport {
  final String userEmail;
  final List<String> visitedPubIds;
  final List<BeerVisit> visits;
  final String? favoriteBeerName;

  UserPassport({
    required this.userEmail,
    required this.visitedPubIds,
    required this.visits,
    this.favoriteBeerName,
  });

  factory UserPassport.fromJson(Map<String, dynamic> json) {
    var visitsList = json['visits'] as List? ?? [];
    var pubIdsList = json['visitedPubIds'] as List? ?? [];
    return UserPassport(
      userEmail: json['userEmail'] as String,
      visitedPubIds: pubIdsList.map((e) => e.toString()).toList(),
      visits: visitsList.map((v) => BeerVisit.fromJson(v as Map<String, dynamic>)).toList(),
      favoriteBeerName: json['favoriteBeerName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userEmail': userEmail,
      'visitedPubIds': visitedPubIds,
      'visits': visits.map((v) => v.toJson()).toList(),
      'favoriteBeerName': favoriteBeerName,
    };
  }

  UserPassport copyWith({
    List<String>? visitedPubIds,
    List<BeerVisit>? visits,
    String? favoriteBeerName,
  }) {
    return UserPassport(
      userEmail: userEmail,
      visitedPubIds: visitedPubIds ?? this.visitedPubIds,
      visits: visits ?? this.visits,
      favoriteBeerName: favoriteBeerName ?? this.favoriteBeerName,
    );
  }
}

class Achievement {
  final String id;
  final String title;
  final String description;
  final String requirement;
  final String category; // "visits", "beers", "styles", "breweries", "special"
  final String iconName;
  final int progress;
  final int target;
  final bool unlocked;
  final DateTime? unlockedAt;

  Achievement({
    required this.id,
    required this.title,
    required this.description,
    required this.requirement,
    required this.category,
    required this.iconName,
    required this.progress,
    required this.target,
    required this.unlocked,
    this.unlockedAt,
  });
}
