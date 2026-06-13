import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/roadmap/ProgressRing";
import type { QuizItem } from "@/types";

interface QuizCardProps {
  questions: QuizItem[];
  onComplete: (score: number) => void;
}

export function QuizCard({ questions, onComplete }: QuizCardProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const score = useMemo(
    () => Math.min(100, Math.round((correctCount / questions.length) * 100)),
    [correctCount, questions.length],
  );

  const handleSelect = (option: string) => {
    if (submitted) return;
    setSelected(option);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    const isCorrect = selected === question.correct;
    if (isCorrect) setCorrectCount((c) => c + 1);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
      );
    }
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      const finalScore = Math.min(
        100,
        Math.round((correctCount / questions.length) * 100),
      );
      setFinished(true);
      onComplete(finalScore);
      return;
    }

    setIndex((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
  };

  if (finished) {
    return (
      <View className="items-center py-8">
        {score >= 80 && <ConfettiCannon count={80} origin={{ x: 0, y: 0 }} fadeOut />}
        <ProgressRing progress={score} size={120} stroke={8} color={score >= 80 ? "#00C896" : "#6C63FF"} />
        <Text className="text-white text-3xl font-bold mt-6">{score}%</Text>
        <Text className="text-white/60 mt-2">Quiz complete</Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-white/60 mb-4">
        Question {index + 1} of {questions.length}
      </Text>
      <Card className="mb-4">
        <Text className="text-white text-lg font-semibold">{question.question}</Text>
      </Card>
      {question.options.map((option) => {
        const isSelected = selected === option;
        const isCorrect = submitted && option === question.correct;
        const isWrong = submitted && isSelected && option !== question.correct;
        return (
          <Pressable
            key={option}
            onPress={() => handleSelect(option)}
            className={`mb-3 rounded-2xl border p-4 ${
              isCorrect
                ? "border-success bg-success/20"
                : isWrong
                  ? "border-error bg-error/20"
                  : isSelected
                    ? "border-primary bg-primary/20"
                    : "border-white/10 bg-white/5"
            }`}
          >
            <Text className="text-white">{option}</Text>
          </Pressable>
        );
      })}
      {submitted && (
        <Text className="text-white/70 mb-4">{question.explanation}</Text>
      )}
      {!submitted ? (
        <Button title="Submit Answer" onPress={handleSubmit} disabled={!selected} />
      ) : (
        <Button title={index + 1 >= questions.length ? "See Results" : "Next Question"} onPress={handleNext} />
      )}
    </View>
  );
}
