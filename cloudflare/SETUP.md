# Cloudflare backend + Hostinger frontend

Worker URL: `https://englishai-api.kiran-sontakke247work.workers.dev`

1. In the Worker dashboard click **Edit code**. Replace the entire Hello World script with `cloudflare/worker.js` and click **Deploy**.
2. Open **Settings → Variables and Secrets → Add**. Select **Secret**, name it `GEMINI_API_KEY`, and paste the real Google AI Studio key into its value. Save/deploy. Never put the key in Worker source, the React code, GitHub, or chat.
3. Visit the Worker URL. It should show `version: speakstep-worker-4` and `status: configured`. This health check does not call Google or validate the key. `missing_secret` means the secret has not been applied.
4. Upload/extract the updated `deploy/englishai-site.zip` into the Hostinger document root. Include the new `app-config.js`, updated `index.html`, and assets. Preserve your existing private configuration and files. This build calls the Worker, so no PHP connection is needed for translation.
5. Open `https://englishai.technokiran.online`, reload without cached files, and try a custom Marathi/Hindi sentence. Test actual translation before removing the old PHP endpoint.

The public `app-config.js` contains only the endpoint address; you can edit it without rebuilding if your Worker URL changes. For rollback, set it to `/api/translate.php` and reload. The Worker allows the HTTPS EnglishAI subdomain, main technokiran.online domain, and their www variants. It rejects unrelated origins and HTTP. The app also allows direct tools with no Origin; CORS is not authentication or a spending limit.

## Usage limits

Cloudflare's account request limits and Gemini quotas apply. The old PHP daily counter is not used by this backend. Configure Gemini project quotas/spending controls before public use. For personal-only access, put authentication in front of the endpoint. Never assume CORS prevents scripts or bots from consuming your API quota.

Optionally add a Cloudflare **Rate limiting binding** named `TRANSLATION_LIMITER`, such as 5 requests per 60 seconds per IP, if supported by your plan/dashboard. The code uses it when present. No global daily limit is claimed without persistent storage or provider quota configuration.

## Verification

Run `node tests/worker.test.js`, `node tests/translation.test.js` and `npm run build`. Tests mock Google and cover CORS, input limits, secrets, provider failures, model fallback and translation parsing. Live Cloudflare/Gemini integration requires deploying the code and secret in your account; repository updates do not deploy to Cloudflare automatically.

## Repair Failed to fetch

Deploy the latest Worker version and the new website ZIP. Cross-origin frontend requests carry JSON as text/plain to avoid an OPTIONS preflight. The Worker still validates JSON and limits body size. PHP rollback continues to send application/json. Do not use mode: no-cors, which would hide translations from the app.

Confirm the Worker GET reports speakstep-worker-4, clear website cache, then retry. A network error now includes the exact endpoint and website origin. If it persists, those values and the browser Network/Console error are needed to distinguish content-security-policy restrictions, Cloudflare Access/challenges, DNS errors, and blocked origins. Direct GET success does not prove a browser cross-origin POST works. Public URLs could not be inspected from this execution environment because its outbound proxy denied those destinations.

## Worker v3: Gemini timeouts

Only the Worker code needs updating from v2 to v3; the existing v2 website build and Secret can remain. The default model is now gemini-2.5-flash-lite. An explicit GEMINI_MODEL setting is still respected on the first attempt. Each generation request has an 18-second budget, with one other model attempted after a transport timeout or transient 5xx; generation and model recovery share a 45-second total deadline. Body reading is also covered by the timeout. Provider credential and quota errors are not retried as transient errors.

After deploying worker.js, open:

https://englishai-api.kiran-sontakke247work.workers.dev/?check=google

This read-only diagnostic performs an 8-second authenticated Google model-list request. It returns no API key or raw provider error. `google: reachable` with `http_status: 200` proves the key can list models, not that sentence generation works. `google: rejected` plus 400/403 points to Google project/key access. `google: unreachable` with `stage: model_catalog` means even the non-generation Google call failed or timed out; changing prompts or waiting longer on a single model will not resolve that fact. Share this diagnostic JSON if translation still fails, without sharing the Secret.

Tests cover successful model-timeout recovery and both-model timeouts using simulated Google responses; these are not live Cloudflare/Gemini verification.

## Worker v4: listed model still returns 404

Only replace/deploy the Worker script. Keep the website build and Secret unchanged. Model discovery now includes the advertised gemini-flash-lite-latest and gemini-flash-latest aliases. It skips models already attempted, tries at most two new advertised candidates on 404 within the existing deadline, and no longer equates a generation 404 with an empty model list. Persistent 404s include the attempted model name and a bounded provider explanation with API keys redacted. Check the actual explanation before changing keys, endpoints, or model IDs again.
