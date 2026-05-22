# Zeenema Studio — Junie Guidelines

## Projekt-Pfade
- Web-Interface: C:\Users\TEute\IdeaProjects\zeenema-studio
- Unity Client-Mod: C:\Users\TEute\RiderProjects\Zeenema
- Decompiled Game: C:\Users\TEute\OneDrive\Dokumente\Programming Projects\Zeepkist\Zeepkist\Zeepkist

## Architektur
- Web-Interface: React + Vite + TypeScript + Tailwind + Zustand + Three.js
- Client-Mod: Unity C# Mod für Zeepkist
- Kommunikation: WebSocket zwischen Mod und Web-Interface

## Wichtige Konventionen
- Unity → Three.js Koordinaten: X negieren, Y und Z original lassen (Euler YXZ)
- Quaternion-Konvertierung: (-x, y, -z, w)
- Block-Rotation: nur X-Achse negieren

## Bekannte Probleme / TODOs
- Zeenema-Kamera braucht eigene Culling Mask im Unity-Mod (Baseplate/Rocks ausblenden)
- Depth of Field als Unity Post-Processing Feature im Mod implementieren