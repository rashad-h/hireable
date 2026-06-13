import { useEffect, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { ProgressRing } from "@/components/roadmap/ProgressRing";
import { CollapseChevron, CollapsibleBody } from "@/components/ui/CollapsibleSection";
import { formatMinutes } from "@/utils/xp";
import type { Lesson, Topic } from "@/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LessonTrackNodeProps {
  topicId: string;
  topicColor: string;
  lesson: Lesson;
  index: number;
  isLast: boolean;
  isNext: boolean;
}

function StatusNode({
  lesson,
  topicColor,
  isNext,
}: {
  lesson: Lesson;
  topicColor: string;
  isNext: boolean;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isNext) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true,
      );
    } else {
      pulse.value = 1;
    }
  }, [isNext, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const size = 40;
  const r = (size - 4) / 2;

  if (lesson.completed) {
    return (
      <View
        className="items-center justify-center rounded-full"
        style={{ width: size, height: size, backgroundColor: "#00C896" }}
      >
        <Text className="text-white font-bold text-sm">✓</Text>
      </View>
    );
  }

  if (lesson.is_locked) {
    return (
      <View
        className="items-center justify-center rounded-full border-2 border-white/15 bg-white/5"
        style={{ width: size, height: size }}
      >
        <Text className="text-white/35 text-sm">🔒</Text>
      </View>
    );
  }

  return (
    <Animated.View style={pulseStyle}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={3}
            fill="rgba(255,255,255,0.04)"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={isNext ? topicColor : "rgba(255,255,255,0.35)"}
            strokeWidth={3}
            fill={isNext ? `${topicColor}33` : "transparent"}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center pl-0.5">
          <Text style={{ color: isNext ? topicColor : "rgba(255,255,255,0.75)", fontSize: 13 }}>▶</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function LessonCard({
  lesson,
  topicId,
  topicColor,
  isLast,
  isNext,
  onPressIn,
  onPressOut,
  pressStyle,
}: {
  lesson: Lesson;
  topicId: string;
  topicColor: string;
  isLast: boolean;
  isNext: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  pressStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  const openLesson = () => {
    if (lesson.is_locked) return;
    router.push(`/roadmap/${topicId}/${lesson.id}`);
  };

  return (
    <AnimatedPressable
      disabled={lesson.is_locked}
      onPress={openLesson}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`Open lesson: ${lesson.title}`}
      style={[{ flex: 1, marginBottom: isLast ? 0 : 12 }, pressStyle]}
      className="rounded-2xl border border-white/10 p-3.5 overflow-hidden"
    >
      <View
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: lesson.completed ? "#00C896" : isNext ? topicColor : "transparent" }}
      />
      {isNext ? (
        <View
          className="absolute inset-0 rounded-2xl"
          style={{ borderWidth: 1, borderColor: `${topicColor}44` }}
        />
      ) : null}
      <Text className="text-white font-semibold text-base" numberOfLines={2}>
        {lesson.title}
      </Text>
      <View className="flex-row items-center gap-3 mt-2 flex-wrap">
        <View className="flex-row items-center gap-1">
          <Text className="text-xs">⏱</Text>
          <Text className="text-white/45 text-xs">{formatMinutes(lesson.estimated_minutes)}</Text>
        </View>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: lesson.completed ? "rgba(0,200,150,0.15)" : `${topicColor}22` }}
        >
          <Text className="text-xs font-semibold" style={{ color: lesson.completed ? "#00C896" : topicColor }}>
            +{lesson.xp_reward} XP
          </Text>
        </View>
        {isNext ? (
          <View className="px-2 py-0.5 rounded-full bg-accent/15">
            <Text className="text-accent text-[10px] font-bold uppercase tracking-wide">Up next</Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export function LessonTrackNode({
  topicId,
  topicColor,
  lesson,
  index,
  isLast,
  isNext,
}: LessonTrackNodeProps) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!lesson.is_locked) scale.value = withSpring(0.97);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const cardProps = {
    lesson,
    topicId,
    topicColor,
    isLast,
    isNext,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    pressStyle,
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).duration(400)}
      className={`flex-row gap-3 ${lesson.is_locked ? "opacity-45" : ""}`}
    >
      <View className="items-center" style={{ width: 40 }}>
        <StatusNode lesson={lesson} topicColor={topicColor} isNext={isNext} />
        {!isLast ? (
          <View
            className="flex-1 w-0.5 mt-1 mb-1 rounded-full"
            style={{
              minHeight: 20,
              backgroundColor: lesson.completed ? `${topicColor}88` : "rgba(255,255,255,0.08)",
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <LessonCard {...cardProps} />
      </View>
    </Animated.View>
  );
}

interface TopicTrackHeaderProps {
  icon: string;
  title: string;
  color: string;
  completedLessons: number;
  totalLessons: number;
  expanded?: boolean;
  onToggle?: () => void;
}

export function TopicTrackHeader({
  icon,
  title,
  color,
  completedLessons,
  totalLessons,
  expanded = true,
  onToggle,
}: TopicTrackHeaderProps) {
  const progress = totalLessons ? (completedLessons / totalLessons) * 100 : 0;
  const isComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const scale = useSharedValue(1);
  const headerPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <Animated.View
      entering={FadeInDown.duration(350)}
      className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden ${
        onToggle ? "mb-0" : "mb-5"
      }`}
      style={{ backgroundColor: `${color}28` }}
    >
      {onToggle ? <CollapseChevron expanded={expanded} className="w-3 items-center" /> : null}
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center"
        style={{ backgroundColor: `${color}44` }}
      >
        <Text className="text-2xl">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-base">{title}</Text>
        <Text className="text-white/45 text-xs mt-0.5">
          {completedLessons}/{totalLessons} lessons{isComplete ? " · Complete" : ""}
        </Text>
        <View className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </View>
      </View>
      <ProgressRing progress={progress} size={44} stroke={4} color={color} />
    </Animated.View>
  );

  if (!onToggle) return content;

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 400 });
      }}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <Animated.View style={headerPressStyle}>{content}</Animated.View>
    </Pressable>
  );
}

interface CollapsibleSubtopicProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleSubtopic({ title, expanded, onToggle, children }: CollapsibleSubtopicProps) {
  return (
    <View className="mb-4">
      <Pressable
        onPress={onToggle}
        className="self-start flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-3 ml-12"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <CollapseChevron expanded={expanded} />
        <Text className="text-white/50 text-xs font-medium">{title}</Text>
      </Pressable>
      <CollapsibleBody expanded={expanded}>{children}</CollapsibleBody>
    </View>
  );
}

export function defaultExpandedTopicIds(topics: { id: string; subtopics: { lessons: { completed: boolean; is_locked: boolean }[] }[] }[]) {
  const expanded = new Set<string>();
  for (const topic of topics) {
    const hasActive = topic.subtopics.some((st) =>
      st.lessons.some((l) => !l.completed && !l.is_locked),
    );
    if (hasActive) expanded.add(topic.id);
  }
  if (expanded.size === 0 && topics[0]) expanded.add(topics[0].id);
  return expanded;
}

interface CollapsibleTopicSectionProps {
  topic: Topic;
  expanded: boolean;
  onToggle: () => void;
  expandedSubtopics: Set<string>;
  onToggleSubtopic: (subtopicId: string) => void;
}

export function CollapsibleTopicSection({
  topic,
  expanded,
  onToggle,
  expandedSubtopics,
  onToggleSubtopic,
}: CollapsibleTopicSectionProps) {
  return (
    <View className="mb-8">
      <TopicTrackHeader
        icon={topic.icon}
        title={topic.title}
        color={topic.color}
        completedLessons={topic.completed_lessons}
        totalLessons={topic.total_lessons}
        expanded={expanded}
        onToggle={onToggle}
      />

      <CollapsibleBody expanded={expanded} className="mt-4">
        {topic.subtopics.map((subtopic) => (
          <CollapsibleSubtopic
            key={subtopic.id}
            title={subtopic.title}
            expanded={expandedSubtopics.has(subtopic.id)}
            onToggle={() => onToggleSubtopic(subtopic.id)}
          >
            <LessonTrack
              topicId={topic.id}
              topicColor={topic.color}
              lessons={subtopic.lessons}
            />
          </CollapsibleSubtopic>
        ))}
      </CollapsibleBody>
    </View>
  );
}

interface LessonTrackProps {
  topicId: string;
  topicColor: string;
  lessons: Lesson[];
}

export function LessonTrack({ topicId, topicColor, lessons }: LessonTrackProps) {
  const nextLessonId = lessons.find((l) => !l.completed && !l.is_locked)?.id;

  return (
    <View>
      {lessons.map((lesson, index) => (
        <LessonTrackNode
          key={lesson.id}
          topicId={topicId}
          topicColor={topicColor}
          lesson={lesson}
          index={index}
          isLast={index === lessons.length - 1}
          isNext={lesson.id === nextLessonId}
        />
      ))}
    </View>
  );
}
