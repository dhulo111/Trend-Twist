import 'package:flutter/material.dart';

class NavigationProvider with ChangeNotifier {
  int _selectedIndex = 0;

  int _reselectSignal = 0;

  int get selectedIndex => _selectedIndex;
  int get reselectSignal => _reselectSignal;

  void setIndex(int index) {
    if (_selectedIndex == index) {
      _reselectSignal++;
    } else {
      _selectedIndex = index;
    }
    notifyListeners();
  }

  void backToHome() {
    _selectedIndex = 0;
    notifyListeners();
  }
}
