export async function requestLesson({text, audio, language, endpoint, origin, signal, fetchImpl = fetch}) {
  const target = new URL(endpoint || '/api/translate.php', origin);
  const crossOrigin = target.origin !== new URL(origin).origin;
  if (crossOrigin && target.protocol !== 'https:') throw new Error('The translation endpoint must use HTTPS. Check app-config.js.');
  let response;
  try {
    response = await fetchImpl(target.href, {
      method: 'POST',
      mode: crossOrigin ? 'cors' : 'same-origin',
      credentials: crossOrigin ? 'omit' : 'same-origin',
      headers: {'Content-Type': crossOrigin ? 'text/plain;charset=UTF-8' : 'application/json'},
      body: JSON.stringify(audio ? {audio,language} : {text:text.trim(),language}),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(`Cannot reach ${target.origin} from ${new URL(origin).origin}. Check that Worker version speakstep-worker-2 is deployed and allows this website. If opening the Worker works but this request fails, check CORS, Cloudflare Access and browser blocking.`);
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Translation server did not return JSON. Deploy the Worker translation code, disable login/challenge protection on this API, and check app-config.js.'); }
  if (!response.ok) throw new Error(data?.error || `Translation failed (HTTP ${response.status}). Please try again.`);
  if (typeof data?.en !== 'string' || !data.en.trim() || typeof data.tip !== 'string') throw new Error('The tutor returned an incomplete lesson. Please try again.');
  return {en:data.en,tip:data.tip,...(typeof data.transcript==='string'?{transcript:data.transcript}:{})};
}
