# HOI4 Mod Creator – Konzept

Stand: 7. Oktober 2026 · Status: zur Durchsicht

## 1. Ziel

Ein Werkzeug, mit dem jemand **ohne Modding-Erfahrung** eigene Mods für
Hearts of Iron IV zusammenklickt: eigene Länder, Änderungen an bestehenden
Ländern, Fokusbäume, Events und Entscheidungen.

**Erfolg heisst:** Der Nutzer erstellt im Creator ein Land oder einen
Fokusbaum, drückt «Mod speichern», startet HOI4 über den Paradox-Launcher,
aktiviert die Mod – und sie läuft, ohne dass er je eine Spieldatei von Hand
geöffnet hat.

### Rahmenbedingungen (vom Nutzer)

- Gespielt wird auf einem **Windows-PC mit Steam**.
- Der Nutzer hat **noch nie gemoddet**: Formulare und Knöpfe, Erklärungen,
  keine Fachbegriffe im Vordergrund, kein Code sichtbar.
- Alle vier Bereiche sind gewünscht; gebaut wird in drei Etappen (Abschnitt 10).

### Annahmen

- Ziel ist Selberspielen, nicht Veröffentlichen im Steam Workshop.
- Das Spiel läuft auf Deutsch; die Mod liefert jeden Text deutsch und
  zusätzlich identisch in der englischen Sprachdatei.
- Spielstart 1936 ist der Normalfall.

### Nicht im Umfang

Steam-Workshop-Upload, Mehrspieler-Abgleich, Karten-Editor (neue Provinzen),
Einheiten-Designer, DLC-spezifische Systeme (z. B. Militär-Industrie-
Organisationen, Spezialprojekte), mehrere Sprachen in der Oberfläche.

## 2. Gesamtaufbau

