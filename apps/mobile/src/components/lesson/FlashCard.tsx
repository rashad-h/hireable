import React, { useState } from "react";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Card } from "@/components/ui/Card";
import type { FlashcardItem } from "@/types";

interface FlashCardProps {
  cards: FlashcardItem[];
}

export function FlashCardDeck({ cards }: FlashCardProps) {
  const [index, setIndex] = useState(0);
  const flipped = useSharedValue(0);
  const translateX = useSharedValue(0);

  const card = cards[index];

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipped.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: "hidden",
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipped.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  }));

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const nextCard = (direction: "got" | "review") => {
    translateX.value = withTiming(direction === "got" ? 400 : -400, { duration: 200 }, () => {
      translateX.value = 0;
    });
    flipped.value = 0;
    setIndex((current) => Math.min(current + 1, cards.length - 1));
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > 120) nextCard("got");
      else if (e.translationX < -120) nextCard("review");
      else translateX.value = withTiming(0);
    });

  if (!card) {
    return (
      <Card>
        <Text className="text-white text-center">All flashcards reviewed!</Text>
      </Card>
    );
  }

  return (
    <View>
      <Text className="text-white/60 text-center mb-4">
        {index + 1} / {cards.length}
      </Text>
      <GestureDetector gesture={pan}>
        <Animated.View style={swipeStyle}>
          <Pressable onPress={() => { flipped.value = withTiming(flipped.value ? 0 : 1); }}>
            <View className="relative min-h-[280px]">
              <Animated.View style={frontStyle}>
                <Card className="min-h-[280px] justify-center">
                  <Text className="text-white text-xl font-semibold text-center">{card.front}</Text>
                  <Text className="text-white/40 text-center mt-4 text-sm">Tap to flip</Text>
                </Card>
              </Animated.View>
              <Animated.View style={backStyle}>
                <Card className="min-h-[280px] justify-center">
                  <Text className="text-white text-base text-center leading-6">{card.back}</Text>
                </Card>
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
      <View className="flex-row justify-between mt-6">
        <Pressable onPress={() => nextCard("review")} className="px-4 py-3 rounded-2xl bg-orange-500/20">
          <Text className="text-orange-300">Review again</Text>
        </Pressable>
        <Pressable onPress={() => nextCard("got")} className="px-4 py-3 rounded-2xl bg-success/20">
          <Text className="text-success">Got it!</Text>
        </Pressable>
      </View>
    </View>
  );
}
