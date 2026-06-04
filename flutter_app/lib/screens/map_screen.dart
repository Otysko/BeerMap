// lib/screens/map_screen.dart

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/models.dart';
import '../services/storage_service.dart';
import '../widgets/check_in_dialog.dart';
import 'passport_screen.dart';
import 'chat_screen.dart';

class MapScreen extends StatefulWidget {
  final UserProfile user;
  final VoidCallback onLogout;

  const MapScreen({
    super.key,
    required this.user,
    required this.onLogout,
  });

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final StorageService _storageService = StorageService();
  late UserProfile _currentUser;
  late UserPassport _passport;
  List<Pub> _pubs = [];
  bool _isLoading = true;

  GoogleMapController? _mapController;
  final Set<Marker> _markers = {};
  Pub? _selectedPub;

  // 🍺 Interactive Filters
  final TextEditingController _searchController = TextEditingController();
  bool _isFiltersVisible = false;
  String _searchQuery = '';
  double _maxPrice = 120.0;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Pub> get _filteredPubs {
    return _pubs.where((pub) {
      // 1. Text / Beer Search Matcher
      final query = _searchQuery.toLowerCase().trim();
      final matchesQuery = query.isEmpty ||
          pub.name.toLowerCase().contains(query) ||
          (pub.address ?? '').toLowerCase().contains(query) ||
          (pub.notes ?? '').toLowerCase().contains(query) ||
          pub.beers.any((b) =>
              b.name.toLowerCase().contains(query) ||
              (b.style ?? '').toLowerCase().contains(query) ||
              (b.brewery ?? '').toLowerCase().contains(query));

      // 2. Maximum Price Matcher
      final matchesPrice = pub.beers.isEmpty ||
          pub.beers.any((b) => b.price <= _maxPrice);

      return matchesQuery && matchesPrice;
    }).toList();
  }

