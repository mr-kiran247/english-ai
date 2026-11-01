# Enable real sentence translation on Hostinger

The new upload ZIP contains a React frontend and `api/translate.php`. PHP 8.1+ with cURL and outbound HTTPS is required. Vite's development server alone cannot run this endpoint.

1. Back up your current website and upload/extract the updated `englishai-site.zip` into the subdomain document root. It must contain `index.html`, `assets/`, and `api/translate.php` directly.
2. Obtain a provider API key from OpenAI or Google Gemini. API access/quota is separate from a ChatGPT subscription. Do not send keys in chat or commit them to Git.
3. In Hostinger File Manager, save the contents of `deploy/englishai-config.example.php` as `private/englishai-config.php`, with `private` beside `public_html`. Enter your API key there. Never upload the real configuration to GitHub. The backend supports both `public_html/api/translate.php` and `public_html/englishai/api/translate.php` automatically.
4. Keep `private` outside all website document roots. PHP needs read access to the configuration and write access to that folder for `englishai-usage.json`. Restrict permissions to your hosting account; do not use world-writable permissions. Keep only one matching private configuration; duplicate files produce an explicit error.
5. Use HTTPS, clear browser cache, and try a new sentence, for example `मला उद्या ऑफिसला लवकर जायचे आहे`. You should see an English translation and a short explanation. Microphone input still requires browser permission.

The default global limit is 100 provider attempts per UTC day, shared by all visitors. Failed provider calls also count. Configure provider spending limits too. A public site can have its quota used by visitors; use Hostinger password protection if this is a personal tutor. No learner sentence or API key is stored in the usage counter. Custom sentences are sent to your selected AI provider; example chips work locally.

Errors distinguish missing configuration, inaccessible provider, rejected credentials, and exhausted quotas. Never expose raw provider responses or secrets to visitors. If translation fails, share the on-screen error text, not the API key.

## iPhone Safari voice input

Use the HTTPS site directly in Safari. Allow microphone access for the site (Safari page settings → Website Settings → Microphone; labels vary by iOS version). Check iPhone Settings for Siri and Dictation access, including any Screen Time restrictions. Under Settings → General → Keyboard, enable Dictation if using keyboard voice input. Available dictation and web speech languages vary by device and iOS version; Marathi/Hindi recognition is not guaranteed by Safari merely exposing the API.

If the Speak button reports a speech-service or language error, tap the sentence text box and use the iPhone keyboard's microphone with a supported dictation language, then tap Teach me in English. If your device does not support dictation in your language, type the sentence instead. The updated UI shows the actual speech error category. No physical iPhone validation has been performed in the cloud environment.

## Configuration repair and setup check

For an existing deployment, you only need to replace `public_html/api/translate.php` with the latest `public/api/translate.php` from GitHub. This preserves your private API key. Alternatively upload the full new ZIP. Do not replace your real private configuration with the example placeholder.

Open `https://englishai.technokiran.online/api/translate.php`. A working local setup returns JSON containing `version: 2026-11-01-gemini-fast`, `configuration: loaded`, `provider: gemini`, and `api_key_present: true`. It never returns the key or absolute paths. This checks local configuration, not API validity or quota. If an older message appears, the updated endpoint is not being served at this domain.

The backend trims/case-normalizes provider names, defaults to Gemini, normalizes a `models/` prefix, and reports configuration syntax errors. When Gemini returns 404, it asks Google's model catalog for stable Flash models supporting generateContent and retries once using an advertised model. This does not bypass provider access or billing requirements.

## Backend regression checks

Using Node.js, install the test runtime outside the application, then run the checks (no real API key is needed):

```sh
npm install --prefix /tmp/englishai-php-runtime --no-package-lock @php-wasm/node
node tests/backend.mjs /tmp/englishai-php-runtime
node src/speech.test.js
npm run build
```

Backend checks execute PHP 8.3 in WebAssembly, including configuration errors, both Hostinger directory layouts, and a mocked Gemini 404/model discovery/translation flow. Live Gemini service access and Hostinger-specific permissions must still be verified on the deployed site.

## Hostinger cURL timeout (28)

The backend now requests IPv4, allows up to 45 seconds per provider request and shares a 65-second total budget across model recovery calls. TLS verification remains enabled. An error distinguishes failure to establish a TCP connection from a connection that receives no complete response in time. These are diagnostics, not proof of a specific Hostinger firewall or Google outage. If timeouts persist, ask Hostinger to inspect PHP cURL DNS/HTTPS connectivity to generativelanguage.googleapis.com on port 443. Keep credentials out of support screenshots. Provider access cannot be validated from local mock tests.

## Low-latency Gemini requests

Version `2026-11-01-gemini-fast` caps Gemini responses at 768 output tokens and disables thinking only for Gemini 2.5 Flash/Flash-Lite, which support `thinkingBudget: 0`. Other model generations do not receive that parameter. The model-specific configuration is recomputed after model discovery. The transport uses verified HTTPS with HTTP/1.1 and an empty Expect header. A transient transport failure can retry once with automatic IP-family selection after the initial IPv4 attempt; the entire operation shares the existing 65-second budget. Translation calls that time out may have reached Google, so retrying may consume additional provider quota.

TCP connection, TLS handshake, and response timings are checked independently. A TCP connection alone does not prove the AI service accepted the request. A persistent TLS-stage error or outbound network restriction cannot be resolved by changing the translation prompt. No successful live Hostinger-to-Gemini translation is claimed by the local regression suite.
