import { useEffect, useRef, type ReactNode } from "react";
import { Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SPRING = { damping: 22, stiffness: 220, mass: 0.8 };
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

interface CollapsibleBodyProps {
  expanded: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleBody({ expanded, children, className }: CollapsibleBodyProps) {
  const contentHeight = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(expanded ? 1 : 0);
  const translateY = useSharedValue(expanded ? 0 : -8);
  const mounted = useRef(false);

  useEffect(() => {
    const open = contentHeight.value;
    if (!mounted.current) {
      height.value = expanded ? open : 0;
      opacity.value = expanded ? 1 : 0;
      translateY.value = expanded ? 0 : -8;
      mounted.current = true;
      return;
    }

    if (expanded) {
      height.value = withSpring(open, SPRING);
      opacity.value = withTiming(1, TIMING);
      translateY.value = withSpring(0, SPRING);
    } else {
      opacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(-6, { duration: 180, easing: Easing.out(Easing.quad) });
      height.value = withTiming(0, TIMING);
    }
  }, [expanded, contentHeight, height, opacity, translateY]);

  const containerStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden" as const,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={containerStyle} className={className}>
      <Animated.View
        style={innerStyle}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          if (nextHeight <= 0 || Math.abs(nextHeight - contentHeight.value) < 1) return;
          contentHeight.value = nextHeight;
          if (expanded) {
            height.value = mounted.current ? withSpring(nextHeight, SPRING) : nextHeight;
          }
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

interface CollapseChevronProps {
  expanded: boolean;
  className?: string;
}

export function CollapseChevron({ expanded, className }: CollapseChevronProps) {
  const rotation = useSharedValue(expanded ? 0 : -90);

  useEffect(() => {
    rotation.value = withSpring(expanded ? 0 : -90, { damping: 18, stiffness: 180 });
  }, [expanded, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={style} className={className}>
      <Text className="text-white/45 text-xs">▾</Text>
    </Animated.View>
  );
}
