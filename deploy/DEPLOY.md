# Deploy englishai.technokiran.online

This is a React frontend with a PHP translation endpoint. Production serves the contents of `dist/`; it does not run the Vite development server. For real sentence translation on Hostinger, follow [HOSTINGER-AI.md](HOSTINGER-AI.md). PHP 8.1+ with cURL and a private provider key configuration are required. Never deploy AI provider keys in frontend files. The Nginx example below serves the frontend only; a VPS additionally needs PHP-FPM configured for the endpoint.

## DNS and HTTPS

Create an A record for `englishai` under `technokiran.online` pointing to your server's public IPv4 address. Add an AAAA record only if the server has working IPv6. Preserve unrelated DNS records. Allow incoming HTTP (80) and HTTPS (443).

HTTPS is required for microphone access on this domain. Users must also grant browser microphone permission, and speech recognition support varies by browser.

## Shared hosting / cPanel

1. Add `englishai.technokiran.online` as a domain/subdomain in the hosting panel and note its document root.
2. Upload and extract `englishai-site.zip` into that document root. `index.html`, `assets/`, and `api/` must be directly inside the document root, without an extra `dist` directory. Configure Gemini using HOSTINGER-AI.md.
3. Enable the host's SSL certificate / AutoSSL and force HTTPS after certificate issuance succeeds.
4. Open the HTTPS domain and verify example translation, English audio, daily task completion, and microphone permissions.

## Ubuntu / Debian VPS with Nginx

These steps assume sudo access and an existing Nginx installation. Check for an existing site and back up its files and configuration before replacing anything. If this hostname is already configured, merge with that site instead of enabling a duplicate server block.

Transfer `englishai-site.tar.gz` and `nginx.conf` to the server using your normal secure file-transfer method. On the server, from the directory containing those files:

```sh
sudo mkdir -p /var/www/englishai.technokiran.online
sudo tar -xzf englishai-site.tar.gz -C /var/www/englishai.technokiran.online
sudo find /var/www/englishai.technokiran.online -type d -exec chmod 755 {} +
sudo find /var/www/englishai.technokiran.online -type f -exec chmod 644 {} +
# Run the following only if this site is not already configured:
sudo cp -n nginx.conf /etc/nginx/sites-available/englishai.technokiran.online
sudo ln -s /etc/nginx/sites-available/englishai.technokiran.online /etc/nginx/sites-enabled/englishai.technokiran.online
sudo nginx -t
# Reload only if nginx -t succeeds:
sudo systemctl reload nginx
```

After DNS resolves to this server and HTTP works, use the hosting provider's certificate tooling or Certbot. On Ubuntu/Debian with apt-managed Certbot:

```sh
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d englishai.technokiran.online --redirect
sudo certbot renew --dry-run
```

Keep the Certbot-managed HTTPS configuration on subsequent deployments. Do not overwrite it with the initial HTTP-only template.

## Rebuild and verify

From `/workspace/english-tutor`:

```sh
npm ci
npm run build
tar -czf englishai-site.tar.gz -C dist .
```

After deployment, confirm the HTTPS page loads without certificate errors, `/assets/` files return successfully, example lessons display the expected English sentences, speech playback works, and daily completion survives a reload. Test voice input on a supported browser. No server deployment or DNS change has been performed by preparing these files.
