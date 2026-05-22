# Zeenema Studio — Junie Guidelines

## Projekt-Pfade
- **Web-Interface**: `C:\Users\TEute\IdeaProjects\zeenema-studio` (React + Vite + TypeScript + Tailwind + Zustand + Three.js)
- **Unity Client-Mod**: `C:\Users\TEute\RiderProjects\Zeenema` (BepInEx Plugin für Zeepkist)
- **Decompiled Game**: `C:\Users\TEute\OneDrive\Dokumente\Programming Projects\Zeepkist\Zeepkist\Zeepkist`

## Architektur
- Web-Interface kommuniziert per WebSocket mit dem Unity-Mod
- Unity-Mod: `PlaybackController.cs` steuert die Zeenema-Kamera, `Protocol.cs` definiert alle Nachrichten-Typen
- Web-Interface: `src/store/keyframeStore.ts` + `src/store/playbackStore.ts` (Zustand), `src/types/protocol.ts` für Typen

## Koordinaten-Konventionen (Unity → Three.js)
- Block-Euler-Rotation: nur X-Achse negieren (`-block.r.x`), Y und Z original lassen, Reihenfolge `YXZ`
- Quaternion-Konvertierung: `(-x, y, -z, w)`
- Position Z-Achse: `-block.p.z` (Three.js ist rechtshändig)

## Unity Post-Processing
- Das Spiel nutzt **Legacy Post Processing Stack** (`UnityEngine.Rendering.PostProcessing`)
- Zeenema-Kamera hat `PostProcessLayer` + eigenen `PostProcessVolume` mit `DepthOfField`
- DOF-Parameter werden per Keyframe interpoliert: `dofEnabled`, `dofFocusDistance`, `dofAperture`, `dofFocalLength`

## Bekannte Layer-Namen im Spiel
- `Soapbox`, `SoapboxForce`, `Character`, `Character Head`, `FakeRagdoll`, `FakeRagdoll2`, `Head Rest`
- `Debris`, `Particles`, `NonCollidingParticles`, `Default`
- Zeenema-Kamera: `cullingMask = ~(1 << 5)` (alles außer UI-Layer 5)

## Zeenema-Kamera Setup
- `clearFlags = CameraClearFlags.Depth` (Game-Kamera rendert Skybox darunter)
- `depth = 100` (rendert über allen anderen Kameras)
- `cullingMask = ~(1 << 5)` (alles außer UI)

## Build-Befehle
- Web-Interface: `cd C:\Users\TEute\IdeaProjects\zeenema-studio; npm run build`
- Unity-Mod: `cd C:\Users\TEute\RiderProjects\Zeenema; dotnet build Zeenema.csproj -c Debug`
- DLL wird automatisch nach `Zeepkist\BepInEx\plugins\Sideloaded\Plugins\Zeenema` kopiert
