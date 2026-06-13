import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getProgress, getRoadmap, getRoadmapSummary } from "@/api/client";
import { SkillTreeDiagram } from "@/components/cv/SkillTreeDiagram";
import { LoadingSkeleton } from "@/components/cv/UploadCard";
import { LevelBadge, XPBar } from "@/components/gamification/XPBar";
import { XPPopup } from "@/components/gamification/XPPopup";
import {
  CollapsibleTopicSection,
  defaultExpandedTopicIds,
} from "@/components/roadmap/LessonTrackNode";
import { Card } from "@/components/ui/Card";
import { useAppStore, useStoreHydrated } from "@/stores/useAppStore";
import { applyLessonProgressToTree } from "@/utils/skillTreeProgress";

function roleFunFactFallback(targetRole: string) {
  return `Did you know? ${targetRole} is one of the most searched job titles on LinkedIn right now — and the skills employers want change faster than almost any other role.`;
}

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
  const [summary, setSummary] = useState("");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
  const collapseInitRef = useRef<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      if (hydrated && roadmapId) {
        load();
      }
    }, [hydrated, roadmapId, load]),
  );

  const funFact =
    roadmap?.role_fun_fact?.trim() ||
    (roadmap?.target_role ? roleFunFactFallback(roadmap.target_role) : "");

  const displayTree = useMemo(
    () => applyLessonProgressToTree(roadmap?.skill_tree, roadmap ?? undefined),
    [roadmap],
  );

  useEffect(() => {
    if (!roadmap?.topics.length || collapseInitRef.current === roadmap.id) return;
    collapseInitRef.current = roadmap.id;
    setExpandedTopics(defaultExpandedTopicIds(roadmap.topics));

    const subtopicIds = new Set<string>();
    for (const topic of roadmap.topics) {
      const activeSubtopic = topic.subtopics.find((st) =>
        st.lessons.some((l) => !l.completed && !l.is_locked),
      );
      if (activeSubtopic) subtopicIds.add(activeSubtopic.id);
      else if (topic.subtopics[0]) subtopicIds.add(topic.subtopics[0].id);
    }
    setExpandedSubtopics(subtopicIds);
  }, [roadmap]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const toggleSubtopic = (subtopicId: string) => {
    setExpandedSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(subtopicId)) next.delete(subtopicId);
      else next.add(subtopicId);
      return next;
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="px-6 pt-4 gap-4">
            <LoadingSkeleton className="h-24" />
            <LoadingSkeleton className="h-16" />
            <LoadingSkeleton className="h-48" />
            <LoadingSkeleton className="h-32" />
          </View>
        ) : (
          <>
            {funFact ? (
              <View className="px-6 pt-4 mb-4">
                <Card className="border border-accent/20 bg-accent/5">
                  <Text className="text-accent text-xs uppercase tracking-widest mb-2">Fun fact</Text>
                  <Text className="text-white/85 text-base leading-6">{funFact}</Text>
                  {roadmap?.target_role ? (
                    <Text className="text-white/40 text-xs mt-3">About {roadmap.target_role}</Text>
                  ) : null}
                </Card>
              </View>
            ) : null}

            <View className="px-6 pb-2">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-1 pr-4">
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

            {displayTree ? (
              <View className="px-6 mb-8">
                <Text className="text-white text-lg font-bold mb-1">Your Skill Map</Text>
                <Text className="text-white/45 text-sm mb-3">
                  Updates as you complete lessons
                </Text>
                <SkillTreeDiagram
                  targetRole={roadmap?.target_role}
                  tree={displayTree}
                  compact
                  roadmap={roadmap ?? undefined}
                />
              </View>
            ) : null}

            <View className="mx-6 mb-6 border-t border-white/10" />

            <View className="px-6">
              <Text className="text-white text-lg font-bold mb-1">Your Lessons</Text>
              <Text className="text-white/45 text-sm mb-4">
                Tap a course to expand or collapse its lessons
              </Text>

              {(roadmap?.topics || []).map((topic) => (
                <CollapsibleTopicSection
                  key={topic.id}
                  topic={topic}
                  expanded={expandedTopics.has(topic.id)}
                  onToggle={() => toggleTopic(topic.id)}
                  expandedSubtopics={expandedSubtopics}
                  onToggleSubtopic={toggleSubtopic}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <XPPopup amount={lastXpEarned} visible={showXpPopup} onDone={clearXpPopup} />
    </SafeAreaView>
  );
}
