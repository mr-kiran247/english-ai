# Enable real sentence translation on Hostinger

The new upload ZIP contains a React frontend and `api/translate.php`. PHP 8.1+ with cURL and outbound HTTPS is required. Vite's development server alone cannot run this endpoint.

1. Back up your current website and upload/extract the updated `englishai-site.zip` into the subdomain document root. It must contain `index.html`, `assets/`, and `api/translate.php` directly.
2. Obtain a provider API key from OpenAI or Google Gemini. API access/quota is separate from a ChatGPT subscription. Do not send keys in chat or commit them to Git.
3. In Hostinger File Manager, copy the contents of `deploy/englishai-config.example.php` into a new file named `englishai-config.php` **one directory above your subdomain document root**. Enter your API key there and select `openai` or `gemini`. Do not upload your real configuration inside the website directory or GitHub.
4. That parent directory must be private. If it is served by your main domain, place the config in a truly private directory (outside all document roots) and edit `$configFile` in `api/translate.php` to its absolute server path. The private directory also needs to be writable by PHP for `englishai-usage.json`. Restrict file permissions to your hosting account; do not use world-writable permissions.
5. Use HTTPS, clear browser cache, and try a new sentence, for example `मला उद्या ऑफिसला लवकर जायचे आहे`. You should see an English translation and a short explanation. Microphone input still requires browser permission.

The default global limit is 100 provider attempts per UTC day, shared by all visitors. Failed provider calls also count. Configure provider spending limits too. A public site can have its quota used by visitors; use Hostinger password protection if this is a personal tutor. No learner sentence or API key is stored in the usage counter. Custom sentences are sent to your selected AI provider; example chips work locally.

Errors distinguish missing configuration, inaccessible provider, rejected credentials, and exhausted quotas. Never expose raw provider responses or secrets to visitors. If translation fails, share the on-screen error text, not the API key.