```
┌─────────────────────── hoi4-mod-creator.html (eine Datei) ───────────────────────┐
│                                                                                 │
│  Oberfläche (Preact)                                                            │
│   Seitenleiste · Mod-Einstellungen · Länder · Fokusbäume · Events ·             │
│   Entscheidungen · Prüfung · Speichern · Spielfehler                            │
│        │ liest/ändert                       │ ruft auf                          │
│        ▼                                    ▼                                   │
│  Projektdaten (reines JSON)  ──────────►  Mod-Erzeuger (ohne DOM)               │
│        ▲                                    │ liefert {Pfad → Inhalt}           │
│        │ Nachschlagen                       ▼                                   │
│  Spieldaten (aus HOI4-Ordner gelesen)    Ausgabe: Ordner schreiben / ZIP        │
│        ▲                                                                        │
│  Spielordner-Leser (Paradox-Parser, BMP, CSV, YML, DDS, TGA)                    │
│                                                                                 │
│  Zwischenspeicher: IndexedDB (Spieldaten, Projekte, Ordner-Zugriff)             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Die vier Schichten sind getrennt und einzeln testbar:

| Schicht | Aufgabe | hängt ab von |
|---|---|---|
| **Spielordner-Leser** | Dateien aus dem HOI4-Ordner in `Spieldaten` übersetzen | nichts (bekommt Dateiliste) |
| **Projektdaten** | Was der Nutzer gebaut hat, als JSON; Änderungsfunktionen | nichts |
| **Mod-Erzeuger** | Aus `Projektdaten` + `Spieldaten` alle Mod-Dateien erzeugen; Prüfung | Leser-Formate, Projektdaten |
| **Oberfläche** | Editoren, Karte, Dialoge | alle oben |

Der Mod-Erzeuger kennt keinen Browser: Eingabe sind zwei Objekte, Ausgabe ist
eine Liste `{ pfad, inhalt (Text oder Bytes) }`. Dadurch läuft er unverändert in
Node-Tests.

## 3. Laufzeit und Dateizugriff

### 3.1 Start

- Die Datei `hoi4-mod-creator.html` wird auf den Windows-PC kopiert und per
  Doppelklick in **Chrome oder Edge** geöffnet. Kein Server, kein Internet.
- Andere Browser (Firefox) funktionieren mit Einschränkung: Speichern nur als ZIP.

### 3.2 Spielordner einlesen

- Willkommensseite mit Schritt-für-Schritt-Anleitung und Bild, wo der Ordner
  liegt (`C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV`,
  Hinweis: in Steam *Rechtsklick → Verwalten → Lokale Dateien durchsuchen*).
- Einlesen per `<input type="file" webkitdirectory>`. Grund: Chrome sperrt
  `C:\Program Files` für die Ordner-Schreib-Schnittstelle, die normale
  Ordnerauswahl aber nicht.
- Vorab-Hinweis: Chrome fragt «… Dateien hochladen?» – es wird nichts
  hochgeladen, die Datei läuft nur lokal.
- Prüfung, ob der gewählte Ordner wirklich HOI4 ist (`launcher-settings.json`
  und `map/provinces.bmp` vorhanden); sonst verständliche Fehlermeldung.
- Fortschrittsanzeige mit Schritten («Karte wird gelesen …»).
- Das Ergebnis (Abschnitt 4) wird in IndexedDB zwischengespeichert, mit der
  Spielversion als Kennung. Beim nächsten Öffnen ist alles sofort da. Knopf
  «Spielordner neu einlesen» für Updates; erkennt der Creator beim Speichern
  eine andere Version, schlägt er das Neueinlesen vor.

### 3.3 Mod speichern

- «Mod speichern» → `showDirectoryPicker` auf
  `Dokumente\Paradox Interactive\Hearts of Iron IV` (Anleitung im Dialog).
  Prüfung: Ordner enthält `settings.txt` oder einen Ordner `mod`.
- Der Zugriff wird in IndexedDB gemerkt; beim nächsten Speichern genügt eine
  Bestätigung.
- Geschrieben wird:
  - `mod/<modid>.mod` (Launcher-Beschreibung mit `path="mod/<modid>"`)
  - `mod/<modid>/descriptor.mod`
  - `mod/<modid>/…` alle Mod-Dateien
  - `mod/<modid>/hoi4-mod-creator-projekt.json` (Projekt zum Weiterbearbeiten)
  - `mod/<modid>/hoi4-mod-creator-dateien.json` (Liste der erzeugten Dateien)
- **Aufräumen:** Dateien, die beim letzten Speichern erzeugt wurden und jetzt
  nicht mehr entstehen, werden gelöscht – **ausschliesslich** Dateien aus der
  eigenen Dateiliste, nie andere.
- Rückfall: ZIP mit `mod/<modid>.mod` und `mod/<modid>/…`, Anleitung «in
  `Dokumente\Paradox Interactive\Hearts of Iron IV` entpacken». ZIP-Schreiber
  selbst gebaut (unkomprimiert, CRC32).
- Bekanntes Risiko: Der Launcher sollte den relativen `path` akzeptieren. Falls
  nicht, gibt es in den Mod-Einstellungen ein optionales Feld «Windows-
  Benutzername», aus dem ein absoluter Pfad entsteht.

### 3.4 Projekte

- Mehrere Projekte, Liste auf der Startseite («Neues Projekt», «Öffnen»,
  «Duplizieren», «Löschen» mit Rückfrage).
- Automatisches Speichern in IndexedDB bei jeder Änderung (gedrosselt).
- «Projekt aus Mod-Ordner öffnen» liest `hoi4-mod-creator-projekt.json`.
- Rückgängig/Wiederholen (Strg+Z / Strg+Y) über einen Verlauf der
  Projektzustände (max. 100 Schritte).

### 3.5 Spielfehler anzeigen

- Bereich «Spielfehler»: liest `logs/error.log` aus dem gemerkten Ordner.
- Zeigt nur Zeilen, die Dateien oder Kennungen der Mod betreffen.
- Bekannte Muster werden übersetzt und mit dem Editor-Element verknüpft, z. B.
  «Unexpected token» → «Tippfehler in einer Datei – bitte melden»,
  «Failed to load texture» → «Bild fehlt», unbekannte Effekte/Auslöser.
- Rohzeile bleibt aufklappbar sichtbar.

## 4. Spieldaten (aus dem HOI4-Ordner)

### 4.1 Gelesene Dateien

| Daten | Quelle |
|---|---|
| Spielversion | `launcher-settings.json` (`rawVersion`) → `supported_version="1.xx.*"` |
| Länder-Kürzel | `common/country_tags/*.txt` (Einträge `TAG = "countries/X.txt"`, `dynamic_tags` übersprungen) |
| Länderfarbe, Grafikstil | `common/countries/*.txt`, `common/countries/colors.txt` |
| Startzustand der Länder | `history/countries/*.txt` (Hauptstadt, Regierung, Forschung, Anführer) |
| Charaktere | `common/characters/*.txt` (Namen, Porträts, Anführer-Ideologie) |
| Ideologien | `common/ideologies/*.txt` (Gruppen + Unterideologien) |
| Staaten | `history/states/*.txt` (ID, Name, Provinzen, Besitzer, Kerne, Kategorie, Siegpunkte) |
| Provinzen | `map/definition.csv` (ID, Farbe, Land/See) |
| Karte | `map/provinces.bmp` (24-Bit-BMP, ca. 5632 × 2048) |
| Texte | `localisation/german/*.yml`, Rückfall `localisation/english/*.yml` |
| Flaggen | `gfx/flags/*.tga` (für Vorschau) |
| Symbole und Bilder | `interface/*.gfx` (`spriteType`) + verwiesene `.dds`/`.tga` für Fokus (`GFX_goal_*`), Events (`GFX_report_event_*`), Entscheidungen (`GFX_decision_*`), Ideen (`GFX_idea_*`) |
| Porträts | `gfx/leaders/**/*.dds` (Auswahl, «generic» zuerst) |
| Bildgrössen | aus den DDS-Köpfen typischer Originalbilder je Art |

### 4.2 Parser

- **Paradox-Skript:** Tokenizer + rekursiver Parser. Unterstützt Kommentare
  `#`, Anführungszeichen, Operatoren `= < > <= >= !=`, Datumsschlüssel
  (`1939.1.1 = {}`), `rgb {}`/`hsv {}`, doppelte Schlüssel (AST als geordnete
  Liste von Einträgen), BOM, Windows-Zeilenenden, unbalancierte Klammern am
  Dateiende (tolerant, mit Warnung). Dazu ein **Schreiber**, der einen AST
  wieder als gültigen Text ausgibt (für Staaten-Dateien).
