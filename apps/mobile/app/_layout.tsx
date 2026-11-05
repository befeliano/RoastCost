import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCatalog } from '@/features/catalog/store';
import { CACHE_BUSTER, persister, queryClient } from '@/lib/query';
import { useSession } from '@/store/session';
import { colors, space } from '@/theme';
import { ToastHost } from '@/components/Toast';
import type { ErrorBoundaryProps } from 'expo-router';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';

void SplashScreen.preventAutoHideAsync();

/** A crash in a screen shows a calm Turkish message — never a raw stack trace. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return (
    <View style={styles.crash}>
      <Text variant="h2" style={styles.center}>
        Bir şeyler ters gitti
      </Text>
      <Text variant="body" color={colors.textMuted} style={styles.center}>
        Bu ekran açılırken bir sorun oluştu. Verileriniz güvende; tekrar deneyebilirsiniz.
      </Text>
      <Button title="Tekrar dene" icon="refresh" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  // Fonts ship inside the app bundle (@expo-google-fonts packages) — no runtime request to Google.
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const status = useSession((s) => s.status);
  const canSeeCatalog = useSession(
    (s) => s.me?.user.role === 'admin' || s.me?.cafe?.status === 'approved',
  );

  useEffect(() => {
    void useSession.getState().bootstrap();
    void useCatalog.getState().load();
  }, []);

  // Splash stays until fonts + cached session are ready (cache-first start, spec §12.1).
  useEffect(() => {
    if (fontsLoaded && status !== 'booting') void SplashScreen.hideAsync();
  }, [fontsLoaded, status]);

  // Sync the catalog on start and when returning to the foreground (throttled to 5 min in the store).
  useEffect(() => {
    if (!canSeeCatalog) return;
    void useCatalog.getState().sync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void useCatalog.getState().sync();
        void useSession.getState().refreshMe();
      }
    });
    return () => sub.remove();
  }, [canSeeCatalog]);

  if (!fontsLoaded || status === 'booting') return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, buster: CACHE_BUSTER, maxAge: 7 * 24 * 60 * 60_000 }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Protected guard={status === 'signedOut'}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={status === 'signedIn'}>
              <Stack.Screen name="(cafe)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen
                name="consents"
                options={{ presentation: 'modal', gestureEnabled: false }}
              />
            </Stack.Protected>
          </Stack>
          <ToastHost />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  crash: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xl,
    backgroundColor: colors.surface,
  },
  center: { textAlign: 'center' },
});
