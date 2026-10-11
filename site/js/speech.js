// Text-to-speech for Chinese words via the browser's Web Speech API.
// When no Chinese voice is available, <body> lacks the `has-tts` class and CSS hides every 🔊 button.

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
let voice = null;
// Voices that raised an error this session; skipped from then on.
const broken = new Set();
// Chrome can garbage-collect an utterance while it plays, cutting it off. Holding it prevents that.
let current = null;
// Errors that mean the voice itself can't play (as opposed to "interrupted", "not-allowed", etc.).
const VOICE_ERRORS = new Set(["synthesis-failed", "synthesis-unavailable", "language-unavailable", "voice-unavailable", "network"]);

// Browsers don't report a voice's gender, so prefer voices known to be female by name:
// iOS/macOS Tingting and Yu-shu, Windows Xiaoxiao/Huihui/Yaoyao, and Chrome's Google voice.
// Android's default Google voice is female too. Known male voices are used only as a last resort.
const FEMALE = /ting-?ting|yu-?shu|xiaoxiao|xiaoyi|huihui|yaoyao|lili|google/i;
const MALE = /kangkang|yunxi|yunyang|yunjian|li-?mu|grandpa|eddy|reed|rocko/i;

// Chrome on Windows ships online "Google" voices (localService: false) that often play nothing,
// so voices installed on the device come first, and gender only breaks ties.
function rank(v) {
  const online = v.localService === false ? 3 : 0;
  if (FEMALE.test(v.name)) return online;
  if (MALE.test(v.name)) return online + 2;
  return online + 1;
}

function findChineseVoice() {
  // Mainland Mandarin: "zh", "zh-CN", "zh_CN", "zh-Hans-CN" (not zh-HK or zh-TW).
  const mandarin = synth
    .getVoices()
    .filter((v) => /^zh([-_](CN|Hans)\b.*)?$/i.test(v.lang) && !broken.has(v.voiceURI ?? v.name));
  // Stable sort: within a rank, keep the browser's order (its default voice comes first).
  return mandarin.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function refresh() {
  voice = findChineseVoice();
  document.body.classList.toggle("has-tts", voice !== null);
}

export function initSpeech() {
  if (!synth) return;
  refresh();
  // Many browsers load voices asynchronously.
  synth.addEventListener?.("voiceschanged", refresh);
}

function say(text, retry) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.8;
  utterance.onend = () => {
    if (current === utterance) current = null;
  };
  utterance.onerror = (event) => {
    if (current === utterance) current = null;
    // Cancelling (tapping 🔊 again) also fires an error; that isn't the voice's fault.
    if (!VOICE_ERRORS.has(event.error)) return;
    broken.add(utterance.voice.voiceURI ?? utterance.voice.name);
    refresh();
    if (retry && voice) say(text, false);
  };
  current = utterance;
  synth.speak(utterance);
}

export function speak(text) {
  if (!synth || !voice) return;
  // Chrome can be left paused after the tab sits idle, which silently queues every new utterance.
  synth.resume?.();
  if (synth.speaking || synth.pending) {
    synth.cancel();
    // Chrome on Windows and Android drops an utterance spoken right after cancel(), so wait a beat.
    // Only here: iOS needs the first speak() to happen synchronously inside the tap.
    setTimeout(() => say(text, true), 50);
    return;
  }
  say(text, true);
}
