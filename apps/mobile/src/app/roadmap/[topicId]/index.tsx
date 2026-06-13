import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getRoadmap } from "@/api/client";
import { LoadingSkeleton } from "@/components/cv/UploadCard";
import { SubtopicRow } from "@/components/roadmap/SubtopicRow";
import { useAppStore } from "@/stores/useAppStore";

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const sessionId = useAppStore((s) => s.sessionId);
  const roadmapId = useAppStore((s) => s.roadmapId);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<import("@/types").Topic | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!roadmapId || !sessionId || !topicId) return;
      setLoading(true);
      try {
        const roadmap = await getRoadmap(roadmapId, sessionId);
        setTopic(roadmap.topics.find((t) => t.id === topicId) || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roadmapId, sessionId, topicId]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background px-6 pt-4">
          <LoadingSkeleton className="h-32 mb-6" />
          <LoadingSkeleton className="h-16 mb-3" />
          <LoadingSkeleton className="h-16 mb-3" />
        </SafeAreaView>
      </>
    );
  }

  if (!topic) {
    return (
      <>
        <Stack.Screen options={{ title: "Topic" }} />
        <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background items-center justify-center">
          <Text className="text-white">Topic not found</Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: topic.title }} />
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
      <View
        className="px-6 py-8 rounded-b-3xl mb-4"
        style={{ backgroundColor: topic.color }}
      >
        <Text className="text-4xl mb-2">{topic.icon}</Text>
        <Text className="text-white text-2xl font-bold">{topic.title}</Text>
        <Text className="text-white/80 mt-2">{topic.description}</Text>
      </View>
      <ScrollView className="px-6">
        {topic.subtopics.map((subtopic) => (
          <View key={subtopic.id} className="mb-6">
            <Text className="text-white font-semibold text-lg mb-2">{subtopic.title}</Text>
            {subtopic.lessons.map((lesson) => (
              <SubtopicRow key={lesson.id} topicId={topic.id} lesson={lesson} />
            ))}
          </View>
        ))}
      </ScrollView>
      </SafeAreaView>
    </>
  );
}
