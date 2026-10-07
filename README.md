# HOI4 Mod Creator

Mit dem HOI4 Mod Creator baust du eigene Mods für **Hearts of Iron IV**, ohne zu programmieren.
Etappe 1 kann:

- **neue Länder** erstellen: Name, Kürzel, Farbe, Flagge, Gebiet, Hauptstadt, Regierung, Parteien, Anführer, Startwerte, Armee
- **bestehende Länder** ändern, zum Beispiel die Schweiz umbenennen oder ihr einen neuen Anführer geben
- **nationale Geister** mit Boni anlegen
- die Mod **prüfen**, direkt in den Spielordner **speichern** (oder als ZIP) und die **Fehler aus dem Spiel** verständlich anzeigen

Geplant sind Fokusbäume (Etappe 2) sowie Events und Entscheidungen (Etappe 3).

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
- Bauplan Etappe 1: `docs/superpowers/plans/2026-10-07-etappe-1-laender.md`

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
- Zeigt der Launcher die Mod nicht an, trägst du unter *Mod-Einstellungen → Erweitert* den vollständigen Pfad deines Ordners
  «Hearts of Iron IV» ein, zum Beispiel `C:\Users\Name\OneDrive\Dokumente\Paradox Interactive\Hearts of Iron IV`.
