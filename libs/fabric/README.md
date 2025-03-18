# Fabric.js Local Copy

The `fabric.min.js` file in this directory is just a stub. For full functionality, you should download the complete library file.

## How to download the full Fabric.js library

1. Visit: https://unpkg.com/fabric@5.3.1/dist/fabric.min.js
2. Save the file as `fabric.min.js` in this directory

Alternatively, run this command from the project root:

```bash
curl -o libs/fabric/fabric.min.js https://unpkg.com/fabric@5.3.1/dist/fabric.min.js
```

or with PowerShell:

```powershell
Invoke-WebRequest -Uri "https://unpkg.com/fabric@5.3.1/dist/fabric.min.js" -OutFile "libs/fabric/fabric.min.js"
```

## Why is this needed?

Fabric.js is used for visualizing pen strokes in the canvas. While we attempt to load it from a CDN, having a local copy ensures the application works even when offline or if CDN access is restricted.
