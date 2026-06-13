import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Text } from "react-native";

interface XPPopupProps {
  amount: number;
  visible: boolean;
  onDone: () => void;
}

export function XPPopup({ amount, visible, onDone }: XPPopupProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    translateY.value = 0;
    opacity.value = 1;
    translateY.value = withSpring(-80);
    opacity.value = withDelay(900, withTiming(0, { duration: 300 }, () => {
      runOnJS(onDone)();
    }));
  }, [visible, amount, onDone, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View className="absolute top-24 self-center z-50" style={style}>
      <Text className="text-success text-2xl font-bold">+{amount} XP</Text>
    </Animated.View>
  );
}