- **Sprachdateien (YML):** `l_german:` + `KEY:0 "Text"`; Zahl nach Doppelpunkt
  optional, Anführungszeichen im Text, Kommentare.
- **BMP:** 24-Bit, unten-nach-oben, Zeilenauffüllung.
- **DDS:** DXT1, DXT3, DXT5, unkomprimiert (A8R8G8B8, X8R8G8B8, R8G8B8).
  Unbekannte Formate (z. B. BC7) → Platzhalterbild, Symbol bleibt wählbar.
- **TGA:** unkomprimiert und RLE, 24/32 Bit.

### 4.3 Karte

- Einmalig: Farbe → Provinz-ID → Staats-Index pro Pixel (`Uint16Array`),
  zwischengespeichert in IndexedDB.
- Darstellung auf Canvas in voller Auflösung, mit Verschieben und Zoomen
  (Mausrad, Ziehen), Staatsgrenzen dunkler, Meer einfarbig.
- Färbung nach Besitzer **mit den Änderungen des Projekts** (neues Land
  erscheint sofort in seiner Farbe).
- Klick wählt Staat, Mauszeiger zeigt Staatsname, Besitzer, Kategorie.
- Suche nach Staat oder Land mit Sprung auf der Karte.

## 5. Projektdaten

Ein Projekt ist reines JSON. Kennungen im Spiel werden daraus abgeleitet und
nie vom Nutzer getippt.

```js
{
  formatVersion: 1,
  mod: { name, modid, version, beschreibung, spielversion, windowsBenutzer? },
  laender: [ Land ],          // neu oder geändert
  ideen: [ NationalerGeist ],
  fokusbaeume: [ Fokusbaum ], // Etappe 2
  events: [ Event ],          // Etappe 3
  entscheidungen: [ Entscheidung ], kategorien: [ Kategorie ],   // Etappe 3
  bilder: { [bildId]: { art, pngDataUrl, breite, hoehe } }
}
```

- **`modid`**: aus dem Mod-Namen (klein, `a–z0–9_`, max. 20 Zeichen,
  Umlaute → ae/oe/ue), änderbar in den Einstellungen. Präfix für **alle**
  erzeugten Kennungen und Dateinamen → keine Kollision mit dem Spiel.
- Jedes Element hat eine interne `id` (zufällig, stabil) und eine daraus
  erzeugte Spielkennung (`<modid>_fokus_3`).

**Land**

