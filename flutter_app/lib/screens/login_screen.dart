// lib/screens/login_screen.dart

import 'package:flutter/material.dart';
import '../models/models.dart';

class LoginScreen extends StatefulWidget {
  final Function(UserProfile) onLoginSuccess;

  const LoginScreen({
    super.key,
    required this.onLoginSuccess,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _nameController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _submitNormalLogin() {
    if (!_formKey.currentState!.validate()) return;

    final trimmedEmail = _emailController.text.trim();
    final trimmedName = _nameController.text.trim();

    // Custom check for blond male seed matching React login logic
    final isBlondMale = trimmedName.toLowerCase().contains("david") || trimmedName.toLowerCase().contains("kuncar");
    final avatarUrl = isBlondMale
        ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac'
        : 'https://api.dicebear.com/7.x/avataaars/svg?seed=${Uri.encodeComponent(trimmedName)}';

    final user = UserProfile(
      email: trimmedEmail,
      name: trimmedName,
      picture: avatarUrl,
    );

    widget.onLoginSuccess(user);
  }

  void _loginAsDavidPreset() {
    final user = UserProfile(
      email: "david.kuncar93@gmail.com",
      name: "David Kuncar",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac",
    );
    widget.onLoginSuccess(user);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16), // beautiful off-black slate
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Styled Beer Logo
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.08),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.amber.withOpacity(0.25), width: 1.5),
                ),
                child: const Icon(Icons.sports_bar_outlined, color: Colors.amber, size: 36),
              ),
              const SizedBox(height: 14),
              const Text(
                'PIVNÍ PAS & MAPA',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.black,
                  letterSpacing: 3,
                  color: Colors.amber,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Zapisuj vypitá piva a získávej unikátní mraky odznaků!',
                style: TextStyle(fontSize: 11, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),

              // Login Form Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    )
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      // Nickname field
                      TextFormField(
                        controller: _nameController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Tvoje Jméno / Přezdívka',
                          labelStyle: TextStyle(color: Colors.slate.shade450, fontSize: 11),
                          prefixIcon: const Icon(Icons.person_outline, size: 18, color: Colors.amber),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.slate.shade800),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Colors.amber),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Vyplň prosím jméno' : null,
                      ),
                      const SizedBox(height: 16),

                      // Email field
                      TextFormField(
                        controller: _emailController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        keyboardType: TextInputType.emailAddress,
                        decoration: InputDecoration(
                          labelText: 'E-mail (Pro synchronizaci pasu)',
                          labelStyle: TextStyle(color: Colors.slate.shade450, fontSize: 11),
                          prefixIcon: const Icon(Icons.alternate_email, size: 18, color: Colors.amber),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.slate.shade800),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Colors.amber),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (v) => v == null || !v.contains('@') ? 'Zadej platný e-mail' : null,
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber,
                          foregroundColor: Colors.black,
                          minimumSize: const Size(double.infinity, 48),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: _submitNormalLogin,
                        child: const Text('Založit nový pas / Vstoupit', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),
              const Row(
                children: [
                  Expanded(child: Divider(color: Colors.white10)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Text('NEBO RYCHLÝ VSTUP KOTVA', style: TextStyle(fontSize: 8.5, color: Colors.slate, fontWeight: FontWeight.bold)),
                  ),
                  Expanded(child: Divider(color: Colors.white10)),
                ],
              ),
              const SizedBox(height: 14),

              // Rychlý vstup preset button (David Kuncar)
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 45),
                  side: BorderSide(color: Colors.amber.withOpacity(0.3)),
                  foregroundColor: Colors.amber,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _loginAsDavidPreset,
                icon: const CircleAvatar(
                  radius: 11,
                  backgroundImage: NetworkImage('https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac'),
                ),
                label: const Text(
                  'Přihlásit se jako David Kuncar',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
