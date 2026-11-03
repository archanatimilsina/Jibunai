import { Platform, UIManager } from 'react-native';

/**
 * Layout animations are enabled by default under the New Architecture (Fabric),
 * where `UIManager.setLayoutAnimationEnabledExperimental` is a no-op and logs
 * a warning. The flag is only needed on Android with the legacy renderer.
 */
export function enableLayoutAnimation() {
  if (Platform.OS !== 'android') return;
  if (typeof global !== 'undefined' && global.nativeFabricUIManager) return; // New Architecture: already enabled
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