```js
{ id, art: 'neu' | 'geaendert', tag,          // tag bei 'geaendert' = bestehendes Kürzel
  name?, nameDef?, adjektiv?, farbe?, flagge?: { art: 'designer'|'bild', … },
  grafikstil?, staaten?: [stateId], hauptstadt?, kerneAltBesitzerBehalten: true,
  regierung?: { ideologie, wahlen, parteien: { [ideologie]: { name, langname, beliebtheit } } },
  anfuehrer?: { name, unterideologie, bildId | spielPortraet },
  startwerte?: { stabilitaet, kriegsunterstuetzung, forschungsplaetze },
  technikWie?: tag, armee?: { divisionen }, ideen?: [ideeId] }
```

Bei `'geaendert'` bedeutet ein fehlendes Feld «unverändert lassen».

**Nationaler Geist:** `{ id, name, beschreibung, bild, boni: [{ art, wert }] }`
mit Boni aus einer festen Liste (Abschnitt 6.3).

## 6. Editoren

### 6.1 Grundsätze für Anfänger

- Jedes Feld hat eine Beschriftung in Alltagssprache und ein «?» mit kurzer
  Erklärung. Fachbegriffe höchstens klein in Klammern («Kürzel (Tag)»).
- Sinnvolle Vorgaben überall: ein neues Land ist ohne weitere Eingabe schon
  fast gültig (Name fehlt, Staaten fehlen).
- Fehler erscheinen direkt am Feld und gesammelt in «Prüfung».
- Kein sichtbarer Code. Einzige Ausnahme: Baustein «Eigener Code (für
  Profis)» im Baukasten (Etappe 2), zugeklappt.

### 6.2 Mod-Einstellungen

Name, Version, Beschreibung, Vorschaubild (optional, `thumbnail.png`), erkannte
Spielversion, `modid` (aufklappbar unter «Erweitert»).

### 6.3 Länder-Editor (Etappe 1)

Übersicht: Karten mit allen neuen und geänderten Ländern (Flagge, Name).
Knöpfe «Neues Land» und «Bestehendes Land ändern» (Auswahl auf Karte oder Liste).

Abschnitte (Reiter):

1. **Name & Farbe** – Name, «mit Artikel» (Vorgabe aus Name), Adjektiv,
   Kürzel (Vorschlag aus dem Namen, prüft Doppelungen mit Spiel und Projekt,
   sperrt `AND`, `NOT`, `ALL`, `ANY` und `D01`–`D99`), Landesfarbe, Grafikstil
   (Europa, Asien, Nahost, Afrika, Südamerika, Commonwealth – steuert
   Einheiten-Aussehen; als Auswahl mit Bildbeschreibung).
2. **Flagge** – Designer: Vorlagen (2/3 Streifen waagrecht/senkrecht,
   nordisches Kreuz, Schweizer Kreuz, Diagonale, Rand) mit Farbwählern und
   einfachem Symbol (Stern, Kreis, Kreuz, Halbmond, Adler-Silhouette). Oder
   eigenes Bild hochladen, mit Zuschnitt. Erzeugt 82×52, 41×26, 10×7 als TGA.
3. **Gebiet** – Karte; Klick fügt Staat hinzu/entfernt ihn. Liste der Staaten
   mit vorherigem Besitzer. Hauptstadt wählen. Option «bisherige Besitzer
   behalten ihren Anspruch (Kern)» (Vorgabe: ja).
4. **Regierung** – Herrschende Ideologie (4 Gruppen aus dem Spiel), Parteinamen
   (kurz/lang) je Ideologie, Beliebtheit als vier gekoppelte Schieberegler
   (Summe immer 100 %), Wahlen ja/nein, Wahlintervall.
5. **Anführer** – Name, Unterideologie (passend zur Gruppe, Liste aus dem Spiel),
   Bild: eigenes hochladen (Zuschnitt 156×210 bzw. Grösse aus Originalen) oder
   Spielporträt wählen.
6. **Startwerte** – Stabilität, Kriegsunterstützung (Schieberegler %),
   Forschungsplätze (1–6), «Forschungsstand wie …» (Land aus dem Spiel; kopiert
   dessen `set_technology`-Block), «Armee»: 0–24 Infanteriedivisionen in der
   Hauptstadt (eine Vorlage «Infanterie-Division», 6 Bataillone).
