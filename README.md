# HOI4 Mod Creator

Mit dem HOI4 Mod Creator baust du eigene Mods für **Hearts of Iron IV**, ohne zu programmieren.
Etappe 1 kann:

- **neue Länder** erstellen: Name, Kürzel, Farbe, Flagge, Gebiet, Hauptstadt, Regierung, Parteien, Anführer, Startwerte, Armee
- **bestehende Länder** ändern, zum Beispiel die Schweiz umbenennen oder ihr einen neuen Anführer geben
- **nationale Geister** mit Boni anlegen
- die Mod **prüfen**, direkt in den Spielordner **speichern** (oder als ZIP) und die **Fehler aus dem Spiel** verständlich anzeigen

Etappe 2 bringt dazu:

- **Fokusbäume** für neue und bestehende Länder: Doppelklick legt einen Fokus an, Ziehen verschiebt ihn.
  Den Punkt unter einer Karte ziehst du auf eine andere, um sie zu verbinden (mit Umschalttaste: «schliesst sich aus»).
- einen **Baukasten** für Belohnungen und Bedingungen, zum Beispiel «50 politische Macht erhalten»,
  «2× Zivilfabrik bauen» oder «Stabilität über 50 %». Jeder Baustein zeigt seinen Satz im Klartext.
- Symbole aus der Galerie des Spiels oder ein eigenes Bild

Der eigene Fokusbaum **ersetzt** im Spiel den Baum des gewählten Landes.

Etappe 2b bringt dazu:

- **Alle Boni des Spiels** für Geister und Eigenschaften, zum Beispiel Konsumgüter oder Ausbildungszeit.
  Oben steht eine deutsche Liste der wichtigsten Boni, darunter kannst du alle weiteren aus dem Spiel durchsuchen.
- **Geister aus dem Spiel:** durchsuchen, als Vorlage kopieren und verändern, oder einem Land direkt zuweisen.
- **Rekruten:** zusätzliche Soldaten zu Beginn und mehr oder weniger Bevölkerung in den eigenen Staaten.
- **Anführer-Eigenschaften:** aus dem Spiel oder selbst erstellt. Bei bestehenden Ländern kann der bisherige Anführer bleiben.
- **Diplomatie zum Spielstart:** Marionetten mit Autonomiestatus, Meinung (−100 bis +100), Garantien,
  Nichtangriffspakte, Militärzugang, Fraktion gründen oder beitreten, Kriegsziele.

Etappe 3 bringt dazu:

- **Events:** Titel, Text, Bild aus dem Spiel oder ein eigenes, und 1–4 Antworten mit eigenen Wirkungen.
  Bei jeder Antwort stellst du ein, wie oft die KI sie wählt. Rechts siehst du eine Vorschau im Spiel-Look.
  Ein Event kommt an einem Datum, zufällig (wenn Bedingungen erfüllt sind) oder wenn es ausgelöst wird.
- **Entscheidungen:** Name, Symbol, Kosten in politischer Macht, «nur einmal» oder mit Wartezeit, auf Wunsch mit Dauer und «Wirkung am Ende».
  Dazu «Sichtbar wenn» und «Verfügbar wenn». Entscheidungen liegen in eigenen Kategorien oder in einer Kategorie aus dem Spiel.
- **Baustein «Event auslösen»:** Fokusse, Entscheidungen und Event-Antworten lösen damit ein Event aus, auch mit Verzögerung.
- **Boni wie bei den Geistern:** Mit dem Baustein «Bonus erhalten» bekommt ein Land in Fokussen, Event-Antworten und Entscheidungen Boni wie Konsumgüter, dauerhaft oder für eine bestimmte Zahl von Tagen.
  Der Creator legt dafür selbst einen Geist mit Name und Bild an. Entscheidungen mit Dauer haben zusätzlich «Bonus während der Laufzeit».
- **Verknüpfen über Merker:** Ein Fokus setzt zum Beispiel den Merker «Armee Reform», und eine Entscheidung ist erst sichtbar, wenn dieser Merker gesetzt ist.

Etappe 4 bringt dazu:

- **Staaten bearbeiten** (Bereich «Staaten»): Klicke einen beliebigen Staat auf der Karte an und ändere
  - Name und Einwohner
  - Kategorie, die die Bauplätze bestimmt, und zusätzliche Bauplätze
  - Gebäude wie Fabriken, Werften, Infrastruktur und Luftwaffenstützpunkt
  - Ressourcen wie Öl, Stahl oder Gummi
  - pro Provinz Siegpunkte mit Namen, Marinestützpunkt, Bunker und Küstenbunker

  Jedes Feld zeigt den Wert aus dem Spiel und lässt sich mit «↺ Spielwert» zurücksetzen. Gespeichert wird nur, was du änderst.
  Zu viele Fabriken für die Bauplätze meldet die Prüfung und erhöht die Bauplätze auf Knopfdruck.
- **Forschung** (Reiter im Land-Editor): Startforschung per Schnellwahl («alles bis 1936», «wie Land …», «nichts») und danach mit Häkchen nach Bereichen.
  Voraussetzungen kommen automatisch mit, abhängige Technologien fallen beim Abhaken mit weg. Bestehenden Ländern kannst du auch Technologien wegnehmen.
