// lib/screens/chat_screen.dart

import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ChatMessage {
  final String role; // "user" or "model" (Gemini format)
  final String text;
  final String timestamp;

  ChatMessage({
    required this.role,
    required this.text,
    required this.timestamp,
  });
}

class ChatScreen extends StatefulWidget {
  final UserProfile userProfile;
  final UserPassport passport;
  final List<Pub> pubs;

  const ChatScreen({
    super.key,
    required this.userProfile,
    required this.passport,
    required this.pubs,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Curated beer-centric dynamic Czech suggestions
  final List<Map<String, String>> _allPresets = [
    { 'label': '💰 Levné pivo?', 'text': 'Ukaž mi nejlevnější piva na mapě a kolik stojí.' },
    { 'label': '🍺 Hladinka vs. Šnyt?', 'text': 'Vysvětli mi české styly čepování: hladinka, šnyt, mlíko a čochtan.' },
    { 'label': '🥩 Co k svíčkové?', 'text': 'Jaké pivo se nejlépe hodí k tradiční svíčkové na smetaně?' },
    { 'label': '🥖 Co k hermelínu?', 'text': 'Doporuč mi nejvhodnější pivo k nakládanému hermelínu.' },
    { 'label': '🏰 Historie piva', 'text': 'Pověz mi stručnou historii vaření piva v českých zemích.' },
    { 'label': '🌾 Svrchní kvašení?', 'text': 'Jaký je rozdíl mezi svrchně a spodně kvašeným pivem?' },
    { 'label': '🧼 Čisté sklo?', 'text': 'Podle čeho poznám, že je sklenice na pivo v hospodě opravdu perfektně čistá?' },
    { 'label': '🍺 Stupňovitost piva?', 'text': 'Co přesně vyjadřuje stupňovitost piva (např. 12°) a kolik má pak alkoholu?' },
    { 'label': '🚫 Nealko pivo?', 'text': 'Z čeho a jak se vyrábí nealkoholické pivo a chutná dnes už stejně?' },
    { 'label': '🥴 Na kocovinu?', 'text': 'Dej mi nejlepší hospodské rady a vyprošťováky na ranní kocovinu podle starých štamgastů.' },
    { 'label': '🍺 Tankové pivo?', 'text': 'V čem je tankové pivo lepší než pivo z klasických sudů?' },
    { 'label': '🍽️ Pivní guláš?', 'text': 'Dej mi bleskový recept na poctivý domácí pivní guláš z hovězí kližky.' }
  ];

  List<Map<String, String>> _currentPresets = [];

  @override
  void initState() {
    super.initState();
    _randomizePresets();
    _addInitialGreeting();
  }

  void _randomizePresets() {
    final rand = Random();
    final List<Map<String, String>> pool = List.from(_allPresets);
    
    // Add dynamic query based on personalized favorite beer if set
    final String fav = widget.passport.favoriteBeerName?.trim() ?? '';
    final String targetBeer = fav.isNotEmpty ? fav : 'Plzeň';
    final favQuery = {
      'label': '🔍 Kde točí $targetBeer?',
      'text': 'Zkontroluj v naší databázi, ve kterých hospodách čepují pivo $targetBeer.'
    };

    // Shuffle and pick 3, then insert the favorite beer option
    pool.shuffle(rand);
    final selected = pool.take(3).toList();
    selected.insert(0, favQuery);
    selected.shuffle(rand);

    setState(() {
      _currentPresets = selected;
    });
  }

  void _addInitialGreeting() {
    final String dateString = _getFormattedTime();
    setState(() {
      _messages.add(ChatMessage(
        role: "model",
        text: "Dej bůh štěstí, ${widget.userProfile.name}! 🍺 Vítám tě v našem virtuálním lokále.\n\n"
              "Jsem **Hospodský Kecal** — tvůj věrný pivní kumpán a rádce. Znám historii zlatavého moku, vím, kam zajít na poctivý nefiltr, jaké jídlo si spláchnout dvanáctkou, i jak rozeznat skvěle ošetřené pivo.\n\n"
              "Mám přehled i o našich hospůdkách na mapě! Zeptej se mě třeba:\n- *Kde vaří nejvstřícnější Plzeň?*\n- *Kam zajít na svrchně kvašené pivo?*\n- *Která hospoda je nejlevnější?*\n\nCopak si dáš za radu dneska?",
        timestamp: dateString,
      ));
    });
  }

  String _getFormattedTime() {
    final now = DateTime.now();
    return "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? presetText]) async {
    final String text = presetText ?? _messageController.text.trim();
    if (text.isEmpty || _isLoading) return;

    if (presetText == null) {
      _messageController.clear();
    }

    final String timeStr = _getFormattedTime();
    final userMessage = ChatMessage(
      role: "user",
      text: text,
      timestamp: timeStr,
    );

    setState(() {
      _messages.add(userMessage);
      _isLoading = true;
      _errorMessage = null;
    });
    _scrollToBottom();

    try {
      // Build conversation payload in representation matching standard model structure
      final List<Map<String, dynamic>> payloadHistory = _messages.map((m) => {
        'role': m.role,
        'text': m.text,
      }).toList();

      // Resolve the host address dynamically based on available configuration. We point to the active Cloud Run proxy url!
      const String apiEndpoint = 'https://ais-dev-ghlm65tkw7mr47uocxxltf-655544446575.europe-west2.run.app/api/gemini/chat';

      // We pass simulated current location of Prague coordinate focus or empty if unavailable
      final response = await http.post(
        Uri.parse(apiEndpoint),
        headers: { 'Content-Type': 'application/json' },
        body: json.encode({
          'messages': payloadHistory,
          'userLatLng': { 'lat': 50.082725, 'lng': 14.425983 }
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(utf8.decode(response.bodyBytes));
        final String reply = data['text'] ?? "Inu, nějak mě u pípy zaskočilo. Zkus to prosím znovu.";
        
        setState(() {
          _messages.add(ChatMessage(
            role: "model",
            text: reply,
            timestamp: _getFormattedTime(),
          ));
        });
      } else {
        throw Exception("Server returned code ${response.statusCode}");
      }
    } catch (e) {
      // Graceful offline fallback behavior so the user always has a responsive app Experience
      setState(() {
        _errorMessage = "Sakra, trefil mě průvan u dveří a ztratil jsem hlas! Zkontroluj připojení nebo zkus zprávu poslat znova.";
        _messages.add(ChatMessage(
          role: "model",
          text: "Sakra, kamaráde, vypadl mi u pípy proud a nemůžu se spojit se svým pivním archivem! 🔌 "
                "Budu muset propláchnout trubky. Ale neboj, mezitím si v klidu prohlížej mapu a zapiš si nějaké pivečko do pivního pasu. "
                "Až se internet umoudří, pokecáme u vychlazeného kousku!",
          timestamp: _getFormattedTime(),
        ));
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _clearChatHistory() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('Vymazat rozhovor?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: const Text(
          'Chceš opravdu smazat historii povídání s výčepním a začít s čistým stolem?',
          style: TextStyle(color: Colors.slate),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Zrušit', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _messages.clear();
                _errorMessage = null;
                _addInitialGreeting();
              });
            },
            child: const Text('Smazat'),
          ),
        ],
      ),
    );
  }

  // Beautiful custom parser inside Flutter to render **bold text** without extra dependency overhead
  Widget _renderMessageText(String text, bool isUser) {
    final List<TextSpan> spans = [];
    final matches = text.split(/(\*\*.*?\*\*)/g);

    for (var part in matches) {
      if (part.startsWith('**') && part.endsWith('**')) {
        spans.add(TextSpan(
          text: part.substring(2, part.length - 2),
          style: const TextStyle(
            fontWeight: FontWeight.black,
            color: Colors.amber, 
          ),
        ));
      } else {
        spans.add(TextSpan(
          text: part,
          style: TextStyle(
            color: isUser ? Colors.white : Colors.slate.shade100,
          ),
        ));
      }
    }

    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 14, height: 1.45),
        children: spans,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.amber),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.amber,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.psychology, color: Colors.black, size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'HOSPODSKÝ KECAL',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.black,
                    letterSpacing: 1.5,
                    color: Colors.amber,
                  ),
                ),
                Text(
                  '● AI pivní znalec online',
                  style: TextStyle(
                    fontSize: 9,
                    color: Colors.emeraldAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined, color: Colors.grey),
            tooltip: 'Smazat chat',
            onPressed: _clearChatHistory,
          ),
        ],
      ),
      body: Column(
        children: [
          // 💬 Chronological Messages Stream
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final bool isUser = msg.role == "user";

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (!isUser) ...[
                        const CircleAvatar(
                          radius: 15,
                          backgroundColor: Color(0xFF1E293B),
                          child: Icon(Icons.sports_bar, size: 15, color: Colors.amber),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isUser ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                              bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                            ),
                            border: Border.all(
                              color: isUser ? Colors.amber.withOpacity(0.05) : Colors.amber.withOpacity(0.12),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    isUser ? 'Vy' : 'Hospodský Kecal',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isUser ? Colors.grey.shade400 : Colors.amber,
                                    ),
                                  ),
                                  const SizedBox(width: 25),
                                  Text(
                                    msg.timestamp,
                                    style: TextStyle(fontSize: 9, color: Colors.grey.shade500),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              _renderMessageText(msg.text, isUser),
                            ],
                          ),
                        ),
                      ),
                      if (isUser) const SizedBox(width: 25), // keep small padding on right for user
                    ],
                  ),
                );
              },
            ),
          ),

          // ⏳ Bartender Thinking Indicator
          if (_isLoading)
            Container(
              padding: const EdgeInsets.all(12),
              color: Colors.black.withOpacity(0.15),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(color: Colors.amber, strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Výčepní urovnává myšlenky u pípy...',
                    style: TextStyle(color: Colors.amber, fontSize: 11, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),

          // ⚠️ Error Warning Alert banner
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: Colors.red.withOpacity(0.15),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.redAccent, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),

          // 💡 Quick Suggesions Panel (Quick Prompts)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(top: BorderSide(color: Colors.white10)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'RYCHLÉ DOTAZY K PIVU:',
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.black, color: Colors.grey, letterSpacing: 0.5),
                    ),
                    InkWell(
                      onTap: _randomizePresets,
                      child: const Row(
                        children: [
                          Icon(Icons.refresh, color: Colors.amber, size: 11),
                          SizedBox(width: 3),
                          Text(
                            'PROTOČIT',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.amber),
                          )
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _currentPresets.map((preset) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ActionChip(
                          backgroundColor: const Color(0xFF1E293B),
                          side: const BorderSide(color: Colors.white12),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          label: Text(
                            preset['label']!,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                          onPressed: () => _sendMessage(preset['text']),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // 💬 Message Input Textbar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            color: const Color(0xFF0D111A),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Napiš kecalovi otázku...',
                        hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        fillColor: const Color(0xFF1A1F2C),
                        filled: true,
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Colors.amber),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Colors.white10),
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: () => _sendMessage(),
                    child: Container(
                      height: 44,
                      width: 44,
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.amber.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          )
                        ],
                      ),
                      child: const Icon(Icons.send, color: Colors.black, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
