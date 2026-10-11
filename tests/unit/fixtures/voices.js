// Voice lists shaped like what speechSynthesis.getVoices() returns on each platform (name, lang, localService).
// Trimmed to the Chinese voices plus an English one. These are reconstructed, not captured from devices,
// so the Android list especially may differ by phone; replace them with real captures when we have them.

const voice = (name, lang, localService) => ({ name, lang, localService, voiceURI: name });

const googleOnline = [
  voice("Google US English", "en-US", false),
  voice("Google 普通话（中国大陆）", "zh-CN", false),
  voice("Google 粤語（香港）", "zh-HK", false),
  voice("Google 國語（臺灣）", "zh-TW", false),
];

// Chrome on Windows: installed Microsoft voices first, then Chrome's online Google voices.
export const chromeWindows = [voice("Microsoft Zira - English (United States)", "en-US", true), ...googleOnline];

// Same, on a PC with the Chinese language pack installed.
export const chromeWindowsChinesePack = [
  voice("Microsoft Zira - English (United States)", "en-US", true),
  voice("Microsoft Kangkang - Chinese (Simplified, PRC)", "zh-CN", true),
  voice("Microsoft Huihui - Chinese (Simplified, PRC)", "zh-CN", true),
  voice("Microsoft Yaoyao - Chinese (Simplified, PRC)", "zh-CN", true),
  ...googleOnline,
];

// Edge on Windows: its online "Natural" voices, no Google voices.
export const edgeWindows = [
  voice("Microsoft Zira - English (United States)", "en-US", true),
  voice("Microsoft Ana Online (Natural) - English (United States)", "en-US", false),
  voice("Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)", "zh-CN", false),
  voice("Microsoft Yunxi Online (Natural) - Chinese (Mainland)", "zh-CN", false),
  voice("Microsoft HiuGaai Online (Natural) - Chinese (Cantonese Traditional)", "zh-HK", false),
];

// Chrome on Android: the phone's own Google text-to-speech voices, all installed on the device.
export const chromeAndroid = [
  voice("English United States", "en-US", true),
  voice("Chinese China", "zh-CN", true),
  voice("Chinese Hong Kong", "zh-HK", true),
  voice("Chinese Taiwan", "zh-TW", true),
];

// Safari on iPhone and Mac.
export const safariApple = [
  voice("Samantha", "en-US", true),
  voice("Li-Mu", "zh-CN", true),
  voice("Tingting", "zh-CN", true),
  voice("Sinji", "zh-HK", true),
  voice("Meijia", "zh-TW", true),
];
