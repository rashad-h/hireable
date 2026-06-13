import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { calculateLevel, levelTitle, xpProgressPercent } from "@/utils/xp";

interface XPBarProps {
  xp: number;
}

export function XPBar({ xp }: XPBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(xpProgressPercent(xp));
  }, [xp, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const level = calculateLevel(xp);

  return (
    <View>
      <View className="flex-row justify-between mb-2">
        <Text className="text-white/70 text-xs">Level {level}</Text>
        <Text className="text-white/70 text-xs">{xp % 100}/100 XP</Text>
      </View>
      <View className="h-2 rounded-full bg-white/10 overflow-hidden">
        <Animated.View className="h-full bg-accent rounded-full" style={fillStyle} />
      </View>
    </View>
  );
}

export function LevelBadge({ xp }: { xp: number }) {
  const level = calculateLevel(xp);
  return (
    <View className="rounded-full bg-primary/20 px-4 py-2 border border-primary/40">
      <Text className="text-primary font-semibold text-sm">
        Level {level} • {levelTitle(level)}
      </Text>
    </View>
  );
}
