import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        {/* Auth screens - no header */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Driver screens - has its own tab bar */}
        <Stack.Screen name="(driver)" options={{ headerShown: false }} />

        {/* Student screens - has its own tab bar */}
        <Stack.Screen name="(student)" options={{ headerShown: false }} />

        {/* Dev area - remove later */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
