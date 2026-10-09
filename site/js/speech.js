// Text-to-speech for Chinese words via the browser's Web Speech API.
// When no Chinese voice is available, <body> lacks the `has-tts` class and CSS hides every 🔊 button.

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
let voice = null;

function findChineseVoice() {
  const voices = synth.getVoices();
  return (
    voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ||
    voices.find((v) => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) ||
    null
  );
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
