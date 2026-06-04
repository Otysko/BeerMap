// lib/screens/passport_screen.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/achievements_service.dart';

class PassportScreen extends StatefulWidget {
  final UserProfile userProfile;
  final UserPassport passport;
  final Function(UserProfile) onUpdateProfile;
  final VoidCallback onLogout;

  const PassportScreen({
    super.key,
    required this.userProfile,
    required this.passport,
    required this.onUpdateProfile,
    required this.onLogout,
  });

  @override
  State<PassportScreen> createState() => _PassportScreenState();
}

class _PassportScreenState extends State<PassportScreen> with SingleTickerProviderStateMixin {
  late UserProfile _currentProfile;
  late List<Achievement> _achievements;
  late TabController _tabController;

  bool _isEditingProfile = false;
  late TextEditingController _nameController;

  // Pagination limits requested by the user to avoid long scrolling lags
  int _placesLimit = 15;
  int _historyLimit = 15;

  // Curated list of awesome customizable avatars for the user to select from
  final List<Map<String, String>> _avatarsList = [
    {
      "id": "blonde_male",
      "name": "Štamgast (Blonďatý)",
      "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=blondeMaleUser&top[]=shortRound&hairColor[]=e8c170&skinColor[]=ffdbac"
    },
    {
      "id": "dark_male",
      "name": "Štamgast (Tmavovlasý)",
      "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=cernovlasyKluk&top[]=shortHair&hairColor[]=2c1b18&skinColor[]=ffdbac"
    },
    {
      "id": "blonde_female",
      "name": "Štamgastka",
      "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=blondynaStamgast&top[]=longHair&hairColor[]=e8c170&skinColor[]=ffdbac"
    },
    {
      "id": "initials",
      "name": "Moje Iniciály",
      "url": "https://api.dicebear.com/7.x/initials/svg?seed=Kuncar&backgroundColor=f59e0b&textColor=0f172a"
    },
    {
      "id": "pohar_gold",
      "name": "Zlatá koruna",
      "url": "https://api.dicebear.com/7.x/shapes/svg?seed=pivnikralcool&backgroundColor=f59e0b"
    },
    {
      "id": "retro_pixel",
      "name": "Retro Pixel",
      "url": "https://api.dicebear.com/7.x/pixel-art/svg?seed=beerhead&backgroundColor=6366f1"
    }
  ];

  @override
  void initState() {
    super.initState();
    _currentProfile = widget.userProfile;
    _nameController = TextEditingController(text: _currentProfile.name);
    _tabController = TabController(length: 4, vsync: this);

    _recomputeAchievements();
  }

