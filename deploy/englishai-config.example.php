<?php
// Copy to englishai-config.php ONE LEVEL ABOVE the subdomain document root.
// Example: website /public_html/englishai => config /public_html/englishai-config.php
// Ensure this location is not served by another website; see HOSTINGER-AI.md.
return [
    'provider' => 'gemini', // 'openai' or 'gemini'
    'api_key' => 'REPLACE_ON_SERVER_ONLY',
    // Omit model to use the provider default; optionally specify a supported model.
    'daily_limit' => 100,
];
