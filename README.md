# SpeakStep — React English tutor starter

A responsive React app for Marathi and Hindi speakers learning conversational English.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
cd /workspace/english-tutor
npm ci
npm run dev
```

Build with `npm run build`. Dependencies are pinned in `package-lock.json`.

## Included

- Six Marathi/Hindi example translations, teaching notes, and English audio playback.
- Browser speech recognition for Marathi, Hindi, and English where supported; typing is always available. Microphone access requires a secure context and browser permission. Browser speech services may process audio remotely.
- A rotating daily speaking task, answer recording/transcription, and local progress storage. Completion is self-reported, not AI grading. There are no push notifications.
- Responsive learning, practice, and progress screens.

## Real sentence translation on Hostinger

Custom Marathi and Hindi sentences are sent to `/api/translate.php`, a PHP backend that calls Google Gemini (or OpenAI). Configure a server-side API key using [the Hostinger setup guide](deploy/HOSTINGER-AI.md). The downloadable [deployment ZIP](deploy/englishai-site.zip) includes the PHP endpoint. Never put a secret in a Vite frontend variable. Translation requires a configured provider with available API quota; example lessons continue to work locally.

Vite serves the frontend during development; it cannot execute PHP. Use a PHP-enabled server for full-stack testing. Browser text recognition alone cannot evaluate pronunciation, and this app does not grade pronunciation or grammar.

The app uses optional Google Fonts with system-font fallback. Progress stays in localStorage on the current browser and is not synchronized to an account.
