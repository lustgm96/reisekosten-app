# Reisekosten-MVP

Kompakte digitale Reisekostenabrechnung für ein kleines Team.

## Schnellstart unter Windows

1. ZIP vollständig entpacken.
2. `SETUP.cmd` doppelklicken.
3. Nach erfolgreicher Einrichtung `STARTEN.cmd` doppelklicken.
4. Im Browser öffnen:

```text
http://localhost:3000/Reisekosten/
```

Die CMD-Dateien verwenden intern `pushd` und funktionieren deshalb auch dann,
wenn der Projektordner auf einem UNC-Netzwerkpfad wie `\\server\freigabe\...` liegt.

## Testkonten

Passwort für alle Konten:

```text
dev1234!
```

Konten:

```text
mitarbeiter@example.local
pruefer@example.local
admin@example.local
```

## Manuelle Einrichtung

```powershell
Copy-Item .env.example .env
npm install
npm run setup
npm run dev
```

Bei einem UNC-Pfad bitte stattdessen die mitgelieferten CMD-Dateien verwenden.

## Interne App-Plattform

Für die Bereitstellung unter `https://apps.purelink.de/Reisekosten/`:

```powershell
npm run dev:platform
```

Die App läuft dabei auf Port `3010`. Caddy muss den Unterpfad unverändert an
Next.js weiterreichen; `handle_path` darf nicht verwendet werden, weil es den
von Next.js erwarteten Präfix entfernen würde.

Beispiel:

```caddyfile
handle /Reisekosten/* {
  reverse_proxy 127.0.0.1:3010
}
```

Der Unterpfad wird über `NEXT_PUBLIC_BASE_PATH` konfiguriert und ist
standardmäßig `/Reisekosten`.

## Enthalten

- Anmeldung mit Rollen
- Reisekostenabrechnungen
- Belege und Ausgaben
- automatische Verpflegungs- und Kilometerberechnung
- privat ausgelegt, Firmenkarte und bar
- Einreichen, Freigeben und Zurückgeben
- Kommentare
- PDF-Ausgabe
- Archiv
- einfache Einstellungen
- SQLite für die lokale Entwicklung

## Hinweis

Die hinterlegten Pauschalen sind Beispielwerte. Vor dem echten Einsatz müssen
die für das jeweilige Abrechnungsjahr gültigen Werte geprüft werden.


## Prisma-Fehler reparieren

Falls folgende Meldung erscheint:

```text
@prisma/client did not initialize yet
```

bitte `PRISMA-REPARIEREN.cmd` doppelklicken und danach `STARTEN.cmd` erneut starten.

In dieser Version wird `prisma generate` außerdem automatisch bei Installation
und vor jedem Start ausgeführt.


## Node.js 24 / Prisma-Fix

Diese Version verwendet:

- Prisma CLI 6.16.2
- `@prisma/client` 6.16.2
- TypeScript 5.9.2

Alte Prisma-5-Installationen werden durch `SETUP.cmd` vollständig entfernt.
