import { Stack } from "expo-router";

export default function RoadmapLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0A0F" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: "#0A0A0F" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[topicId]/index" options={{ title: "Topic" }} />
      <Stack.Screen name="[topicId]/[lessonId]/index" options={{ title: "Lesson" }} />
    </Stack>
  );
}
