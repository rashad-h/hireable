import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { acknowledgeAnalysis, getCVAnalysis } from "@/api/client";
import { AnalysisWizard } from "@/components/cv/analysis/AnalysisWizard";
import type { AnalysisReport } from "@/types";

export default function AnalysisReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getCVAnalysis(sessionId)
      .then((data) => {
        setReport(data);
        setClaimed(new Set(data.claimed_skills));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analysis"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const toggleClaim = useCallback((skill: string) => {
    setClaimed((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }, []);

  const handleFinish = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      await acknowledgeAnalysis(sessionId, Array.from(claimed));
      router.replace({ pathname: "/analyzing", params: { sessionId, phase: "building" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-white/60">Preparing your analysis...</Text>
      </SafeAreaView>
    );
  }

  if (!report || error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-error text-center">{error || "Analysis not found"}</Text>
      </SafeAreaView>
    );
  }

  return (
    <AnalysisWizard
      report={report}
      claimed={claimed}
      onToggleClaim={toggleClaim}
      onFinish={handleFinish}
      submitting={submitting}
    />
  );
}
