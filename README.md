# Violet Music Library

A personal, black-and-purple music player for audio files you own.

## Run on your PC and iPhone

1. Install Node.js.
2. In this folder, run `npm start` (or `node serve.mjs --lan 4173`).
3. Leave the terminal open. On the PC visit `http://localhost:4173`; on an iPhone on the same Wi-Fi, open the phone-preview address printed by the server.

The server automatically finds supported audio files in the current user's `Music` folder and streams them directly; it does not copy them into this project. The browser player also supports importing audio from the device. Imported files stay in that browser's local storage. No audio files are included in this repository.

Supported file extensions: WAV, MP3, M4A, AAC, FLAC, OGG, OPUS, AIFF, WMA, and ALAC. ZIP archives and video files are not scanned.

## GitHub Pages

The app can also be hosted as a static site. Static hosting cannot read the PC's `Music` folder; use **Add audio files** to import tracks into the browser instead. For PC-to-iPhone streaming, run the Node server on the PC and keep both devices on the same Wi-Fi.

## Data and privacy

The Node server exposes audio files from the Music folder to devices that can reach it on your local network while it is running. It does not upload audio to GitHub or any music service. Favorited PC tracks are saved in browser storage.

