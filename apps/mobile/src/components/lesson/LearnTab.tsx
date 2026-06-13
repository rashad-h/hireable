import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MarkdownText } from "@/components/lesson/MarkdownText";
import { ResourceLink } from "@/components/lesson/ResourceLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { LearnContent } from "@/types";

type ProgressMap = Record<string, Record<string, boolean>>;

interface LearnTabProps {
  lessonId: string;
  sessionId: string | null;
  content: LearnContent;
}

function progressKey(sessionId: string | null, lessonId: string) {
  return `learn-progress:${sessionId ?? "anon"}:${lessonId}`;
}

export function LearnTab({ lessonId, sessionId, content }: LearnTabProps) {
  const totalSteps = content.steps.length;
  const [stepIndex, setStepIndex] = useState(0);
  const [checks, setChecks] = useState<ProgressMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(progressKey(sessionId, lessonId)).then((raw) => {
      if (raw) setChecks(JSON.parse(raw) as ProgressMap);
      setHydrated(true);
    });
  }, [lessonId, sessionId]);

  const persist = useCallback(
    (next: ProgressMap) => {
      setChecks(next);
      AsyncStorage.setItem(progressKey(sessionId, lessonId), JSON.stringify(next));
    },
    [lessonId, sessionId],
  );

  const toggleCheck = (stepId: string, checkId: string) => {
    persist({
      ...checks,
      [stepId]: { ...checks[stepId], [checkId]: !checks[stepId]?.[checkId] },
    });
  };

  const step = stepIndex > 0 ? content.steps[stepIndex - 1] : null;
  const stepChecks = step ? checks[step.id] ?? {} : {};
  const requiredChecks = step?.check_items ?? [];
  const allChecked =
    requiredChecks.length === 0 || requiredChecks.every((c) => stepChecks[c.id]);

  const completedSteps = useMemo(() => {
    return content.steps.filter((s) => {
      const items = s.check_items;
      if (!items.length) return false;
      return items.every((c) => checks[s.id]?.[c.id]);
    }).length;
  }, [checks, content.steps]);

  if (!hydrated) {
    return <Text className="text-white/50">Loading lesson...</Text>;
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white/45 text-xs">
          {stepIndex === 0 ? "Overview" : `Step ${stepIndex} of ${totalSteps}`}
        </Text>
        <Text className="text-white/45 text-xs">
          {completedSteps}/{totalSteps} complete
        </Text>
      </View>

      <View className="flex-row gap-1 mb-4">
        {Array.from({ length: totalSteps + 1 }).map((_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-accent" : "bg-white/10"}`}
          />
        ))}
      </View>

      {stepIndex === 0 ? (
        <Card className="mb-4">
          <Text className="text-white text-lg font-bold mb-3">What you'll learn</Text>
          <MarkdownText content={content.summary} />
        </Card>
      ) : step ? (
        <Card className="mb-4">
          <Text className="text-white text-xl font-bold mb-3">{step.title}</Text>
          <MarkdownText content={step.content} />

          {step.resource && (
            <Pressable
              onPress={() => Linking.openURL(step.resource!.url)}
              className="mt-4 flex-row items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
            >
              <Text className="text-2xl">{step.resource.type === "youtube" ? "▶️" : "📰"}</Text>
              <View className="flex-1">
                <Text className="text-accent text-xs mb-0.5">Recommended resource</Text>
                <Text className="text-white font-medium">{step.resource.title}</Text>
              </View>
              <Text className="text-accent text-sm">Open →</Text>
            </Pressable>
          )}

          {requiredChecks.length > 0 && (
            <View className="mt-5 pt-4 border-t border-white/10">
              <Text className="text-white/50 text-xs uppercase tracking-widest mb-3">
                Check off when ready
              </Text>
              {requiredChecks.map((item) => {
                const checked = !!stepChecks[item.id];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleCheck(step.id, item.id)}
                    className="flex-row items-center gap-3 mb-3"
                  >
                    <View
                      className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                        checked ? "bg-success border-success" : "border-white/30"
                      }`}
                    >
                      {checked && <Text className="text-white text-xs font-bold">✓</Text>}
                    </View>
                    <Text className={`flex-1 ${checked ? "text-success" : "text-white/80"}`}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      ) : null}

      {stepIndex > totalSteps && content.resources.length > 0 && (
        <View className="mb-4">
          <Text className="text-white font-semibold mb-3">All resources</Text>
          {content.resources.map((r) => (
            <ResourceLink key={r.url} resource={r} />
          ))}
        </View>
      )}

      <View className="flex-row gap-2 mt-2">
        {stepIndex > 0 && (
          <Button
            title="← Back"
            variant="secondary"
            className="flex-1"
            onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
          />
        )}
        {stepIndex <= totalSteps ? (
          <Button
            title={
              stepIndex === 0
                ? "Start lesson →"
                : stepIndex === totalSteps
                  ? "View all resources →"
                  : allChecked
                    ? "Next →"
                    : "Check all boxes to continue"
            }
            className="flex-1"
            disabled={stepIndex > 0 && stepIndex <= totalSteps && !allChecked}
            onPress={() => setStepIndex((i) => i + 1)}
          />
        ) : (
          <View className="flex-1 rounded-2xl bg-success/15 border border-success/30 p-4 items-center">
            <Text className="text-success font-semibold text-center">
              Lesson complete — try Flashcards & Quiz →
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
