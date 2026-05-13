import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let previewSound: Audio.Sound | null = null;

async function unloadPreview() {
  if (previewSound) {
    try {
      await previewSound.unloadAsync();
    } catch {
      /* ignore */
    }
    previewSound = null;
  }
}

/** Krótki podgląd wybranego dźwięku (lub haptyka dla „domyślny” na urządzeniu). */
export async function previewNotificationAsset(asset: number | null): Promise<void> {
  await unloadPreview();

  if (Platform.OS === 'web') {
    if (asset == null) {
      return;
    }
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(asset);
      previewSound = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && !s.isPlaying && s.didJustFinish) {
          void unloadPreview();
        }
      });
    } catch {
      await unloadPreview();
    }
    return;
  }

  if (asset == null) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(asset);
    previewSound = sound;
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && !s.isPlaying && s.didJustFinish) {
        void unloadPreview();
      }
    });
  } catch {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      /* ignore */
    }
    await unloadPreview();
  }
}
