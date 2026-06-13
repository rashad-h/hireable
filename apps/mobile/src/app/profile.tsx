import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getProgress, getRoadmapSummary } from "@/api/client";
import { LevelBadge, XPBar } from "@/components/gamification/XPBar";
import { LoadingSkeleton } from "@/components/cv/UploadCard";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/stores/useAppStore";

export default function ProfileScreen() {
  const sessionId = useAppStore((s) => s.sessionId);
  const roadmapId = useAppStore((s) => s.roadmapId);
  const [loading, setLoading] = useState(true);
  const [progress, setProgressState] = useState<import("@/types").ProgressResponse | null>(null);
  const [summary, setSummary] = useState<import("@/types").RoadmapSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const progressData = await getProgress(sessionId);
        setProgressState(progressData);
        if (roadmapId) {
          const summaryData = await getRoadmapSummary(roadmapId, sessionId);
          setSummary(summaryData);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, roadmapId]);

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-6 py-6">
        <Text className="text-white text-3xl font-bold mb-6">Your Progress</Text>

        {loading ? (
          <View className="gap-4">
            <LoadingSkeleton className="h-24" />
            <LoadingSkeleton className="h-32" />
          </View>
        ) : !sessionId ? (
          <Card>
            <Text className="text-white/70">Upload a CV to start tracking progress.</Text>
          </Card>
        ) : (
          <>
            <LevelBadge xp={progress?.xp || 0} />
            <View className="mt-6 mb-8">
              <XPBar xp={progress?.xp || 0} />
            </View>

            <Card className="mb-4">
              <Text className="text-white/60 text-sm">Total XP</Text>
              <Text className="text-white text-3xl font-bold mt-1">{progress?.xp || 0}</Text>
            </Card>

            <Card className="mb-4">
              <Text className="text-white/60 text-sm">Completion</Text>
              <Text className="text-white text-3xl font-bold mt-1">
                {progress?.completion_percentage || 0}%
              </Text>
            </Card>

            {summary && (
              <Card>
                <Text className="text-white/60 text-sm">Roadmap</Text>
                <Text className="text-white text-xl font-semibold mt-1">{summary.title}</Text>
                <Text className="text-white/60 mt-2">
                  {summary.completed_lessons}/{summary.total_lessons} lessons • Gap score {summary.gap_score}%
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