- **Personen** (Reiter im Land-Editor): neue Generäle, Feldmarschälle und Admirale mit Stufe, Fähigkeiten, Porträt und Eigenschaften aus dem Spiel,
  dazu Berater (politischer Berater, Generalstab, Oberkommando, Theoretiker) mit Kosten und einer Eigenschaft. Alle stehen dem Land ab Spielbeginn zur Verfügung.
- **Kleinere Verbesserungen:** Warnung, wenn ein Event sich immer wieder selbst auslöst; nur ganze Tage bei Verzögerung und Dauer.

## Benutzen (Windows-PC)

1. Kopiere `dist/hoi4-mod-creator.html` auf den PC, zum Beispiel auf den Desktop.
2. Öffne die Datei per Doppelklick in **Chrome** oder **Edge**. Das funktioniert ohne Internet und ohne Installation.
3. Klicke auf **Spielordner einlesen** und wähle
   `C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV`.
   Den genauen Ort zeigt Steam: Rechtsklick auf das Spiel → *Verwalten* → *Lokale Dateien durchsuchen*.
   Chrome fragt danach, ob du «Dateien hochladen» willst. Das ist nur die übliche Formulierung, es verlässt nichts den PC.
4. Lege eine neue Mod an und baue dein Land.
5. Unter **Mod speichern** wählst du einmal den Ordner
   `Dokumente\Paradox Interactive\Hearts of Iron IV`
   (mit OneDrive: `OneDrive\Dokumente\Paradox Interactive\Hearts of Iron IV`).
6. Öffne den Paradox-Launcher, füge die Mod zu einem Spielset hinzu und spiele.
7. Danach zeigt dir **Spielfehler**, ob das Spiel etwas an deiner Mod bemängelt hat.

Der Creator speichert deine Arbeit laufend im Browser. In den Mod-Ordner legt er zusätzlich `hoi4-mod-creator-projekt.json`.
Mit dieser Datei öffnest du die Mod auch auf einem anderen Computer wieder (Startseite → *Projektdatei öffnen*).

## Entwickeln (Mac)

```bash
npm install
npm test             # Unit-Tests (Vitest)
npm run build        # baut dist/hoi4-mod-creator.html
npm run selbsttest   # baut und bedient die fertige Datei in Chrome (headless)
```

- Der Selbsttest öffnet `dist/hoi4-mod-creator.html?selbsttest` und benutzt dafür einen eingebauten Mini-Spielordner.
  Am Ende steht im Seitentitel `SELBSTTEST OK` oder `SELBSTTEST FEHLER`.
- Chrome wird unter `/Applications/Google Chrome.app` erwartet. Ein anderer Ort lässt sich über `CHROME_PFAD` angeben.
- Aufbau und Konzept: `docs/superpowers/specs/2026-10-07-hoi4-mod-creator-design.md`
- Baupläne: `docs/superpowers/plans/` (Etappe 1 bis 4d)

```
src/leser      Spielordner lesen (Paradox-Skript, YML, BMP, DDS, TGA, Karte, Fehlerprotokoll)
src/projekt    Projektdaten und reine Änderungsfunktionen
src/erzeuger   Mod-Dateien erzeugen und selbst prüfen
src/pruefung   Prüfregeln für die Oberfläche
src/speicher   ZIP, IndexedDB, Schreiben in den Ordner
src/ui         Oberfläche (Preact)
src/selbsttest Mini-Spielordner, Ordner-Attrappe, Selbsttest-Ablauf
```

## Grenzen

- HOI4 läuft nicht auf dem Mac, auf dem gebaut wird. Den erzeugten Code prüfen die automatischen Tests und ein nachgebauter Spielordner.
  Ob alles wirklich im Spiel klappt, zeigt sich erst beim ersten Test auf dem PC. Dafür gibt es den Bereich «Spielfehler».
- Änderungen an bestehenden Ländern gelten für den Start **1936**. Beim Start 1939 kann das Spiel einzelne Werte überschreiben.
- Gibt ein Land Staaten ab, bleiben seine Startdivisionen dort stehen, wo das Spiel sie vorsieht.
- Kopierte Spieldateien (Staaten, Verlauf, Farben) gehören zur eingelesenen Spielversion.
  Nach einem Spiel-Update liest du den Spielordner neu ein und speicherst die Mod noch einmal.
- Änderungen an Staaten gelten für den Start 1936. Datumsblöcke in den Staatsdateien (zum Beispiel für 1939) bleiben unverändert.
- Ob das Spiel zusätzliche Bauplätze aus dem Startblock eines Staats übernimmt, zeigt erst der Spieltest.
- Technologien, die es nur mit bestimmten DLCs gibt, zeigt der Creator trotzdem an. Ob sie im Spiel ohne DLC wirken, entscheidet das Spiel.
- Ein Event «an einem Datum» kommt kurz nach diesem Datum. Das Spiel prüft solche Events nur etwa alle 20 Tage, es kann also bis zu drei Wochen später erscheinen.
- Events sind immer Länder-Events (`country_event`). Nachrichten-Events, die alle Länder sehen, gibt es nicht.
- Fokus-Symbole im Format BC7 (DX10) kann der Creator nicht anzeigen. Sie stehen trotzdem zur Wahl und erscheinen im Spiel normal.
- Zeigt der Launcher die Mod nicht an, trägst du unter *Mod-Einstellungen → Erweitert* den vollständigen Pfad deines Ordners
  «Hearts of Iron IV» ein, zum Beispiel `C:\Users\Name\OneDrive\Dokumente\Paradox Interactive\Hearts of Iron IV`.