  void _recomputeAchievements() {
    _achievements = AchievementsService.calculateAchievements(
      widget.passport.visits,
      widget.passport.visitedPubIds,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _saveProfileChanges() {
    final updatedProfile = _currentProfile.copyWith(
      name: _nameController.text.trim().isNotEmpty 
          ? _nameController.text.trim() 
          : _currentProfile.name,
    );
    widget.onUpdateProfile(updatedProfile);
    setState(() {
      _currentProfile = updatedProfile;
      _isEditingProfile = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Basic stats calculation
    final totalVisits = widget.passport.visits.length;
    final totalUniquePubs = widget.passport.visitedPubIds.length;
    final unlockedAchievementsCount = _achievements.where((a) => a.unlocked).length;

    return WillPopScope(
      onWillPop: () async {
        Navigator.pop(context, widget.passport);
        return false;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF090D16),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text(
            'MŮJ PIVNÍ PAS',
            style: TextStyle(
              fontWeight: FontWeight.black,
              letterSpacing: 2,
              fontSize: 16,
              color: Colors.amber,
            ),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.amber),
            onPressed: () => Navigator.pop(context, widget.passport),
          ),
          actions: [
            TextButton.icon(
              statusBar: widget.onLogout,
              onPressed: () {
                _confirmLogout();
              },
              icon: const Icon(Icons.logout, color: Colors.redAccent, size: 16),
              label: const Text(
                'Odhlásit',
                style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            )
          ],
        ),
        body: Column(
          children: [
            // 👤 Premium Profile customizer Header card
            _buildProfileCard(),

            // Profile Editor accordion modal
            if (_isEditingProfile) _buildProfileEditor(),

            // Quick Counter Grid (Stats Overview)
            _buildMiniMetricsPanel(totalVisits, totalUniquePubs, unlockedAchievementsCount),

            // Tab navigation setup
            Container(
              color: const Color(0xFF0F172A),
              child: TabBar(
                controller: _tabController,
                indicatorColor: Colors.amber,
                labelColor: Colors.amber,
                unselectedLabelColor: Colors.grey.shade500,
                labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 0.5),
                tabs: const [
                  Tab(text: 'ODZNAKY', icon: Icon(Icons.military_tech, size: 18)),
                  Tab(text: 'MÍSTA', icon: Icon(Icons.map_outlined, size: 18)),
                  Tab(text: 'STATISTIKY', icon: Icon(Icons.analytics_outlined, size: 18)),
                  Tab(text: 'HISTORIE', icon: Icon(Icons.history, size: 18)),
                ],
              ),
            ),

            // Body content views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildAchievementsTab(),
                  _buildVisitedPlacesTab(),
                  _buildStatsTab(),
                  _buildVisitsHistoryTab(),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Hero(
            tag: 'passportAvatar',
            child: CircleAvatar(
              radius: 30,
              backgroundColor: Colors.amber.withOpacity(0.1),
              backgroundImage: _currentProfile.picture != null
                  ? NetworkImage(_currentProfile.picture!)
                  : null,
              child: _currentProfile.picture == null
                  ? const Icon(Icons.person, size: 30, color: Colors.amber)
                  : null,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _currentProfile.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  _currentProfile.email,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.slate.shade400,
                  ),
                ),
              ],
            ),
          ),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.amber,
              side: BorderSide(color: Colors.amber.withOpacity(0.3)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
            ),
            onPressed: () {
              setState(() {
                _isEditingProfile = !_isEditingProfile;
              });
            },
            icon: const Icon(Icons.edit, size: 12),
            label: const Text('PROFIL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  Widget _buildProfileEditor() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF050811),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'NASTAVENÍ ŠTAMGASTA',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.amber,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _nameController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              labelText: 'Změnit přezdívku',
              labelStyle: TextStyle(color: Colors.slate.shade500, fontSize: 12),
              enabledBorder: OutlineInputBorder(
                borderSide: BorderSide(color: Colors.slate.shade800),
                borderRadius: BorderRadius.circular(10),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Colors.amber),
                borderRadius: BorderRadius.circular(10),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Zvolit vzhled avataru:',
            style: TextStyle(fontSize: 10, color: Colors.slate),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 55,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _avatarsList.length,
              itemBuilder: (context, idx) {
                final av = _avatarsList[idx];
                final isSelected = _currentProfile.picture == av['url'];
                return GestureDetector(
                  onTap: () {
                    final updated = _currentProfile.copyWith(picture: av['url']);
                    widget.onUpdateProfile(updated);
                    setState(() {
                      _currentProfile = updated;
                    });
                  },
                  child: Container(
                    width: 50,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? Colors.amber : Colors.slate.shade800,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: Image.network(av['url']!, fit: BoxFit.contain),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () {
                  setState(() {
                    _isEditingProfile = false;
                    _nameController.text = _currentProfile.name;
                  });
                },
                child: const Text('Zrušit', style: TextStyle(color: Colors.grey)),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.amber),
                onPressed: _saveProfileChanges,
                child: const Text('Uložit', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildMiniMetricsPanel(int totalVisits, int totalUniquePubs, int unlockedAchievements) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      color: const Color(0xFF050811),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _miniStatColumn('CELKEM NÁVŠTĚV', totalVisits.toString(), 'pivních polí'),
          _miniStatColumn('HOSPŮDEK', totalUniquePubs.toString(), 'zapsaných míst'),
          _miniStatColumn('ODZNAKŮ', "$unlockedAchievements/${_achievements.length}", 'zavěšeno'),
        ],
      ),
    );
  }

  Widget _miniStatColumn(String label, String value, String unit) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 9, fontWeight: FontWeight.black, color: Colors.slate.shade500, letterSpacing: 0.5),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.black, color: Colors.amber),
        ),
        Text(
          unit,
          style: TextStyle(fontSize: 8, color: Colors.slate.shade600),
        ),
      ],
    );
  }

  Widget _buildAchievementsTab() {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.88,
      ),
      itemCount: _achievements.length,
      itemBuilder: (context, idx) {
        final a = _achievements[idx];
        return Container(
          decoration: BoxDecoration(
            color: a.unlocked ? const Color(0xFF0F172A) : const Color(0xFF0D1220).withOpacity(0.4),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: a.unlocked 
                  ? Colors.amber.withOpacity(0.2) 
                  : Colors.slate.shade900,
            ),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  Icon(
                    _getBadgeIcon(a.iconName),
                    color: a.unlocked ? Colors.amber : Colors.slate.shade700,
                    size: 26,
                  ),
                  if (a.unlocked)
                    const Icon(Icons.verified, size: 16, color: Colors.amber)
                  else
                    const Icon(Icons.lock_outline, size: 14, color: Colors.slate),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                a.title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.black,
                  color: a.unlocked ? Colors.white : Colors.grey.shade600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Expanded(
                child: Text(
                  a.description,
                  style: TextStyle(
                    fontSize: 9.5,
                    color: a.unlocked ? Colors.slate.shade400 : Colors.slate.shade700,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 6),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: a.target > 0 ? a.progress / a.target : 0,
                      color: Colors.amber,
                      backgroundColor: Colors.white10,
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Text(
                        "${a.progress}/${a.target}",
                        style: TextStyle(fontSize: 8.5, color: Colors.slate.shade500, fontWeight: FontWeight.bold),
                      ),
                      if (a.unlocked && a.unlockedAt != null)
                        Text(
                          DateFormat('d. M. yyyy').format(a.unlockedAt!),
                          style: TextStyle(fontSize: 7.5, color: Colors.amber.withOpacity(0.6)),
                        ),
                    ],
                  )
                ],
              )
            ],
          ),
        );
      },
    );
  }

  // Smart matching of Icons
  IconData _getBadgeIcon(String name) {
    switch (name) {
      case 'glass_water':
        return Icons.local_cafe;
      case 'home_work':
        return Icons.house_outlined;
      case 'explore':
        return Icons.explore_outlined;
      case 'compass_calibration':
        return Icons.compass_calibration_outlined;
      case 'pin_drop':
        return Icons.pin_drop_outlined;
      case 'emoji_events':
        return Icons.emoji_events_outlined;
      case 'local_drink':
        return Icons.local_drink;
      case 'sports_bar':
        return Icons.sports_bar;
      case 'local_fire_department':
        return Icons.local_fire_department_outlined;
      case 'auto_awesome':
        return Icons.auto_awesome;
      case 'compare_arrows':
        return Icons.compare_arrows;
      case 'forest':
        return Icons.park;
      case 'nights_stay':
        return Icons.nights_stay;
      case 'public':
        return Icons.public;
      default:
        return Icons.stars;
    }
  }

  Widget _buildVisitedPlacesTab() {
    final visits = widget.passport.visits;
    if (visits.isEmpty) {
      return const Center(
        child: Text('Zatím žádné navštívené hospody', style: TextStyle(color: Colors.slate)),
      );
    }

    // Dynamic processing of unique places visited
    final Map<String, List<BeerVisit>> pubGroups = {};
    for (var v in visits) {
      pubGroups.putIfAbsent(v.pubId, () => []).add(v);
    }

    final uniquePubs = pubGroups.keys.toList();
    final paginatedPubs = uniquePubs.take(_placesLimit).toList();

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        ...paginatedPubs.map((pubId) {
          final pubVisits = pubGroups[pubId]!;
          final pubName = pubVisits.first.pubName;
          final uniqueDaysCount = pubVisits.map((v) => "${v.timestamp.year}-${v.timestamp.month}-${v.timestamp.day}").toSet().length;

          final uniqueBeers = pubVisits
              .where((v) => v.beerName != null)
              .map((v) => "${v.beerName} (${v.degrees ?? '12°'})")
              .toSet()
              .join(', ');

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber.withOpacity(0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Text(
                      pubName,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    Text(
                      '★ ${uniqueDaysCount}x návštěva',
                      style: const TextStyle(fontSize: 11, color: Colors.amber, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                if (uniqueBeers.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Piva: $uniqueBeers',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontStyle: FontStyle.italic),
                  ),
                ],
              ],
            ),
          );
        }),

        if (uniquePubs.length > _placesLimit)
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 18),
            child: TextButton(
              style: TextButton.styleFrom(
                backgroundColor: Colors.amber.withOpacity(0.06),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                setState(() {
                  _placesLimit += 15;
                });
              },
              child: Text(
                'Načíst dalších 15 hospod (${uniquePubs.length - _placesLimit} zbývá)',
                style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.black, fontSize: 11),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildStatsTab() {
    final visits = widget.passport.visits;
    if (visits.isEmpty) {
      return const Center(child: Text('Tady se ukážou statistiky až zapíšeš pivo! 📊', style: TextStyle(color: Colors.slate)));
    }

    // Top style calculation
    final Map<String, int> stylesCount = {};
    for (var v in visits) {
      if (v.style != null) {
        stylesCount[v.style!] = (stylesCount[v.style!] ?? 0) + 1;
      }
    }
    String topStyle = 'Žádné zapsané pivo';
    if (stylesCount.isNotEmpty) {
      topStyle = stylesCount.entries.reduce((a, b) => a.value > b.value ? a : b).key;
    }

    // Hourly Rhythm calculation
    final Map<int, int> hoursCount = {};
    for (var v in visits) {
      hoursCount[v.timestamp.hour] = (hoursCount[v.timestamp.hour] ?? 0) + 1;
    }
    String peakHourRange = 'Žádné zapsané pivo';
    if (hoursCount.isNotEmpty) {
      final peakHour = hoursCount.entries.reduce((a, b) => a.value > b.value ? a : b).key;
      peakHourRange = "$peakHour:00 - ${peakHour + 1}:00";
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildMetricRow('HLAVNÍ PIVNÍ STYL', topStyle, Icons.local_bar),
        _buildMetricRow('HLAVNÍ AKTIVITA (KLUB RYTMUS)', peakHourRange, Icons.query_builder),
        _buildMetricRow('UNIKÁTNÍCH STYLŮ', stylesCount.length.toString(), Icons.dashboard_customize_outlined),
        _buildMetricRow('OBECNÝ FAVORIT', widget.passport.favoriteBeerName ?? 'Nezvoleno', Icons.favorite_outline),
      ],
    );
  }

  Widget _buildMetricRow(String label, String value, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.amber, size: 28),
          const SizedBox(width: 14),
          CrossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.black, color: Colors.slate.shade500, letterSpacing: 0.5)),
            const SizedBox(height: 3),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ],
      ),
    );
  }

  Widget _buildVisitsHistoryTab() {
    final visits = widget.passport.visits;
    if (visits.isEmpty) {
      return const Center(child: Text('Zatím žádné záznamy v historii', style: TextStyle(color: Colors.slate)));
    }

    final sortedVisits = List<BeerVisit>.from(visits)..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    final paginatedVisits = sortedVisits.take(_historyLimit).toList();

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        ...paginatedVisits.map((visit) {
          final dateStr = DateFormat('d. M. yyyy, H:mm').format(visit.timestamp);
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.slate.shade900),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            dateStr,
                            style: TextStyle(fontSize: 9, color: Colors.slate.shade400, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '|',
                            style: TextStyle(fontSize: 10, color: Colors.slate.shade700),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              visit.pubName,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber),
                              overflow: TextOverflow.ellipsis,
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        visit.beerName != null
                            ? "${visit.beerName} (${visit.degrees ?? '12°'}) od ${visit.brewery ?? 'Neznámý'}"
                            : "Uliční návštěva (Čistá návštěva bez piva)",
                        style: const TextStyle(fontSize: 11, color: Colors.white),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Deletion button setup
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 18),
                  onPressed: () {
                    _confirmDeleteVisit(visit);
                  },
                )
              ],
            ),
          );
        }),

        if (sortedVisits.length > _historyLimit)
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 18),
            child: TextButton(
              style: TextButton.styleFrom(
                backgroundColor: Colors.amber.withOpacity(0.06),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                setState(() {
                  _historyLimit += 15;
                });
              },
              child: Text(
                'Načíst dalších 15 záznamů (${sortedVisits.length - _historyLimit} zbývá)',
                style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.black, fontSize: 11),
              ),
            ),
          ),
      ],
    );
  }

  void _confirmDeleteVisit(BeerVisit visit) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('Smazat návštěvu?', style: TextStyle(color: Colors.white, fontSize: 16)),
        content: Text('Opravdu si přeješ vymazat záznam z ${visit.pubName}?', style: const TextStyle(color: Colors.slate)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Ne', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.amber),
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                widget.passport.visits.removeWhere((v) => v.id == visit.id);
                _recomputeAchievements();
              });
            },
            child: const Text('Smazat', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('Odhlásit se?', style: TextStyle(color: Colors.white, fontSize: 16)),
        content: const Text('Tím se odhlásíš a budeš muset zadat jméno znovu.', style: TextStyle(color: Colors.slate)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Vrátit se', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(context);
              widget.onLogout();
            },
            child: const Text('Odhlásit', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }
}
