import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { uploadCV, type UploadFile } from "@/api/client";
import { UploadCard } from "@/components/cv/UploadCard";
import { Button } from "@/components/ui/Button";
import { useAppStore, useStoreHydrated } from "@/stores/useAppStore";

export default function UploadScreen() {
  const hydrated = useStoreHydrated();
  const sessionId = useAppStore((s) => s.sessionId);
  const roadmapId = useAppStore((s) => s.roadmapId);
  const targetRole = useAppStore((s) => s.targetRole);
  const [file, setFile] = useState<UploadFile | null>(null);
  const [jobTitle, setJobTitle] = useState("ML Engineer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAppStore((s) => s.setSession);
  const reset = useAppStore((s) => s.reset);

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await uploadCV(file, jobTitle);
      setSession(result.session_id);
      router.push({ pathname: "/analyzing", params: { sessionId: result.session_id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-6 py-8">
          <Text className="text-white text-4xl font-bold mb-2">Hireable</Text>
          <Text className="text-white/60 mb-8">
            Upload your CV and get a personalized learning roadmap.
          </Text>

          {hydrated && sessionId && roadmapId && (
            <View className="mb-6 rounded-3xl bg-primary/10 border border-primary/30 p-4">
              <Text className="text-white font-semibold mb-1">Welcome back</Text>
              <Text className="text-white/60 text-sm mb-3">
                {targetRole ? `Your ${targetRole} roadmap is saved.` : "Your roadmap is saved."}
              </Text>
              <Button
                title="Continue Roadmap →"
                onPress={() => router.push({ pathname: "/roadmap", params: { roadmapId } })}
              />
              <Button
                title="Start fresh"
                variant="ghost"
                className="mt-2"
                onPress={reset}
              />
            </View>
          )}

          <UploadCard fileName={file?.name} onPick={setFile} />

          <Text className="text-white/80 mt-8 mb-2">Target role</Text>
          <TextInput
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. ML Engineer"
            placeholderTextColor="#666"
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white mb-3"
          />
          <View className="flex-row gap-2 mb-8">
            {["ML Engineer", "Frontend Developer", "Data Analyst"].map((role) => (
              <Text
                key={role}
                onPress={() => setJobTitle(role)}
                className="text-accent text-sm bg-accent/10 px-3 py-2 rounded-full overflow-hidden"
              >
                {role}
              </Text>
            ))}
          </View>

          {error && <Text className="text-error mb-4">{error}</Text>}

          <Button
            title={loading ? "Uploading..." : "Analyze My CV →"}
            onPress={handleAnalyze}
            disabled={loading}
          />

          <Button
            title="Try Demo Roadmap"
            variant="secondary"
            className="mt-3"
            onPress={() => {
              setSession("demo-session-0000-0000-0000-000000000001", "demo-roadmap-0000-0000-0000-000000000001");
              router.push({
                pathname: "/roadmap",
                params: { roadmapId: "demo-roadmap-0000-0000-0000-000000000001" },
              });
            }}
          />

          <Link href="/profile" asChild>
            <Text className="text-white/40 text-center mt-6">View profile</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
