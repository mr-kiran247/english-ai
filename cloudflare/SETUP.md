# Cloudflare backend + Hostinger frontend

Worker URL: `https://englishai-api.kiran-sontakke247work.workers.dev`

1. In the Worker dashboard click **Edit code**. Replace the entire Hello World script with `cloudflare/worker.js` and click **Deploy**.
2. Open **Settings → Variables and Secrets → Add**. Select **Secret**, name it `GEMINI_API_KEY`, and paste the real Google AI Studio key into its value. Save/deploy. Never put the key in Worker source, the React code, GitHub, or chat.
3. Visit the Worker URL. It should show `version: speakstep-worker-1` and `status: configured`. This health check does not call Google or validate the key. `missing_secret` means the secret has not been applied.
4. Upload/extract the updated `deploy/englishai-site.zip` into the Hostinger document root. Include the new `app-config.js`, updated `index.html`, and assets. Preserve your existing private configuration and files. This build calls the Worker, so no PHP connection is needed for translation.
5. Open `https://englishai.technokiran.online`, reload without cached files, and try a custom Marathi/Hindi sentence. Test actual translation before removing the old PHP endpoint.

The public `app-config.js` contains only the endpoint address; you can edit it without rebuilding if your Worker URL changes. For rollback, set it to `/api/translate.php` and reload. The Worker only allows browser requests from the exact HTTPS website origin. The app also allows direct tools with no Origin; CORS is not authentication or a spending limit.

## Usage limits

Cloudflare's account request limits and Gemini quotas apply. The old PHP daily counter is not used by this backend. Configure Gemini project quotas/spending controls before public use. For personal-only access, put authentication in front of the endpoint. Never assume CORS prevents scripts or bots from consuming your API quota.

Optionally add a Cloudflare **Rate limiting binding** named `TRANSLATION_LIMITER`, such as 5 requests per 60 seconds per IP, if supported by your plan/dashboard. The code uses it when present. No global daily limit is claimed without persistent storage or provider quota configuration.

## Verification

Run `node tests/worker.test.js` and `npm run build`. Tests mock Google and cover CORS, input limits, secrets, provider failures, model fallback and translation parsing. Live Cloudflare/Gemini integration requires deploying the code and secret in your account; repository updates do not deploy to Cloudflare automatically.
