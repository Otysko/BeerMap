// lib/services/storage_service.dart

import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class StorageService {
  static const String _userKey = 'pivnimapa_user';
  static const String _passportKey = 'pivnimapa_passport';

  // Loads the list of pubs from local pub asset JSON
  Future<List<Pub>> loadPubs() async {
    try {
      final String jsonStr = await rootBundle.loadString('assets/pubs_data.json');
      final List<dynamic> list = json.decode(jsonStr) as List;
      return list.map((item) => Pub.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      // In case we don't have the asset initialized or if loading fails, return a reliable mock list
      return [
        Pub(
          id: 'pub-1',
          name: 'Lokál Dlouhááá',
          lat: 50.090333,
          lng: 14.425983,
          address: 'Dlouhá 731/33, 110 00 Praha 1',
          notes: 'Legendární pražská pivnice proslulá špičkově ošetřenou plzní z tanků.',
          beers: [
            Beer(id: 'b-1', name: 'Pilsner Urquell', degrees: '12°', price: 64, style: 'Světlý ležák', brewery: 'Plzeňský Prazdroj'),
            Beer(id: 'b-2', name: 'Velkopopovický Kozel Černý', degrees: '10°', price: 58, style: 'Tmavé výčepní', brewery: 'Pivovar Velké Popovice')
          ]
        ),
        Pub(
          id: 'pub-2',
          name: 'Zlý časy',
          lat: 50.063812,
          lng: 14.444265,
          address: 'Čestmírova 390/5, 140 00 Praha 4',
          notes: 'Pub s divokou nabídkou piv z malých pivovarů na čepu.',
          beers: [
            Beer(id: 'b-3', name: 'Matuska Apollo Galaxy', degrees: '13°', price: 89, style: 'American Pale Ale (APA)', brewery: 'Pivovar Matuška'),
            Beer(id: 'b-4', name: 'Únětické Pivo Světlé', degrees: '10°', price: 52, style: 'Světlé výčepní', brewery: 'Únětický pivovar')
          ]
        )
      ];
    }
  }

  // Load profile from SharedPreferences
  Future<UserProfile?> loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_userKey);
    if (jsonStr == null) return null;
    try {
      return UserProfile.fromJson(json.decode(jsonStr) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // Save profile to SharedPreferences
  Future<void> saveProfile(UserProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, json.encode(profile.toJson()));
  }

  // Remove profile (Logout)
  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.remove(_passportKey);
  }

  // Load Passport from SharedPreferences or initialize default
  Future<UserPassport> loadPassport(String email) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_passportKey);
    if (jsonStr != null) {
      try {
        return UserPassport.fromJson(json.decode(jsonStr) as Map<String, dynamic>);
      } catch (_) {}
    }
    // Return empty fallback passport
    return UserPassport(
      userEmail: email,
      visitedPubIds: [],
      visits: [],
    );
  }

  // Save Passport to SharedPreferences
  Future<void> savePassport(UserPassport passport) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_passportKey, json.encode(passport.toJson()));
  }
}
