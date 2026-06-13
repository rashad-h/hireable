import { useCallback, useEffect, useState } from "react";
import { FlatList, Platform, Pressable, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getProgress, getRoadmap, getRoadmapSummary } from "@/api/client";
import { LevelBadge, XPBar } from "@/components/gamification/XPBar";
import { XPPopup } from "@/components/gamification/XPPopup";
import { LoadingSkeleton } from "@/components/cv/UploadCard";
import { TopicCard } from "@/components/roadmap/TopicCard";
import { useAppStore, useStoreHydrated } from "@/stores/useAppStore";

export default function RoadmapScreen() {
  const params = useLocalSearchParams<{ roadmapId?: string }>();
  const hydrated = useStoreHydrated();
  const storedSessionId = useAppStore((s) => s.sessionId);
  const storedRoadmapId = useAppStore((s) => s.roadmapId);
  const setSession = useAppStore((s) => s.setSession);
  const roadmapId = params.roadmapId || storedRoadmapId;
  const roadmap = useAppStore((s) => s.roadmap);
  const xp = useAppStore((s) => s.xp);
  const setRoadmap = useAppStore((s) => s.setRoadmap);
  const setProgress = useAppStore((s) => s.setProgress);
  const showXpPopup = useAppStore((s) => s.showXpPopup);
  const lastXpEarned = useAppStore((s) => s.lastXpEarned);
  const clearXpPopup = useAppStore((s) => s.clearXpPopup);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");

  const load = useCallback(async () => {
    if (!hydrated || !roadmapId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const roadmapData = await getRoadmap(roadmapId, storedSessionId ?? undefined);
      const resolvedSessionId = storedSessionId ?? roadmapData.session_id ?? null;
      if (resolvedSessionId && (!storedSessionId || storedRoadmapId !== roadmapId)) {
        setSession(resolvedSessionId, roadmapId, roadmapData.target_role);
      }
      if (!resolvedSessionId) {
        setRoadmap(roadmapData);
        return;
      }
      const [progressData, summaryData] = await Promise.all([
        getProgress(resolvedSessionId),
        getRoadmapSummary(roadmapId, resolvedSessionId),
      ]);
      setRoadmap(roadmapData);
      setProgress(progressData.xp, progressData.level);
      setSummary(`${summaryData.completed_lessons}/${summaryData.total_lessons} lessons complete`);
    } finally {
      setLoading(false);
    }
  }, [hydrated, roadmapId, storedSessionId, storedRoadmapId, setProgress, setRoadmap, setSession]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-white text-2xl font-bold">{roadmap?.title || "Your Roadmap"}</Text>
            <Text className="text-white/50 text-sm mt-1">{summary}</Text>
          </View>
          <Link href="/profile" asChild>
            <Pressable>
              <Text className="text-accent">Profile</Text>
            </Pressable>
          </Link>
        </View>
        <LevelBadge xp={xp} />
        <View className="mt-4">
          <XPBar xp={xp} />
        </View>
      </View>

      {loading ? (
        <View className="px-6 gap-4">
          <LoadingSkeleton className="h-40" />
          <LoadingSkeleton className="h-40" />
        </View>
      ) : (
        <FlatList
          data={roadmap?.topics || []}
          numColumns={Platform.OS === "web" ? 1 : 2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={
            Platform.OS === "web" ? undefined : { gap: 12, paddingHorizontal: 24 }
          }
          contentContainerStyle={{
            gap: 12,
            paddingBottom: 40,
            paddingTop: 16,
            paddingHorizontal: Platform.OS === "web" ? 20 : 0,
          }}
          renderItem={({ item }) => <TopicCard topic={item} />}
        />
      )}

      <XPPopup amount={lastXpEarned} visible={showXpPopup} onDone={clearXpPopup} />
    </SafeAreaView>
  );
}
