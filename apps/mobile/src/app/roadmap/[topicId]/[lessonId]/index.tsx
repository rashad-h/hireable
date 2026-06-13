import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfettiCannon from "react-native-confetti-cannon";

import { completeLesson, generateLessonContent, getLesson } from "@/api/client";
import { FlashCardDeck } from "@/components/lesson/FlashCard";
import { LearnTab } from "@/components/lesson/LearnTab";
import { QuizCard } from "@/components/lesson/QuizCard";
import { useAppStore } from "@/stores/useAppStore";
import type { FlashcardItem, LearnContent, QuizItem } from "@/types";

type TabKey = "learn" | "flashcards" | "quiz";

const TABS: { key: TabKey; label: string }[] = [
  { key: "learn", label: "Learn" },
  { key: "flashcards", label: "Flashcards" },
  { key: "quiz", label: "Quiz" },
];

function resourcesToLearnContent(
  resources: { type: "youtube" | "article"; title: string; url: string }[],
  title: string,
  description: string,
): LearnContent {
  return {
    summary: `## ${title}\n\n${description}`,
    steps: resources.map((r, i) => ({
      id: `legacy-${i}`,
      title: r.title,
      content: `Review this **${r.type === "youtube" ? "video" : "article"}** to deepen your understanding.`,
      check_items: [{ id: `c-${i}`, label: `I've read/watched: ${r.title}` }],
      resource: r,
    })),
    resources,
  };
}

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string; topicId: string }>();
  const sessionId = useAppStore((s) => s.sessionId);
  const triggerXpPopup = useAppStore((s) => s.triggerXpPopup);
  const setProgress = useAppStore((s) => s.setProgress);

  const [tab, setTab] = useState<TabKey>("learn");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [learnContent, setLearnContent] = useState<LearnContent | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const lesson = await getLesson(lessonId, sessionId || undefined);
      setTitle(lesson.title);
      setDescription(lesson.description);
      setCompleted(lesson.completed);
      if (lesson.learn_content) {
        setLearnContent(lesson.learn_content);
      } else if (lesson.resources?.length) {
        setLearnContent(resourcesToLearnContent(lesson.resources, lesson.title, lesson.description));
      }
      if (lesson.flashcards) setFlashcards(lesson.flashcards);
      if (lesson.quiz) setQuiz(lesson.quiz);
    } finally {
      setLoading(false);
    }
  }, [lessonId, sessionId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const loadTabContent = async (contentType: TabKey) => {
    if (!lessonId) return;
    if (contentType === "learn" && learnContent) return;
    if (contentType === "flashcards" && flashcards.length) return;
    if (contentType === "quiz" && quiz.length) return;

    setContentLoading(true);
    try {
      const result = await generateLessonContent(
        lessonId,
        contentType === "learn" ? "learn" : contentType,
      );
      if (result.learn_content) setLearnContent(result.learn_content);
      else if (result.resources?.length) {
        setLearnContent(resourcesToLearnContent(result.resources, title, description));
      }
      if (result.flashcards) setFlashcards(result.flashcards);
      if (result.quiz) setQuiz(result.quiz);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "learn") loadTabContent("learn");
    if (tab === "flashcards") loadTabContent("flashcards");
    if (tab === "quiz") loadTabContent("quiz");
  }, [tab]);

  const handleQuizComplete = async (score: number) => {
    if (!lessonId || !sessionId || completed) return;
    const result = await completeLesson(lessonId, sessionId, score);
    setProgress(result.total_xp, result.new_level || 1);
    if (result.xp_earned > 0) {
      triggerXpPopup(result.xp_earned, result.level_up);
      if (result.level_up) setShowConfetti(true);
    }
    setCompleted(true);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background items-center justify-center">
          <ActivityIndicator color="#6C63FF" size="large" />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: title || "Lesson" }} />
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
      {showConfetti && <ConfettiCannon count={120} origin={{ x: -10, y: 0 }} fadeOut autoStart />}
      <View className="px-6 pt-2 pb-4">
        <Text className="text-white text-2xl font-bold">{title}</Text>
        {completed && <Text className="text-success mt-1">Completed</Text>}
      </View>

      <View className="flex-row mx-6 mb-4 bg-white/5 rounded-2xl p-1">
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            className={`flex-1 py-3 rounded-xl items-center ${tab === item.key ? "bg-primary" : ""}`}
          >
            <Text className={`font-medium ${tab === item.key ? "text-white" : "text-white/50"}`}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="px-6 pb-10">
        {contentLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator color="#00D2FF" />
            <Text className="text-white/50 mt-2">Generating lesson...</Text>
          </View>
        )}

        {!contentLoading && tab === "learn" && learnContent && lessonId && (
          <LearnTab lessonId={lessonId} sessionId={sessionId} content={learnContent} />
        )}

        {!contentLoading && tab === "learn" && !learnContent && (
          <Text className="text-white/60">No lesson content yet.</Text>
        )}

        {!contentLoading && tab === "flashcards" && flashcards.length > 0 && (
          <FlashCardDeck cards={flashcards} />
        )}

        {!contentLoading && tab === "quiz" && quiz.length > 0 && (
          <QuizCard questions={quiz} onComplete={handleQuizComplete} />
        )}
      </ScrollView>
      </SafeAreaView>
    </>
  );
}