  // Prague coordinate focus as default
  static const CameraPosition _initialCamera = CameraPosition(
    target: LatLng(50.082725, 14.425983),
    zoom: 13.0,
  );

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
    _loadInitialState();
  }

  Future<void> _loadInitialState() async {
    setState(() => _isLoading = true);
    final loadedPubs = await _storageService.loadPubs();
    final loadedPassport = await _storageService.loadPassport(_currentUser.email);

    setState(() {
      _pubs = loadedPubs;
      _passport = loadedPassport;
      _isLoading = false;
    });

    _buildMapMarkers();
  }

  void _buildMapMarkers() {
    final newMarkers = _filteredPubs.map((pub) {
      return Marker(
        markerId: MarkerId(pub.id),
        position: LatLng(pub.lat, pub.lng),
        infoWindow: InfoWindow(
          title: pub.name,
          snippet: pub.beers.map((b) => "${b.name} (${b.degrees})").join(', '),
        ),
        onTap: () {
          setState(() {
            _selectedPub = pub;
          });
        },
      );
    }).toSet();

    setState(() {
      _markers.clear();
      _markers.addAll(newMarkers);
    });
  }

  void _openPassport() async {
    final updatedPassport = await Navigator.push<UserPassport>(
      context,
      MaterialPageRoute(
        builder: (context) => PassportScreen(
          userProfile: _currentUser,
          passport: _passport,
          onUpdateProfile: (updatedUser) async {
            await _storageService.saveProfile(updatedUser);
            setState(() {
              _currentUser = updatedUser;
            });
          },
          onLogout: widget.onLogout,
        ),
      ),
    );

    if (updatedPassport != null) {
      setState(() {
        _passport = updatedPassport;
      });
    }
  }

  void _triggerCheckIn(Pub pub) {
    showDialog(
      context: context,
      builder: (context) => CheckInDialog(
        pub: pub,
        onCheckIn: (beer) async {
          // Add new visit
          final newVisit = BeerVisit(
            id: 'visit-${DateTime.now().millisecondsSinceEpoch}',
            pubId: pub.id,
            pubName: pub.name,
            beerId: beer?.id,
            beerName: beer?.name,
            degrees: beer?.degrees,
            style: beer?.style,
            brewery: beer?.brewery,
            timestamp: DateTime.now(),
          );

          final updatedVisits = List<BeerVisit>.from(_passport.visits)..add(newVisit);
          final updatedPubIds = Set<String>.from(_passport.visitedPubIds)..add(pub.id);

          final updatedPassport = _passport.copyWith(
            visits: updatedVisits,
            visitedPubIds: updatedPubIds.toList(),
          );

          await _storageService.savePassport(updatedPassport);
          setState(() {
            _passport = updatedPassport;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.amber.shade700,
              content: Text(
                beer != null 
                  ? 'Pivo ${beer.name} úspěšně zapsáno do pasu! 🍻'
                  : 'Návštěva v ${pub.name} úspěšně zapsána! 📍',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19), // premium dark slate UI
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.amber))
          : Stack(
              children: [
                // 🗺️ Interactive Google Maps Layer
                GoogleMap(
                  style: _mapDarkStyle,
                  initialCameraPosition: _initialCamera,
                  markers: _markers,
                  onMapCreated: (controller) {
                    _mapController = controller;
                  },
                  onTap: (_) {
                    setState(() {
                      _selectedPub = null;
                    });
                  },
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                ),

                // 🏷️ Top Branded Header with Search & Filters
                Positioned(
                  top: MediaQuery.of(context).padding.top + 10,
                  left: 15,
                  right: 15,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header Card with Brand info + Search input
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A).withOpacity(0.94),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.amber.withOpacity(0.18)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.45),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            )
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // 1st Row: App logo + brand title + profile avatar
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.sports_bar_outlined, color: Colors.amber, size: 22),
                                    SizedBox(width: 8),
                                    Text(
                                      'PIVNÍ MAPA',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.black,
                                        letterSpacing: 1.5,
                                        color: Colors.amber,
                                      ),
                                    ),
                                  ],
                                ),
                                // Profile trigger avatar
                                GestureDetector(
                                  onTap: _openPassport,
                                  child: Hero(
                                    tag: 'passportAvatar',
                                    child: Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.amber, width: 2),
                                        image: _currentUser.picture != null
                                            ? DecorationImage(
                                                image: NetworkImage(_currentUser.picture!),
                                                fit: BoxFit.cover,
                                              )
                                            : null,
                                      ),
                                      child: _currentUser.picture == null
                                          ? const Icon(Icons.person, color: Colors.amber)
                                          : null,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            const Divider(color: Colors.white10, height: 1),
                            const SizedBox(height: 10),
                            // 2nd Row: Search text field + toggle filters wheel
                            Row(
                              children: [
                                const Icon(Icons.search, color: Colors.amber, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: (val) {
                                      setState(() {
                                        _searchQuery = val;
                                      });
                                      _buildMapMarkers();
                                    },
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                    decoration: InputDecoration(
                                      hintText: 'Hledat hospodu, styl nebo pivo...',
                                      hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(vertical: 4),
                                    ),
                                  ),
                                ),
                                if (_searchQuery.isNotEmpty)
                                  GestureDetector(
                                    onTap: () {
                                      _searchController.clear();
                                      setState(() {
                                        _searchQuery = '';
                                      });
                                      _buildMapMarkers();
                                    },
                                    child: const Icon(Icons.close, color: Colors.grey, size: 16),
                                  ),
                                const SizedBox(width: 8),
                                Container(
                                  height: 18,
                                  width: 1,
                                  color: Colors.white10,
                                ),
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _isFiltersVisible = !_isFiltersVisible;
                                    });
                                  },
                                  child: Icon(
                                    Icons.tune,
                                    color: _isFiltersVisible ? Colors.amber : Colors.grey.shade500,
                                    size: 18,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      
                      // Price selection panel (collapsible)
                      if (_isFiltersVisible) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A).withOpacity(0.96),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.amber.withOpacity(0.15)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.35),
                                blurRadius: 10,
                                offset: const Offset(0, 35),
                              )
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.between,
                                children: [
                                  const Text(
                                    'MAXIMÁLNÍ CENA PIVA:',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.amber,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    '${_maxPrice.round()} Kč',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              SliderTheme(
                                data: SliderTheme.of(context).copyWith(
                                  activeTrackColor: Colors.amber,
                                  inactiveTrackColor: Colors.white10,
                                  thumbColor: Colors.amber,
                                  overlayColor: Colors.amber.withOpacity(0.15),
                                  trackHeight: 3,
                                  thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
                                  overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                                ),
                                child: Slider(
                                  value: _maxPrice,
                                  min: 40.0,
                                  max: 150.0,
                                  onChanged: (val) {
                                    setState(() {
                                      _maxPrice = val;
                                    });
                                    _buildMapMarkers();
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // 🍺 Selected Pub sliding bottom sheet sheet overlay
                if (_selectedPub != null)
                  Positioned(
                    bottom: 25,
                    left: 15,
                    right: 15,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.amber.withOpacity(0.2)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.5),
                            blurRadius: 15,
                            offset: const Offset(0, 5),
                          )
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Expanded(
                                child: Text(
                                  _selectedPub!.name,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, color: Colors.grey, size: 20),
                                onPressed: () {
                                  setState(() {
                                    _selectedPub = null;
                                  });
                                },
                              )
                            ],
                          ),
                          if (_selectedPub!.address != null) ...[
                            Text(
                              _selectedPub!.address!,
                              style: TextStyle(fontSize: 12, color: Colors.slate.shade400),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Text(
                            _selectedPub!.notes ?? "Tradiční česká hospůdka na mapě.",
                            style: const TextStyle(fontSize: 13, color: Colors.slate),
                          ),
                          const SizedBox(height: 12),
                          const Divider(color: Colors.white10),
                          const SizedBox(height: 8),
                          const Text(
                            'AKTUÁLNĚ NA ČEPU:',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                              color: Colors.amber,
                            ),
                          ),
                          const SizedBox(height: 6),
                          ..._selectedPub!.beers.map((beer) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.between,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.check, color: Colors.amber, size: 14),
                                      const SizedBox(width: 6),
                                      Text(
                                        "${beer.name} ${beer.degrees}",
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    "${beer.price.round()} Kč",
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.amber,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.amber,
                              foregroundColor: Colors.black,
                              minimumSize: const Size(double.infinity, 45),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: () => _triggerCheckIn(_selectedPub!),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_circle_outline, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'ZAPSAT PIVO / NÁVŠTĚVU',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          )
                        ],
                      ),
                    ),
                  ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ChatScreen(
                userProfile: _currentUser,
                passport: _passport,
                pubs: _pubs,
              ),
            ),
          );
        },
        backgroundColor: Colors.amber,
        foregroundColor: Colors.black,
        elevation: 6,
        icon: const Icon(Icons.psychology, size: 20),
        label: const Text(
          'KECAL AI',
          style: TextStyle(
            fontWeight: FontWeight.black,
            letterSpacing: 1.0,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  // Dark vector theme styling for aesthetic Google Map
  static const String _mapDarkStyle = '''
  [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#121724"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#707b8f"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#121724"
        }
      ]
    },
    {
      "featureType": "administrative.country",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#2c364c"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#4b5971"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#1a2233"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#212b40"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#0a0e16"
        }
      ]
    }
  ]
  ''';
}