7. **Nationale Geister** – zuweisen; Geist-Editor mit Name, Beschreibung, Bild
   (Spielbilder oder eigenes) und Boni aus dieser Liste:
   politische Macht pro Tag, Stabilität, Kriegsunterstützung,
   Forschungsgeschwindigkeit, Fabrikleistung, Baugeschwindigkeit, rekrutierbare
   Bevölkerung, Bevölkerungswachstum, Angriff der Armee, Verteidigung der
   Armee, Organisation der Armee, maximale Fabrikeffizienz.

**Bestehendes Land ändern:** dieselben Reiter, jeder mit Schalter «ändern»;
ausgeschaltet = Spielwerte bleiben (werden grau angezeigt). Hinweis im Kopf:
«Gilt für den Start 1936. Beim Start 1939 können spätere Vorgaben des Spiels
einzelne Werte überschreiben.»

### 6.4 Baukasten für Wirkungen und Bedingungen (Etappe 2, auch in Etappe 3 genutzt)

Eine Liste von Bausteinen, jeder mit deutschem Satz und Eingabefeldern, z. B.
«[50] politische Macht erhalten».

**Wirkungen (Effekte):** politische Macht, Stabilität, Kriegsunterstützung,
Rekruten, Forschungsplatz, Forschungsbonus (Kategorie, Anzahl), Armee-/Marine-/
Luftwaffenerfahrung, nationalen Geist hinzufügen/entfernen, Gebäude bauen
(Zivilfabrik, Militärfabrik, Werft, Infrastruktur, Luftwaffenstützpunkt; in
Staat X oder «irgendwo im eigenen Land»; schafft nötigen Bauplatz), Staat
bekommen, Kern auf Staat, Beliebtheit einer Ideologie ändern,
Regierungsform wechseln, Krieg erklären, Kriegsziel erhalten, Garantie geben,
Nichtangriffspakt, Fraktion gründen, Fraktion beitreten, Land annektieren,
Land zur Marionette machen, Ausrüstung erhalten, Event auslösen (eigenes oder
für anderes Land, mit Verzögerung), Merker setzen/entfernen, «Bei Land X
ausführen: …» (verschachtelt), Eigener Code.

**Bedingungen (Trigger):** ist Land X, ist im Krieg, ist im Krieg mit X,
Stabilität/Kriegsunterstützung/politische Macht über/unter Wert, Fokus erledigt,
Datum nach/vor, Regierung ist Ideologie, besitzt/kontrolliert Staat, ist in
Fraktion (mit X), Anzahl Fabriken über Wert, hat Merker, hat nationalen Geist,
Land existiert, Eigener Code.

Verknüpfung: Liste gilt als «alle müssen zutreffen»; Umschalter «eine genügt»;
pro Baustein Häkchen «nicht». Jede Wirkung kennt ihren Syntax-Erzeuger und
ihre Prüfregeln (Pflichtfelder, gültige Verweise).

«Merker» (Country Flag) sind die einfache Verbindung zwischen Bereichen:
«Fokus setzt Merker *Armee_reform* → Entscheidung sichtbar, wenn Merker gesetzt».

### 6.5 Fokusbaum-Editor (Etappe 2)

- Liste der Bäume; jeder gehört zu einem Land (neu oder bestehend).
- Rasterfläche (Zellen wie im Spiel), Fokusse als Karten mit Symbol und Name.
  Ziehen verschiebt (rastet ein), Doppelklick auf leere Zelle legt Fokus an.
- Verbinden: Griff an der Karte auf anderen Fokus ziehen → «Voraussetzung»;
  mit gedrückter Umschalttaste → «schliesst sich aus». Linien wie im Spiel.
- Seitenleiste für den gewählten Fokus: Name, Beschreibung, Dauer in Wochen
  (Vorgabe 10), Symbol (Galerie aller Spielsymbole mit Suche, oder eigenes
  Bild 94×86 bzw. Grösse aus Originalen), Voraussetzungen «alle» / «eine davon»,
  «verfügbar wenn» (Bedingungen), Belohnungen (Wirkungen),
  «KI wählt das gern» (Schieberegler).
- Vorschau im Spiel-Look (dunkler Hintergrund, Fokus-Rahmen).
- Zuweisung: `country = { factor = 0 modifier = { add = 100 tag = TAG } }`;
  damit ersetzt der Baum den Spiel-Baum dieses Landes.

### 6.6 Events (Etappe 3)

- Titel, Text, Bild (Spiel-Eventbilder mit Suche oder eigenes, 210×176 bzw.
  Grösse aus Originalen).
