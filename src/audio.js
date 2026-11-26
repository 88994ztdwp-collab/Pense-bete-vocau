import { Audio } from "expo-av";

export async function requestMicPermission() {
  const status = await Audio.requestPermissionsAsync();
  return status.granted;
}

export async function startRecording() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  return recording;
}

export async function stopRecording(recording) {
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    return null;
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  return recording.getURI();
}

let currentSound = null;

export async function playAudio(uri) {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
    const { sound } = await Audio.Sound.createAsync({ uri });
    currentSound = sound;
    await sound.playAsync();
  } catch {
    currentSound = null;
  }
}
