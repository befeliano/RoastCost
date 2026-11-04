import { Alert, Platform } from 'react-native';

/**
 * Yes/no confirmation that also works in the web preview (react-native-web's Alert.alert is a no-op).
 * Resolves true when the destructive/confirm button is chosen.
 */
export function confirm(
  title: string,
  message: string | undefined,
  okLabel: string,
  cancelLabel = 'Vazgeç',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm(message ? `${title}\n\n${message}` : title),
    );
  }
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: okLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
