import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/roadmap/ProgressRing";
import type { Topic } from "@/types";

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const progress = topic.total_lessons
    ? (topic.completed_lessons / topic.total_lessons) * 100
    : 0;

  return (
    <Link href={`/roadmap/${topic.id}`} asChild>
      <Pressable
        className="rounded-3xl p-5 min-h-[140px] justify-between"
        style={{ backgroundColor: topic.color }}
      >
        <View>
          <Text className="text-3xl mb-2">{topic.icon}</Text>
          <Text className="text-white font-bold text-base">{topic.title}</Text>
          <Text className="text-white/80 text-xs mt-1">
            {topic.total_lessons} lessons
          </Text>
        </View>
        <View className="flex-row justify-between items-end mt-4">
          <Badge label={`${topic.xp_total} XP`} tone="accent" />
          <ProgressRing progress={progress} color="#ffffff" />
        </View>
      </Pressable>
    </Link>
  );
}
