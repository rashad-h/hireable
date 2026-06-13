import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { getCVStatus } from "@/api/client";
import { SkillTreeDiagram } from "@/components/cv/SkillTreeDiagram";
import { useAppStore } from "@/stores/useAppStore";
import type { SkillTreeBranch } from "@/types";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STAGES = [
  { key: "parsing", label: "Parsing your CV..." },
  { key: "searching", label: "Searching job market..." },
  { key: "analyzing", label: "Analyzing skill gaps..." },
  { key: "review", label: "Preparing your report..." },
  { key: "building", label: "Building your roadmap..." },
];

export default function AnalyzingScreen() {
  const { sessionId, phase } = useLocalSearchParams<{ sessionId: string; phase?: string }>();
  const setSession = useAppStore((s) => s.setSession);
  const [progress, setProgress] = useState(phase === "building" ? 85 : 0);
  const [message, setMessage] = useState(
    phase === "building" ? "Building your personalized learning roadmap..." : "Starting analysis...",
  );
  const [status, setStatus] = useState(phase === "building" ? "building" : "parsing");
  const [skillTree, setSkillTree] = useState<SkillTreeBranch | null>(null);
  const [targetRole, setTargetRole] = useState<string>();

  const ringProgress = useSharedValue(phase === "building" ? 85 : 0);
  const size = 140;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (ringProgress.value / 100) * circumference,
  }));

  const completedStages = useMemo(() => {
    const order = ["parsing", "searching", "analyzing", "review", "building", "done"];
    const currentIndex = order.indexOf(status);
    return STAGES.map((_, index) => currentIndex > index || status === "done");
  }, [status]);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const result = await getCVStatus(sessionId);
        setProgress(result.progress);
        setMessage(result.message);
        setStatus(result.status);
        if (result.skill_tree) setSkillTree(result.skill_tree);
        if (result.target_role) setTargetRole(result.target_role);
        ringProgress.value = withTiming(result.progress, { duration: 500 });

        if (result.status === "review") {
          router.replace({ pathname: "/analysis-report", params: { sessionId } });
          return;
        }
        if (result.status === "done" && result.roadmap_id) {
          setSession(sessionId, result.roadmap_id);
          router.replace({ pathname: "/roadmap", params: { roadmapId: result.roadmap_id } });
        }
        if (result.status === "error") {
          setMessage(result.message);
        }
      } catch {
        setMessage("Connection error. Retrying...");
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId, setSession, ringProgress]);

  const showTree = skillTree && ["analyzing", "review", "building"].includes(status);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-6 py-8">
        <Text className="text-white text-3xl font-bold text-center mb-2">Analyzing</Text>
        <Text className="text-white/60 text-center mb-6">{message}</Text>

        <View className="items-center mb-8">
          <View className="items-center justify-center" style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={stroke}
                fill="none"
              />
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#00D2FF"
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                animatedProps={animatedProps}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>
            <Text className="text-white text-3xl font-bold absolute">{progress}%</Text>
          </View>
        </View>

        <View className="gap-3 mb-8">
          {STAGES.map((stage, index) => (
            <View key={stage.key} className="flex-row items-center gap-3">
              <Text className="text-lg">{completedStages[index] ? "✅" : "⏳"}</Text>
              <Text className={`${completedStages[index] ? "text-white" : "text-white/50"}`}>{stage.label}</Text>
            </View>
          ))}
        </View>

        {showTree && (
          <View>
            <Text className="text-white text-lg font-bold mb-3">Live Skill Map</Text>
            <SkillTreeDiagram targetRole={targetRole} tree={skillTree} compact />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
