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

## AI integration still needed

This starter is explicitly in example mode. It does not translate arbitrary sentences, assess pronunciation, or generate AI feedback. To add those capabilities, create a server-side translation/tutoring endpoint with a provider API key stored securely on the server. Never put a secret in a Vite frontend variable. Validate input and return a translation, natural alternative, grammar explanation in the learner’s language, and a practice prompt. Add more source languages through that endpoint. Browser text recognition alone cannot evaluate pronunciation.

The app uses optional Google Fonts with system-font fallback. Progress stays in localStorage on the current browser and is not synchronized to an account.
