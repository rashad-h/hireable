import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  mascotForStage,
  mascotStageForLevel,
  MAX_MASCOT_STAGE,
} from "@/utils/mascot";

const DEMO_STEP_MS = 750;
const MASCOT_W = 56;
const MASCOT_H = 68;

interface MascotFunFactProps {
  fact: string;
  level: number;
  topicLabel?: string;
}

export function MascotFunFact({ fact, level }: MascotFunFactProps) {
  const targetStage = mascotStageForLevel(level);
  const [displayStage, setDisplayStage] = useState(targetStage);
  const [isDemoing, setIsDemoing] = useState(false);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bubbleFloat = useSharedValue(0);
  const mascotScale = useSharedValue(1);
  const mascotOpacity = useSharedValue(1);

  const clearDemoTimer = useCallback(() => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  const animateStageChange = useCallback(
    (nextStage: number) => {
      mascotScale.value = withSequence(
        withTiming(0.9, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
      mascotOpacity.value = withSequence(
        withTiming(0.5, { duration: 120 }),
        withTiming(1, { duration: 180 }),
      );
      setDisplayStage(nextStage);
    },
    [mascotOpacity, mascotScale],
  );

  useEffect(() => {
    bubbleFloat.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bubbleFloat]);

  useEffect(() => {
    if (isDemoing) return;
    if (displayStage !== targetStage) {
      animateStageChange(targetStage);
    }
  }, [targetStage, isDemoing, displayStage, animateStageChange]);

  useEffect(() => () => clearDemoTimer(), [clearDemoTimer]);

  const runDemo = useCallback(() => {
    if (isDemoing) return;
    clearDemoTimer();
    setIsDemoing(true);

    let step = 1;
    animateStageChange(step);

    const advance = () => {
      step += 1;
      if (step <= MAX_MASCOT_STAGE) {
        animateStageChange(step);
        demoTimerRef.current = setTimeout(advance, DEMO_STEP_MS);
        return;
      }

      demoTimerRef.current = setTimeout(() => {
        animateStageChange(targetStage);
        setIsDemoing(false);
      }, DEMO_STEP_MS);
    };

    demoTimerRef.current = setTimeout(advance, DEMO_STEP_MS);
  }, [animateStageChange, clearDemoTimer, isDemoing, targetStage]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bubbleFloat.value }],
  }));

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
    opacity: mascotOpacity.value,
  }));

  const mascot = mascotForStage(displayStage);

  return (
    <View className="px-5 pt-2 mb-1">
      <View className="flex-row items-end justify-end">
        <Animated.View style={bubbleStyle} className="flex-1 mr-2">
          <View
            className="relative rounded-2xl rounded-br-sm bg-white/[0.04] px-3.5 py-2.5"
            style={{ marginBottom: 10 }}
          >
            <Text className="text-white/50 text-[13px] leading-5">{fact}</Text>
            <View
              className="absolute -right-0.5 -bottom-1.5 w-0 h-0"
              style={{
                borderTopWidth: 7,
                borderLeftWidth: 7,
                borderTopColor: "rgba(255,255,255,0.04)",
                borderLeftColor: "transparent",
              }}
            />
          </View>
        </Animated.View>

        <Pressable
          onPress={runDemo}
          onLongPress={runDemo}
          disabled={isDemoing}
          hitSlop={10}
          className="-mr-1 mt-3"
        >
          <Animated.View style={mascotStyle}>
            <Image
              source={mascot.source}
              style={{ width: MASCOT_W, height: MASCOT_H }}
              resizeMode="contain"
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
