import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import { Badge } from "@/components/ui/Badge";
import { formatMinutes } from "@/utils/xp";
import type { Lesson } from "@/types";

interface SubtopicRowProps {
  topicId: string;
  lesson: Lesson;
}

export function SubtopicRow({ topicId, lesson }: SubtopicRowProps) {
  const content = (
    <View
      className={`flex-row items-center justify-between py-4 border-b border-white/10 ${
        lesson.is_locked ? "opacity-40" : ""
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-white font-medium">
          {lesson.is_locked ? "🔒 " : lesson.completed ? "✅ " : ""}
          {lesson.title}
        </Text>
        <Text className="text-white/50 text-xs mt-1">
          {formatMinutes(lesson.estimated_minutes)}
        </Text>
      </View>
      <Badge label={`+${lesson.xp_reward} XP`} tone={lesson.completed ? "success" : "primary"} />
    </View>
  );

  if (lesson.is_locked) {
    return content;
  }

  return (
    <Link href={`/roadmap/${topicId}/${lesson.id}`} asChild>
      <Pressable>{content}</Pressable>
    </Link>
  );
}
