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
- Browser microphone recording for Marathi, Hindi, and English, sent to Gemini for transcription. Safari can record MP4 without Siri speech recognition. Requires Worker v6, HTTPS and microphone permission. Recording stops at 20 seconds. Typed entry remains available. Browser speech recognition is a fallback when MediaRecorder is unavailable.
- A rotating daily speaking task, answer recording/transcription, and local progress storage. Completion is self-reported, not AI grading. There are no push notifications.
- Responsive learning, practice, and progress screens.

## Real sentence translation using Cloudflare

The default build sends custom Marathi/Hindi sentences to the Cloudflare Worker configured in `public/app-config.js`. Deploy `cloudflare/worker.js` and add the Gemini API key as a Worker Secret using [the Cloudflare setup guide](cloudflare/SETUP.md). Example lessons remain local. The deployment ZIP includes the new endpoint configuration and website build; uploading it does not deploy the Worker itself.

The previous PHP backend is retained as an alternative. To use it, set the public endpoint to `/api/translate.php` and follow [the Hostinger PHP guide](deploy/HOSTINGER-AI.md). Never put provider keys in the public configuration.

Vite serves the frontend during development; it cannot execute PHP. Use a PHP-enabled server for full-stack testing. Browser text recognition alone cannot evaluate pronunciation, and this app does not grade pronunciation or grammar.

The app uses optional Google Fonts with system-font fallback. Progress stays in localStorage on the current browser and is not synchronized to an account.