- Für wen: bestimmtes Land oder «wer es auslöst». Bei Auslöser «an Datum»
  und «zufällig» ist ein bestimmtes Land Pflicht.
- Auslöser: an Datum (Bedingung `date >` + `mean_time_to_happen = { days = 1 }`,
  nur einmal), durch Fokus/Entscheidung/andere Event-Antwort
  (`is_triggered_only`), zufällig wenn Bedingungen erfüllt (Durchschnittszeit
  in Tagen wählbar).
- 1–4 Antworten, je mit Text, Wirkungen und «KI wählt das» in Prozent.
- Vorschau im Spiel-Look.

### 6.7 Entscheidungen (Etappe 3)

- Kategorie: eigene (Name, Beschreibung, Symbol, für welche Länder) oder
  bestehende aus dem Spiel (Liste).
- Name, Beschreibung, Symbol, Kosten (politische Macht), «nur einmal»,
  optional Dauer in Tagen mit «Wirkung am Ende».
- «Sichtbar wenn», «Verfügbar wenn» (Bedingungen), Wirkungen.

## 7. Erzeugte Mod

### 7.1 Ordnerstruktur (Beispiel `modid = mein_reich`, neues Land `MRE`)

```
mod/mein_reich.mod
mod/mein_reich/
  descriptor.mod
  thumbnail.png                                   (optional)
  common/country_tags/mein_reich_countries.txt     MRE = "countries/mein_reich_MRE.txt"
  common/countries/mein_reich_MRE.txt              color, graphical_culture(_2d)
  common/countries/colors.txt                      Kopie aus Spiel + Änderungen
  common/characters/mein_reich_MRE.txt
  common/ideas/mein_reich_ideas.txt
  common/national_focus/mein_reich_<baum>.txt      (Etappe 2)
  common/decisions/mein_reich_decisions.txt        (Etappe 3)
  common/decisions/categories/mein_reich_categories.txt
  events/mein_reich_events.txt                     (Etappe 3)
  history/countries/MRE - Mein Reich.txt
  history/countries/GER - Germany.txt              Kopie + angehängte Änderungen
  history/states/64-Brandenburg.txt                Kopie mit neuem Besitzer
  history/units/MRE_1936.txt
  interface/mein_reich_goals.gfx, …_goals_shine.gfx, …_events.gfx, …_ideas.gfx, …_decisions.gfx
  gfx/flags/MRE.tga, gfx/flags/medium/MRE.tga, gfx/flags/small/MRE.tga
  gfx/leaders/MRE/…dds, gfx/interface/goals/mein_reich_…dds, …
  localisation/german/mein_reich_l_german.yml
  localisation/english/mein_reich_l_english.yml
  localisation/german/replace/mein_reich_replace_l_german.yml     (Umbenennungen)
  localisation/english/replace/mein_reich_replace_l_english.yml
  hoi4-mod-creator-projekt.json
  hoi4-mod-creator-dateien.json
```

### 7.2 Regeln

- **Kodierung:** Skriptdateien enthalten nur ASCII (alle Namen über
  Sprachschlüssel). Sprachdateien: UTF-8 **mit BOM**, Kopfzeile
  `l_german:` bzw. `l_english:`, Zeilenenden CRLF.
- **Bilder:** Flaggen als 32-Bit-TGA (unkomprimiert, unten-links-Ursprung);
  alle anderen Bilder als unkomprimiertes 32-Bit-DDS (A8R8G8B8).
- **Neues Land:** Kürzel-Datei, Länderdatei, Farbe (auch in `colors.txt`),
  Verlauf (`capital`, `oob`, `set_research_slots`, `set_stability`,
  `set_war_support`, `set_technology` (kopiert), `set_politics`,
  `set_popularities`, `recruit_character`, `add_ideas`), Charakterdatei mit
  Porträtpfad und `country_leader`, Sprachschlüssel `TAG`, `TAG_DEF`,
  `TAG_ADJ` und Parteinamen `TAG_<ideologie>_party(_long)`.
- **Staaten übertragen:** Original-Staatsdatei wird gelesen, im AST
  `owner` im `history`-Block ersetzt, `add_core_of = TAG` ergänzt (alter Kern
  optional entfernt), neu geschrieben. Dated-Blöcke bleiben unangetastet.
- **Bisheriger Besitzer verliert Hauptstadt:** Prüfung meldet es; Lösung per
  Klick: Creator wählt den grössten verbleibenden Staat als neue Hauptstadt
  (angehängt an dessen Verlaufsdatei).
