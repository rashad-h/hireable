import "../../global.css";

import { Stack } from "expo-router";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { WebMobileFrame } from "@/components/ui/WebMobileFrame";

const webSafeAreaMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 8 },
};

function AppShell() {
  return (
    <SafeAreaProvider initialMetrics={Platform.OS === "web" ? webSafeAreaMetrics : initialWindowMetrics}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0A0A0F" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#0A0A0F" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="analyzing" options={{ headerShown: false }} />
        <Stack.Screen name="analysis-report" options={{ headerShown: false }} />
        <Stack.Screen name="roadmap" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppShell />
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 min-h-screen w-full">
        <WebMobileFrame>{content}</WebMobileFrame>
      </View>
    );
  }

  return content;
}
