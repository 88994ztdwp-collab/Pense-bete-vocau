import * as Speech from "expo-speech";

export function speak(text) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: "fr-FR", pitch: 1.0, rate: 1.0 });
}

export function stopSpeaking() {
  Speech.stop();
}
