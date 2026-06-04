// lib/main.dart

import 'package:flutter/material.dart';
import 'models/models.dart';
import 'screens/login_screen.dart';
import 'screens/map_screen.dart';
import 'services/storage_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PivniMapaApp());
}

class PivniMapaApp extends StatefulWidget {
  const PivniMapaApp({super.key});

  @override
  State<PivniMapaApp> createState() => _PivniMapaAppState();
}

class _PivniMapaAppState extends State<PivniMapaApp> {
  final StorageService _storageService = StorageService();
  UserProfile? _currentUser;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkUserSession();
  }

  Future<void> _checkUserSession() async {
    final userProfile = await _storageService.loadProfile();
    setState(() {
      _currentUser = userProfile;
      _isLoading = false;
    });
  }

  void _handleLoginSuccess(UserProfile profile) async {
    await _storageService.saveProfile(profile);
    setState(() {
      _currentUser = profile;
    });
  }

  void _handleLogout() async {
    await _storageService.clearAuth();
    setState(() {
      _currentUser = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pivní Mapa & Pas',
      debugShowCheckedModeBanner: false,
      // Premium Slate-Dark Theme config matching dark CSS styles
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        primaryColor: Colors.amber,
        scaffoldBackgroundColor: const Color(0xFF090D16),
        colorScheme: const ColorScheme.dark(
          primary: Colors.amber,
          secondary: Colors.amberAccent,
          surface: Color(0xFF0F172A),
          background: Color(0xFF090D16),
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(fontFamily: 'Inter', color: Colors.white),
          bodyMedium: TextStyle(fontFamily: 'Inter', color: Colors.white70),
        ),
      ),
      home: _isLoading
          ? const Scaffold(
              body: Center(
                child: CircularProgressIndicator(color: Colors.amber),
              ),
            )
          : _currentUser == null
              ? LoginScreen(onLoginSuccess: _handleLoginSuccess)
              : MapScreen(user: _currentUser!, onLogout: _handleLogout),
    );
  }
}
