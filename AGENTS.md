# Projekt: Reisekosten-App

## Ziel

Eine einfache digitale Reisekostenabrechnung für ein deutsches
Unternehmen mit ungefähr 10 Mitarbeitern.

Prioritäten:

1. Einfachheit
2. Übersichtlichkeit
3. Zuverlässigkeit
4. Wenige Klicks
5. Keine unnötige Enterprise-Komplexität

## Technischer Stack

- Next.js App Router
- TypeScript
- Prisma
- SQLite lokal
- später PostgreSQL
- React
- serverseitige Actions
- lokale Belegablage

## Entwicklungsregeln

- Bestehenden Stack nicht ohne ausdrückliche Zustimmung austauschen.
- Keine neuen Bibliotheken installieren, wenn die Aufgabe ohne sie lösbar ist.
- Prisma CLI und @prisma/client müssen immer dieselbe Version haben.
- Prisma-Schema nur ändern, wenn es zwingend erforderlich ist.
- Niemals `prisma migrate reset` ausführen.
- Vor einer Migration erklären, welche Tabellen und Felder verändert werden.
- Nach Änderungen ausführen:
  - npm run typecheck
  - npx prisma validate
  - npm run build
- Bestehende Funktionen nicht entfernen.
- Änderungen möglichst klein und nachvollziehbar halten.
- Deutsche Benutzeroberfläche verwenden.
- Währungsdarstellung im Format de-DE und EUR.
- Keine Demo-Funktion als produktionsfertig bezeichnen.
- Vor Datenbankänderungen die Auswirkungen erklären.

## Produktumfang

Die Anwendung soll enthalten:

- Login
- Mitarbeiter-, Prüfer- und Admin-Rolle
- Reisekostenabrechnungen
- Belege
- Verpflegungspauschalen
- Kilometergeld
- Freigabe und Rückgabe
- Kommentare
- PDF
- Archiv
- Einstellungen

Nicht geplant sind vorerst:

- komplexe ERP-Integration
- Mandantenfähigkeit
- eigene Mobile-App
- umfangreiche BI-Dashboards
- komplexe Workflow-Engine
