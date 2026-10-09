import { test } from "node:test";
import assert from "node:assert/strict";

// speech.js reads window.speechSynthesis and document.body when initSpeech() runs.
async function pickVoice(voices) {
  let chosen = null;
  globalThis.document = { body: { classList: { toggle() {} } } };
  globalThis.window = {
    speechSynthesis: { getVoices: () => voices, addEventListener() {}, cancel() {}, speak: (u) => (chosen = u.voice) },
  };
  globalThis.SpeechSynthesisUtterance = class {};
  const { initSpeech, speak } = await import(`../../site/js/speech.js?${Math.random()}`);
  initSpeech();
  speak("你好");
  return chosen?.name ?? null;
}

const v = (name, lang = "zh-CN") => ({ name, lang });

test("prefers a female Mandarin voice over a male one", async () => {
  assert.equal(await pickVoice([v("Microsoft Kangkang"), v("Microsoft Xiaoxiao")]), "Microsoft Xiaoxiao");
  assert.equal(await pickVoice([v("Li-Mu"), v("Tingting")]), "Tingting");
});

test("unknown voices beat known male voices, and the browser's order is kept otherwise", async () => {
  assert.equal(await pickVoice([v("Yunxi"), v("Mystery voice"), v("Other voice")]), "Mystery voice");
});

test("ignores Cantonese and Taiwanese voices; falls back to a male Mandarin voice", async () => {
  assert.equal(await pickVoice([v("Sinji", "zh-HK"), v("Meijia", "zh-TW"), v("Kangkang")]), "Kangkang");
});

test("no Mandarin voice means no audio", async () => {
  assert.equal(await pickVoice([v("Samantha", "en-US"), v("Sinji", "zh-HK")]), null);
});
