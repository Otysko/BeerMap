# 🍻 Pivní Mapa & Pas (Flutter / Dart)

Kompletní mobilní verze úspěšné webové aplikace **Pivní Mapa & Pas** postavená nad frameworkem **Flutter** pro mobilní platformy **Android** i **iOS (iPhone)**.

Tato verze zachovává veškerou původní logiku oblíbené webové implementace, včetně výpočtu **20 herních odznaků (achievements)**, **historie návštěv s inteligentním stránkováním/limitem**, **přehledných statistik** a **vlastního profilu štamgasta** (včetně přezdívky a výběru avataru).

---

## 📂 Struktura vytvořeného projektu

Projekt je plně modularizovaný podle nejlepších doporučených postupů pro Flutter:

```text
flutter_app/
├── pubspec.yaml                 # Závislosti (Google Maps, SharedPreferences, Intl)
├── README.md                    # Tento návod
└── lib/
    ├── main.dart                # Vstupní bod, správa přihlášení a prémiový tmavý design
    ├── models/
    │   └── models.dart          # Typově bezpečné modely (Beer, Pub, BeerVisit, UserPassport, Achievement)
    ├── services/
    │   ├── storage_service.dart # Ukládání a načítání z mobilního úložiště (SharedPreferences)
    │   └── achievements_service.dart # Identický czech-beer algoritmus pro výpočet 20 odznaků
    ├── screens/
    │   ├── login_screen.dart    # Rychlá přihlašovací obrazovka (s kotevním presetem pro Davida Kuncara)
    │   ├── map_screen.dart      # Interaktivní tmavá Google mapa s hospodami a check-in pípou
    │   └── passport_screen.dart # Kompletní pivní pas se záložkami, limity pro načítání dalších prvků a profilem
    └── widgets/
        └── check_in_dialog.dart # Dialog pro zapsání piva na čepu nebo "čisté návštěvy"
```

---

## ⚡ Jak aplikaci spustit u sebe lokálně

Chcete-li tento kód přenést do svého vývojového prostředí a spustit na reálném telefonu nebo emulátoru, postupujte podle těchto jednoduchých kroků:

### 1. Prerekvizity
* Ujistěte se, že máte nainstalované **Flutter SDK** (verze >= 3.0.0). Spustíte-li v terminálu `flutter --version`, měli byste vidět aktivní verzi.
* Připravené IDE, např. **VS Code** (s Flutter rozšířením) nebo **Android Studio**.

### 2. Stažení závislostí
Přejděte do složky s aplikací v terminálu a stáhněte balíčky:
```bash
cd flutter_app
flutter pub get
```

### 3. Konfigurace Google Maps API klíčů
Abyste na reálném zařízení viděli mapu, je potřeba vložit do platformních souborů váš Google Maps API klíč:

* **Pro Android** (`android/app/src/main/AndroidManifest.xml`):
  Do značky `<application>` doplňte:
  ```xml
  <meta-data android:name="com.google.android.geo.API_KEY"
             android:value="VÁŠ_GOOGLE_MAPS_API_KLÍČ"/>
  ```

* **Pro iOS** (`ios/Runner/AppDelegate.swift`):
  Importujte GoogleMaps a vložte klíč do inicializace:
  ```swift
  import GoogleMaps
  // ... uvnitř didFinishLaunchingWithKey:
  GMSServices.provideAPIKey("VÁŠ_GOOGLE_MAPS_API_KLÍČ")
  ```

### 4. Spuštění aplikace
Připojte svůj telefon nebo spusťte emulátor a zadejte:
```bash
flutter run
```

---

## 💎 Klíčové vlastnosti implementované v Dartu

1. **Vychytané stránkování a limity ("Načíst dalších 15")**:
   Při procházení historie nebo navštívených hospod se seznam nenačte najednou (při stovkách záznamů by to způsobovalo záseky scrollování). Webový styl lazy loadingu jsme portovali přímo do Dartu pomocí proměnných `_placesLimit` a `_historyLimit` doplněných o elegantní akční tlačítka.
2. **Čistší Profil Customizér**:
   V souladu s vaším zadáním byla ze seznamu a konfigurace odstraněna závorka `(včetně světlého muže s blond vlasy a neutrálních)`. Avatary se mění jednoduše a hladce na jedno kliknutí.
3. **Předpřipravené lokální úložiště**:
   `StorageService` využívá standardní `shared_preferences` balíček pro bezpečné ukládání JSON reprezentací uživatelského pasu a profilu na harddisk telefonu, takže se data neztratí ani po zavření nebo restartu mobilu.
