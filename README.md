# SYNESTHESIA LAB

**See what the market feels like.**

SYNESTHESIA LAB is an interactive artwork that turns historical EUR/USD exchange-rate movements into light and sound. Upload a song, follow the recorded market, and explore how currency changes affect the dollar value of €1,000.

Developed for **DurHack 2026**.

## Features

- Iridescent ribbons shaped by historical prices and recent market movement.
- Local music uploads with custom playback, seeking, volume and mute controls.
- Market-driven underwater and gritty audio effects.
- Market Storm simulations from −2% to +2%.
- Pip, a music-responsive companion with beginner explanations and a currency quiz.
- Responsive celestial styling and reduced-motion support.

## How it works

**Historical data** determines the ribbon's path. Recent volatility influences its width and motion, while smoothed price changes shape the sound: rising rates introduce submerged filtering, falling rates introduce a darker, distorted texture. Effects scale relative to the dataset so small recorded changes remain audible.

**Music** controls sparkle and Pip's dance, independently of market intensity. While a song plays, the replay advances one recorded observation every two seconds; pausing holds that moment.

**Market Storm** freezes the current historical observation and applies a hypothetical percentage change. It shows the imagined exchange rate and the resulting change in the dollar value of €1,000, with stronger visual and audio effects. Reset returns to historical playback and its current sound.

These are artistic mappings, not predictions or judgements that rising or falling rates are inherently good or bad. Playback speed and pitch stay unchanged.

## Tech stack

React, TypeScript, Vite, Canvas 2D, Web Audio API, Papa Parse and CSS. The app runs entirely in the browser; uploaded audio stays on your device.

## Run locally

With Node.js and npm installed, run these commands from the project directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Choose an audio file and press play to begin the historical replay.

## Live website

[Open SYNESTHESIA LAB](https://YOUR-DEPLOYMENT-URL)

Replace the placeholder above with the deployed website URL.
