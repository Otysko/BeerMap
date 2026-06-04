// lib/services/achievements_service.dart

import 'dart:math';
import '../models/models.dart';

class AchievementsService {
  static List<Achievement> calculateAchievements(
    List<BeerVisit> visits,
    List<String> visitedPubIds,
  ) {
    final int uniquePubsCount = visitedPubIds.length;

    // Sort chronograph (ascending)
    final sortedVisits = List<BeerVisit>.from(visits)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    // Group visits per pub by calendar day to avoid multi-checking in on the same day
    final Map<String, Set<String>> pubDailyVisitSets = {};
    for (var v in sortedVisits) {
      pubDailyVisitSets.putIfAbsent(v.pubId, () => <String>{});
      // String date key representing local day (Y-M-D)
      final dateKey = "${v.timestamp.year}-${v.timestamp.month}-${v.timestamp.day}";
      pubDailyVisitSets[v.pubId]!.add(dateKey);
    }

    final Map<String, int> pubVisitCounts = {};
    pubDailyVisitSets.forEach((pubId, set) {
      pubVisitCounts[pubId] = set.length;
    });

    final int maxVisitsToOnePub = pubVisitCounts.isNotEmpty
        ? pubVisitCounts.values.reduce(max)
        : 0;

    final consumedBeers = sortedVisits.where((v) => v.beerName != null).toList();

    final Set<String> uniqueStyles = {};
    final Set<String> uniqueBreweries = {};
    final Set<String> uniqueDegrees = {};

    bool hadTen = false;
    bool hadEleven = false;
    bool hadTwelve = false;
    bool hadStrong = false; // >= 13
    bool hadNordic = false; // >= 15
    bool hadPlzen = false;
    bool hadIpaApa = false;
    bool hadDark = false;

    for (var v in consumedBeers) {
      if (v.style != null) uniqueStyles.add(v.style!.trim().toLowerCase());
      if (v.brewery != null) uniqueBreweries.add(v.brewery!.trim().toLowerCase());

      if (v.degrees != null) {
        final degStr = v.degrees!.trim();
        uniqueDegrees.add(degStr);
        final numDouble = double.tryParse(degStr.replaceAll("°", ""));
        if (numDouble != null) {
          if (numDouble == 10.0) hadTen = true;
          if (numDouble == 11.0) hadEleven = true;
          if (numDouble == 12.0) hadTwelve = true;
          if (numDouble >= 13.0) hadStrong = true;
          if (numDouble >= 15.0) hadNordic = true;
        }
      }

      if (v.brewery != null) {
        final bLower = v.brewery!.toLowerCase();
        if (bLower.contains("plzeň") || bLower.contains("prazdroj") || bLower.contains("břevnov")) {
          hadPlzen = true;
        }
      }
      if (v.beerName != null) {
        final bNameLower = v.beerName!.toLowerCase();
        if (bNameLower.contains("pilsner") || bNameLower.contains("plzeň")) {
          hadPlzen = true;
        }
      }

      if (v.style != null) {
        final sLower = v.style!.toLowerCase();
        if (sLower.contains("ipa") || sLower.contains("apa") || sLower.contains("pale ale") || sLower.contains("ejl")) {
          hadIpaApa = true;
        }
        if (sLower.contains("tmav") || sLower.contains("stout") || sLower.contains("čern") || sLower.contains("porter")) {
          hadDark = true;
        }
      }
    }

    bool hadNightBeer = false;
    bool hadMorningBeer = false;

    for (var v in sortedVisits) {
      final hour = v.timestamp.hour;
      if (hour >= 22 || hour < 4) {
        hadNightBeer = true;
      }
      if (hour >= 8 && hour < 12) {
        hadMorningBeer = true;
      }
    }

    final int stylesCount = uniqueStyles.length;
    final int breweriesCount = uniqueBreweries.length;

    // Timeline trigger detection
    DateTime? ach1Time = sortedVisits.isNotEmpty ? sortedVisits[0].timestamp : null;

    DateTime? ach2Time;
    final Map<String, Set<String>> dailyCounters = {};
    for (var v in sortedVisits) {
      dailyCounters.putIfAbsent(v.pubId, () => <String>{});
      final dayStr = "${v.timestamp.year}-${v.timestamp.month}-${v.timestamp.day}";
      dailyCounters[v.pubId]!.add(dayStr);
      if (dailyCounters[v.pubId]!.length == 3 && ach2Time == null) {
        ach2Time = v.timestamp;
      }
    }

    DateTime? ach3Time;
    DateTime? ach4Time;
    DateTime? ach5Time;
    DateTime? ach6Time;
    final Set<String> uniquePubsTracker = {};
    for (var v in sortedVisits) {
      uniquePubsTracker.add(v.pubId);
      if (uniquePubsTracker.length == 3 && ach3Time == null) ach3Time = v.timestamp;
      if (uniquePubsTracker.length == 5 && ach4Time == null) ach4Time = v.timestamp;
      if (uniquePubsTracker.length == 10 && ach5Time == null) ach5Time = v.timestamp;
      if (uniquePubsTracker.length == 15 && ach6Time == null) ach6Time = v.timestamp;
    }

    DateTime? findDegreesTimestamp(double value, {bool isGreaterOrEqual = false}) {
      for (var v in sortedVisits) {
        if (v.degrees == null) continue;
        final numVal = double.tryParse(v.degrees!.replaceAll("°", ""));
        if (numVal != null) {
          if (isGreaterOrEqual) {
            if (numVal >= value) return v.timestamp;
          } else {
            if (numVal == value) return v.timestamp;
          }
        }
      }
      return null;
    }

    final DateTime? ach7Time = findDegreesTimestamp(10);
    final DateTime? ach8Time = findDegreesTimestamp(11);
    final DateTime? ach9Time = findDegreesTimestamp(12);
    final DateTime? ach10Time = findDegreesTimestamp(13, isGreaterOrEqual: true);

    DateTime? ach11Time;
    DateTime? t10;
    DateTime? t11;
    DateTime? t12;
    for (var v in sortedVisits) {
      if (v.degrees != null) {
        final numVal = double.tryParse(v.degrees!.replaceAll("°", ""));
        if (numVal == 10.0 && t10 == null) t10 = v.timestamp;
        if (numVal == 11.0 && t11 == null) t11 = v.timestamp;
        if (numVal == 12.0 && t12 == null) t12 = v.timestamp;
      }
    }
    if (t10 != null && t11 != null && t12 != null) {
      final maxMs = [t10.millisecondsSinceEpoch, t11.millisecondsSinceEpoch, t12.millisecondsSinceEpoch].reduce(max);
      ach11Time = DateTime.fromMillisecondsSinceEpoch(maxMs);
    }

    DateTime? ach12Time;
    final Set<String> stylesSet12 = {};
    for (var v in sortedVisits) {
      if (v.style != null) {
        stylesSet12.add(v.style!.trim().toLowerCase());
        if (stylesSet12.length == 3 && ach12Time == null) ach12Time = v.timestamp;
      }
    }

    DateTime? ach13Time;
    for (var v in sortedVisits) {
      if (v.style != null) {
        final sLower = v.style!.toLowerCase();
        if (sLower.contains("ipa") || sLower.contains("apa") || sLower.contains("pale ale") || sLower.contains("ejl")) {
          ach13Time = v.timestamp;
          break;
        }
      }
    }

    DateTime? ach14Time;
    for (var v in sortedVisits) {
      if (v.style != null) {
        final sLower = v.style!.toLowerCase();
        if (sLower.contains("tmav") || sLower.contains("stout") || sLower.contains("čern") || sLower.contains("porter")) {
          ach14Time = v.timestamp;
          break;
        }
      }
    }

    DateTime? ach15Time;
    final Set<String> stylesSet15 = {};
    for (var v in sortedVisits) {
      if (v.style != null) {
        stylesSet15.add(v.style!.trim().toLowerCase());
        if (stylesSet15.length == 5 && ach15Time == null) ach15Time = v.timestamp;
      }
    }

    DateTime? ach16Time;
    final Set<String> breweriesSet16 = {};
    for (var v in sortedVisits) {
      if (v.brewery != null) {
        breweriesSet16.add(v.brewery!.trim().toLowerCase());
        if (breweriesSet16.length == 3 && ach16Time == null) ach16Time = v.timestamp;
      }
    }

    DateTime? ach17Time;
    final Set<String> breweriesSet17 = {};
    for (var v in sortedVisits) {
      if (v.brewery != null) {
        breweriesSet17.add(v.brewery!.trim().toLowerCase());
        if (breweriesSet17.length == 5 && ach17Time == null) ach17Time = v.timestamp;
      }
    }

    DateTime? ach18Time;
    for (var v in sortedVisits) {
      final hour = v.timestamp.hour;
      if (hour >= 22 || hour < 4) {
        ach18Time = v.timestamp;
        break;
      }
    }

    DateTime? ach19Time;
    for (var v in sortedVisits) {
      final hour = v.timestamp.hour;
      if (hour >= 8 && hour < 12) {
        ach19Time = v.timestamp;
        break;
      }
    }

    DateTime? ach20Time = findDegreesTimestamp(15, isGreaterOrEqual: true);

    // Dynamic builders
    final List<Map<String, dynamic>> bases = [
      {
        "id": "ach-1",
        "title": "První doušek",
        "description": "Zapiš svou první návštěvu v libovolné hospodě.",
        "requirement": "Navštiv aspoň 1 hospodu.",
        "category": "visits",
        "iconName": "glass_water",
        "target": 1,
        "progress": uniquePubsCount,
        "unlocked": uniquePubsCount >= 1,
        "unlockedAt": uniquePubsCount >= 1 ? ach1Time : null,
      },
      {
        "id": "ach-2",
        "title": "Štamgast v tréninku",
        "description": "Navštiv své oblíbené místo aspoň 3krát.",
        "requirement": "Zapiš 3 návštěvy v jedné konkrétní hospodě.",
        "category": "visits",
        "iconName": "home_work",
        "target": 3,
        "progress": maxVisitsToOnePub,
        "unlocked": maxVisitsToOnePub >= 3,
        "unlockedAt": maxVisitsToOnePub >= 3 ? ach2Time : null,
      },
      {
        "id": "ach-3",
        "title": "Pivní poutník",
        "description": "Prozkoumej aspoň 3 různé hospůdky na mapě.",
        "requirement": "Navštiv 3 unikátní hospody.",
        "category": "visits",
        "iconName": "explore",
        "target": 3,
        "progress": uniquePubsCount,
        "unlocked": uniquePubsCount >= 3,
        "unlockedAt": uniquePubsCount >= 3 ? ach3Time : null,
      },
      {
        "id": "ach-4",
        "title": "Zkušený cestovatel",
        "description": "Navštiv aspoň 5 různých hospod.",
        "requirement": "Navštiv 5 unikátních hospod.",
        "category": "visits",
        "iconName": "compass_calibration",
        "target": 5,
        "progress": uniquePubsCount,
        "unlocked": uniquePubsCount >= 5,
        "unlockedAt": uniquePubsCount >= 5 ? ach4Time : null,
      },
      {
        "id": "ach-5",
        "title": "Lovce píp",
        "description": "Navštiv celkem 10 různých hospod na mapě.",
        "requirement": "Navštiv 10 unikátních hospod.",
        "category": "visits",
        "iconName": "pin_drop",
        "target": 10,
        "progress": uniquePubsCount,
        "unlocked": uniquePubsCount >= 10,
        "unlockedAt": uniquePubsCount >= 10 ? ach5Time : null,
      },
      {
        "id": "ach-6",
        "title": "Prezidentská delegace",
        "description": "Dosáhni pivního nebe s 15 navštívenými hospodami (jako Václav Havel).",
        "requirement": "Navštiv 15 unikátních hospod.",
        "category": "visits",
        "iconName": "emoji_events",
        "target": 15,
        "progress": uniquePubsCount,
        "unlocked": uniquePubsCount >= 15,
        "unlockedAt": uniquePubsCount >= 15 ? ach6Time : null,
      },
      {
        "id": "ach-7",
        "title": "Desítkář",
        "description": "Dej si lehčí výčepní 10° na žízeň.",
        "requirement": "Ochutnej aspoň jedno pivo o stupňovitosti 10°.",
        "category": "beers",
        "iconName": "local_drink",
        "target": 1,
        "progress": hadTen ? 1 : 0,
        "unlocked": hadTen,
        "unlockedAt": ach7Time,
      },
      {
        "id": "ach-8",
        "title": "Jedenáctka je základ",
        "description": "Vychutnej si poctivou hořkou 11°.",
        "requirement": "Ochutnej aspoň jedno pivo o stupňovitosti 11°.",
        "category": "beers",
        "iconName": "local_drink",
        "target": 1,
        "progress": hadEleven ? 1 : 0,
        "unlocked": hadEleven,
        "unlockedAt": ach8Time,
      },
      {
        "id": "ach-9",
        "title": "Plzeňský patriot",
        "description": "Vypij klasický ležák 12°.",
        "requirement": "Ochutnej aspoň jedno pivo o stupňovitosti 12°.",
        "category": "beers",
        "iconName": "sports_bar",
        "target": 1,
        "progress": hadTwelve ? 1 : 0,
        "unlocked": hadTwelve,
        "unlockedAt": ach9Time,
      },
      {
        "id": "ach-10",
        "title": "Silný kalibr",
        "description": "Ochutnej silný speciál o stupňovitosti 13° nebo více.",
        "requirement": "Dej si pivo o síle 13° a vyšší.",
        "category": "beers",
        "iconName": "local_fire_department",
        "target": 1,
        "progress": hadStrong ? 1 : 0,
        "unlocked": hadStrong,
        "unlockedAt": ach10Time,
      },
      {
        "id": "ach-11",
        "title": "Znalec stupňů",
        "description": "Ochutnej kompletní trojici české klasiky: 10°, 11° i 12° pivo.",
        "requirement": "Zapiš si vypití 10°, 11° i 12°.",
        "category": "special",
        "iconName": "auto_awesome",
        "target": 3,
        "progress": (hadTen ? 1 : 0) + (hadEleven ? 1 : 0) + (hadTwelve ? 1 : 0),
        "unlocked": hadTen && hadEleven && hadTwelve,
        "unlockedAt": ach11Time,
      },
      {
        "id": "ach-12",
        "title": "Pivní chameleon",
        "description": "Ochutnej aspoň 3 různé pivní styly (např. Ležák, IPA, Stout).",
        "requirement": "Vypij piva 3 různých stylů.",
        "category": "styles",
        "iconName": "compare_arrows",
        "target": 3,
        "progress": stylesCount,
        "unlocked": stylesCount >= 3,
        "unlockedAt": ach12Time,
      },
      {
        "id": "ach-13",
        "title": "Svrchně kvašený fajnšmekr",
        "description": "Dej si pořádně chmelenou svrchně kvašenou IPU nebo APU.",
        "requirement": "Zapiš si pivo stylu IPA nebo APA.",
        "category": "styles",
        "iconName": "forest",
        "target": 1,
        "progress": hadIpaApa ? 1 : 0,
        "unlocked": hadIpaApa,
        "unlockedAt": ach13Time,
      },
      {
        "id": "ach-14",
        "title": "Tma jako v sudu",
        "description": "Ochutnej jedno tmavé pivo nebo stout plný kávových tónů.",
        "requirement": "Zapiš si jedno tmavé/černé pivo.",
        "category": "styles",
        "iconName": "nights_stay",
        "target": 1,
        "progress": hadDark ? 1 : 0,
        "unlocked": hadDark,
        "unlockedAt": ach14Time,
      },
      {
        "id": "ach-15",
        "title": "Cestovatel stylů",
        "description": "Objev rozmanitost a vyzkoušej aspoň 5 různých pivních stylů.",
        "requirement": "Vypij piva 5 různých stylů.",
        "category": "styles",
        "iconName": "public",
        "target": 5,
        "progress": stylesCount,
        "unlocked": stylesCount >= 5,
        "unlockedAt": ach15Time,
      },
      {
        "id": "ach-16",
        "title": "Sládkův učeň",
        "description": "Víš, odkud pivo teče. Zapiš piva ze 3 různých pivovarů.",
        "requirement": "Ochutnej piva ze 3 různých pivovarů.",
        "category": "breweries",
        "iconName": "military_tech",
        "target": 3,
        "progress": breweriesCount,
        "unlocked": breweriesCount >= 3,
        "unlockedAt": ach16Time,
      },
      {
        "id": "ach-17",
        "title": "Pivní baron",
        "description": "Ochutnej poctivé kousky od aspoň 5 různých pivovarů.",
        "requirement": "Ochutnej piva z 5 různých pivovarů.",
        "category": "breweries",
        "iconName": "gavel",
        "target": 5,
        "progress": breweriesCount,
        "unlocked": breweriesCount >= 5,
        "unlockedAt": ach17Time,
      },
      {
        "id": "ach-18",
        "title": "Noční pták",
        "description": "Dokonalé pivečko na dobrou noc těsně před zavíračkou.",
        "requirement": "Zapiš si pivo po 22:00 hodině večer.",
        "category": "special",
        "iconName": "brightness_2",
        "target": 1,
        "progress": hadNightBeer ? 1 : 0,
        "unlocked": hadNightBeer,
        "unlockedAt": ach18Time,
      },
      {
        "id": "ach-19",
        "title": "Ranní ptáče",
        "description": "Vyprošťovák nebo dopolední osvěžení k obědu.",
        "requirement": "Zapiš si pivo před 12:00 hodinou polední.",
        "category": "special",
        "iconName": "wb_sunny",
        "target": 1,
        "progress": hadMorningBeer ? 1 : 0,
        "unlocked": hadMorningBeer,
        "unlockedAt": ach19Time,
      },
      {
        "id": "ach-20",
        "title": "Vikingský roh",
        "description": "Ochutnej extrémně silný speciál se stupňovitostí 15° nebo více.",
        "requirement": "Vypij pivo o síle 15° a více.",
        "category": "special",
        "iconName": "hardware",
        "target": 1,
        "progress": hadNordic ? 1 : 0,
        "unlocked": hadNordic,
        "unlockedAt": ach20Time,
      }
    ];

    return bases.map((map) {
      return Achievement(
        id: map["id"] as String,
        title: map["title"] as String,
        description: map["description"] as String,
        requirement: map["requirement"] as String,
        category: map["category"] as String,
        iconName: map["iconName"] as String,
        progress: min(map["progress"] as int, map["target"] as int),
        target: map["target"] as int,
        unlocked: map["unlocked"] as bool,
        unlockedAt: map["unlockedAt"] as DateTime?,
      );
    }).toList();
  }
}
