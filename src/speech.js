export function speechError(code) {
 const messages = {
  'not-allowed': 'Microphone access was blocked. Allow microphone access in your browser’s site settings and your phone’s app permissions, then try again.',
  'service-not-allowed': 'The browser’s speech service is unavailable. On iPhone, check that Siri & Dictation are enabled and allowed by Screen Time restrictions. You can also use your keyboard’s microphone.',
  'audio-capture': 'No microphone is available. Check your phone’s microphone permissions and close other apps using the microphone.',
  'no-speech': 'No speech was detected. Tap Speak, wait for “Listening”, then say one sentence near the microphone.',
  'network': 'Your browser could not reach its speech recognition service. Check your connection or try another network. You can also use the microphone on your phone’s keyboard.',
  'language-not-supported': 'Your browser’s speech service does not support the selected language. Use your phone keyboard’s Marathi or Hindi voice typing, then tap Teach me in English.',
  'aborted': 'Recording was interrupted. Tap Speak to try again, or use your keyboard’s voice typing.',
 };
 return messages[code] || `Voice input could not finish (${code || 'unknown error'}). Try your phone keyboard’s microphone or type your sentence.`;
}

// Start synchronously from a user tap; mobile browsers require user activation.
export function startSpeech({browser = window, language, onText, onStatus, onError}) {
 if (!browser.isSecureContext) {
  onError('Microphone input requires HTTPS. Open https://englishai.technokiran.online and try again.');
  return null;
 }
 const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
 if (!Recognition) {
  onError('Voice input is not supported in this browser. Open Chrome on Android or Safari on iPhone, or use the microphone on your phone’s keyboard.');
  return null;
 }
 // Stop tutor playback before taking microphone input.
 browser.speechSynthesis?.cancel();
 const recognition = new Recognition();
 recognition.lang = language;
 recognition.continuous = false;
 recognition.interimResults = false;
 recognition.maxAlternatives = 1;
 let gotResult = false, failed = false, disposed = false;
 onStatus('starting');
 recognition.onstart = () => { if (!disposed) onStatus('listening'); };
 recognition.onresult = event => {
  if (disposed) return;
  const text = Array.from(event.results || []).map(result => result[0]?.transcript || '').join(' ').trim();
  if (text) { gotResult = true; onText(text.slice(0, 1000)); }
 };
 recognition.onerror = event => {
  if (disposed) return;
  failed = true;
  onError(speechError(event.error));
 };
 recognition.onend = () => {
  if (disposed) return;
  onStatus('idle');
  if (!gotResult && !failed) onError(speechError('no-speech'));
 };
 try { recognition.start(); }
 catch (error) {
  failed = true;
  onStatus('idle');
  onError(speechError(error.name === 'NotAllowedError' ? 'not-allowed' : error.name));
 }
 return () => {
  disposed = true;
  recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
  try { recognition.abort(); } catch { /* Already stopped. */ }
 };
}
