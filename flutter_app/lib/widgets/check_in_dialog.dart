// lib/widgets/check_in_dialog.dart

import 'package:flutter/material.dart';
import '../models/models.dart';

class CheckInDialog extends StatefulWidget {
  final Pub pub;
  final Function(Beer?) onCheckIn;

  const CheckInDialog({
    super.key,
    required this.pub,
    required this.onCheckIn,
  });

  @override
  State<CheckInDialog> createState() => _CheckInDialogState();
}

class _CheckInDialogState extends State<CheckInDialog> {
  int _selectedBeerIndex = -1; // -1 represents "Čistá návštěva (Visit without beer)"

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.amber.withOpacity(0.15))),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'ZAPISUJI NÁVŠTĚVU',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.black, color: Colors.amber, letterSpacing: 1),
          ),
          const SizedBox(height: 3),
          Text(
            widget.pub.name,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Zvol, co si dáváte na čepu:',
              style: TextStyle(fontSize: 12, color: Colors.slate),
            ),
            const SizedBox(height: 10),
            // Tap Options List
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  // Clean visit option
                  _buildBeerOption(-1, "Čistá návštěva (Bez piva)", "Užívám si jenom atmosféru hospody"),
                  const Divider(color: Colors.white10),
                  // Render beers on tap
                  ...List.generate(widget.pub.beers.length, (idx) {
                    final beer = widget.pub.beers[idx];
                    return _buildBeerOption(idx, "${beer.name} ${beer.degrees}", "${beer.style ?? 'Klasika'} • ${beer.price.round()} Kč");
                  })
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Zpět', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.amber,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () {
            Navigator.pop(context);
            if (_selectedBeerIndex == -1) {
              widget.onCheckIn(null);
            } else {
              widget.onCheckIn(widget.pub.beers[_selectedBeerIndex]);
            }
          },
          child: const Text(
            'Potvrdit',
            style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
          ),
        )
      ],
    );
  }

  Widget _buildBeerOption(int index, String title, String subtitle) {
    final isSelected = _selectedBeerIndex == index;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedBeerIndex = index;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? Colors.amber.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? Colors.amber.withOpacity(0.3) : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? Colors.amber : Colors.slate.shade650,
              size: 18,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? Colors.amber : Colors.white,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 10, color: Colors.slate.shade400),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}
