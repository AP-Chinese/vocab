// Text-to-speech for Chinese words via the browser's Web Speech API.
// When no Chinese voice is available, <body> lacks the `has-tts` class and CSS hides every 🔊 button.

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
let voice = null;

// Browsers don't report a voice's gender, so prefer voices known to be female by name:
// iOS/macOS Tingting and Yu-shu, Windows Xiaoxiao/Huihui/Yaoyao, and Chrome's Google voice.
// Android's default Google voice is female too. Known male voices are used only as a last resort.
const FEMALE = /ting-?ting|yu-?shu|xiaoxiao|xiaoyi|huihui|yaoyao|lili|google/i;
const MALE = /kangkang|yunxi|yunyang|yunjian|li-?mu|grandpa|eddy|reed|rocko/i;

function rank(v) {
  if (FEMALE.test(v.name)) return 0;
  if (MALE.test(v.name)) return 2;
  return 1;
}

function findChineseVoice() {
  // Mainland Mandarin: "zh", "zh-CN", "zh_CN", "zh-Hans-CN" (not zh-HK or zh-TW).
  const mandarin = synth.getVoices().filter((v) => /^zh([-_](CN|Hans)\b.*)?$/i.test(v.lang));
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

export function speak(text) {
  if (!synth || !voice) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.8;
  synth.speak(utterance);
}