- **Bestehendes Land ändern:** Original-Verlaufsdatei wird kopiert, Änderungen
  am Dateiende angehängt (markiert mit Kommentar). Neuer Anführer:
  `recruit_character` + `promote_character`. Umbenennen über `replace`-Ordner,
  inklusive aller Ideologie-Varianten (`TAG_fascism`, `TAG_fascism_DEF`, …),
  die im Spiel existieren. Neue Flagge ersetzt auch alle Ideologie-Varianten
  (`TAG_fascism.tga` …), die im Spielordner vorhanden sind. Neue Farbe:
  Länderdatei kopiert und `colors.txt` angepasst.
- **Fokusbaum:** `focus_tree` mit `id`, `country`-Faktor, `default = no`,
  `continuous_focus_position`, Fokusse mit `id`, `icon`, `x`, `y`,
  `prerequisite`-Blöcken («alle» = je ein Block, «eine» = ein Block mit allen),
  `mutually_exclusive` (beidseitig), `cost` (Wochen), `available`,
  `completion_reward`, `ai_will_do`. Eigene Symbole mit `goals.gfx`- und
  `goals_shine.gfx`-Eintrag.
- **Events:** `add_namespace = <modid>`, `country_event` mit `id = <modid>.N`,
  `title`, `desc`, `picture`, Auslöser gemäss 6.6, `option` mit `name`,
  `ai_chance`, Wirkungen.
- **Entscheidungen:** Kategorien-Datei; Entscheidungen im Kategorie-Block
  (eigene oder bestehende Kategorie), `icon`, `cost`, `allowed`, `visible`,
  `available`, `complete_effect` bzw. `days_remove` + `remove_effect`,
  `fire_only_once`, `ai_will_do`.
- **Version:** `supported_version` aus der eingelesenen Spielversion
  (`"1.xx.*"`).

## 8. Prüfung

Bereich «Prüfung» und Ampel in der Seitenleiste. Jede Meldung hat Text,
Schwere und einen Sprung zum betroffenen Feld.

**Fehler (sperren das Speichern):** Mod ohne Namen; Land ohne Namen, ohne
Staaten oder ohne Hauptstadt; Hauptstadt nicht im eigenen Gebiet; doppeltes
oder gesperrtes Kürzel; Beliebtheiten ≠ 100 %; Staat zwei neuen Ländern
zugewiesen; bisheriger Besitzer ohne Hauptstadt; Fokus ohne Namen; Fokusse
überlappen in derselben Zelle; Voraussetzungen im Kreis; Verweis auf
gelöschtes Element (Fokus, Event, Geist, Land); Pflichtfeld im Baustein leer;
Event ohne Antwort.

**Hinweise (erlaubt):** Land verliert alle Staaten; Event wird nie ausgelöst;
Entscheidung ohne Wirkung; Fokus ohne Belohnung; fehlende Beschreibung;
Spieldaten stammen von einer anderen Spielversion als zuletzt; Projekt ändert
den Start 1939 nicht.

Zusätzlich prüft der Erzeuger seine eigene Ausgabe (Abschnitt 9) und meldet
interne Fehler als «Bitte melden» statt eine kaputte Mod zu schreiben.

## 9. Tests

- **Vitest-Einheitstests** je Schicht:
  - Parser: Kommentare, BOM, Operatoren, Datumsschlüssel, `rgb`/`hsv`,
    doppelte Schlüssel, Schreiben ↔ Lesen ergibt denselben AST.
  - YML, BMP, DDS (DXT1/5, unkomprimiert), TGA mit kleinen, im Test erzeugten
    Dateien.
  - Spielordner-Leser gegen einen **nachgebauten Mini-Spielordner**
    (`tests/fixtures/mini-hoi4/`: kleine Karte 64×32, 6 Staaten, 3 Länder,
    Ideologien, Charaktere, Sprachdateien, je ein Symbol pro Art).
  - Mod-Erzeuger: Für Beispielprojekte werden alle Dateien erzeugt und mit dem
    eigenen Parser zurückgelesen. Geprüft: Klammern, nur ASCII in Skripten,
    BOM in Sprachdateien, jeder verwendete Sprachschlüssel ist definiert,
    jedes `GFX_`-Symbol existiert (Spiel oder Mod), jede Event-/Fokus-/Geist-
    Kennung existiert, Beliebtheiten = 100, Kopien der Spieldateien enthalten
    die Änderungen.
  - Prüfung: jede Regel mit einem positiven und negativen Fall.
- **Selbsttest der fertigen Datei:** `hoi4-mod-creator.html?selbsttest` lädt
  den eingebauten Mini-Spielordner, klickt sich durch die Editoren, erzeugt die
  Mod im Speicher und prüft sie. Titel wird `SELBSTTEST OK` oder
  `SELBSTTEST FEHLER`. Läuft per headless Chrome auf dem Mac.
- **Spieltest:** auf dem Windows-PC durch den Nutzer, mit einer kurzen
  Checkliste im Creator («Launcher öffnen → Mods → … aktivieren → Spiel starten
  → Land suchen → Spielfehler im Creator anschauen»).

## 10. Etappen

| Etappe | Inhalt | Ergebnis |
|---|---|---|
| **1** | Projektgerüst und Build, Parser und Spielordner-Leser, Zwischenspeicher, Karte, Projekte und Autospeichern, Mod-Einstellungen, **Länder-Editor** (neu + ändern, inkl. Flaggen-Designer, Anführer, Startwerte, nationale Geister), Prüfung, Speichern (Ordner + ZIP), Spielfehler, Selbsttest | Eigenes Land oder geändertes Land im Spiel spielbar |
| **2** | **Baukasten** Wirkungen/Bedingungen, **Fokusbaum-Editor**, Symbol-Galerie, Prüfregeln dazu | Eigener Fokusbaum für ein Land |
| **3** | **Events** und **Entscheidungen** inkl. Kategorien, Vorschauen, Prüfregeln, Verknüpfung über «Event auslösen» und Merker | Eigene Ereignisse und Entscheidungen |

Der Baukasten wandert gegenüber dem Gespräch in Etappe 2, weil er in Etappe 1
noch keinen Nutzer hätte; die Boni für nationale Geister (Etappe 1) sind eine
eigene, einfachere Liste.

Jede Etappe endet mit grünen Tests, grünem Selbsttest und Übergabe der Datei
zum Ausprobieren im Spiel.

## 11. Technik

- Ordner `CascadeProjects/hoi4-mod-creator`, lokales Git-Repository.
- Vite + `vite-plugin-singlefile` → `dist/hoi4-mod-creator.html`; Preact für
  die Oberfläche; Vitest für Tests. Keine Laufzeit-Abhängigkeiten ausser Preact.
- Quellcode-Kommentare deutsch; Bezeichner deutsch, wo es nutzersichtbare
  Begriffe sind; Schweizer Rechtschreibung in allen Texten (ss, «»).
- Ordner:

```
src/
  leser/       paradox-parser.js, yml.js, bmp.js, dds.js, tga.js, spielordner.js, karte.js
  projekt/     modell.js, aenderungen.js, verlauf.js
  erzeuger/    index.js, land.js, staaten.js, ideen.js, fokus.js, events.js,
               entscheidungen.js, bausteine.js, sprache.js, bilder.js, zip.js
  pruefung/    regeln.js
  speicher/    indexeddb.js, ordner.js
  ui/          app.jsx, seitenleiste.jsx, karte.jsx, laender/…, fokus/…, …
  selbsttest/  selbsttest.js, mini-spielordner.js
tests/         *.test.js, fixtures/mini-hoi4/
```

## 12. Risiken

| Risiko | Umgang |
|---|---|
| Kein HOI4 auf dem Mac, kein Test mit echten Spieldateien | Nachgebauter Spielordner nach bekannten Formaten; tolerante Parser; Spielfehler-Anzeige für den ersten echten Test |
| Spiel-Update ändert Dateiformate | Versionskennung im Zwischenspeicher; nur langjährig stabile Befehle verwenden |
| Launcher akzeptiert relativen `path` nicht | Optionales Feld «Windows-Benutzername» → absoluter Pfad |
| Grosse Karte (≈ 11,5 Mio. Pixel) braucht Zeit | Einmal berechnen, in IndexedDB zwischenspeichern, Fortschrittsanzeige |
| Kopierte Spieldateien veralten nach Update | Hinweis beim Speichern, wenn Spielversion abweicht; Neueinlesen erzeugt frische Kopien |
| Start 1939 überschreibt Änderungen | Hinweis im Editor; nicht im Umfang |
