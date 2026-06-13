import { Platform, Text, useWindowDimensions, View, type ViewProps } from "react-native";

const PHONE_ASPECT = 390 / 844;

export function WebMobileFrame({ children }: ViewProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  const maxHeight = windowHeight * 0.96;
  const maxWidth = Math.min(windowWidth * 0.92, 520);

  let phoneHeight = maxHeight;
  let phoneWidth = phoneHeight * PHONE_ASPECT;

  if (phoneWidth > maxWidth) {
    phoneWidth = maxWidth;
    phoneHeight = phoneWidth / PHONE_ASPECT;
  }

  const borderRadius = Math.round(phoneWidth * 0.12);
  const notchWidth = Math.round(phoneWidth * 0.28);
  const notchHeight = Math.round(phoneWidth * 0.07);
  const notchTop = Math.round(phoneWidth * 0.025);
  const contentTopInset = notchTop + notchHeight + 12;

  return (
    <View className="flex-1 min-h-screen w-full items-center justify-center bg-[#050508] py-3 px-3">
      <View
        className="absolute rounded-full bg-primary opacity-10"
        style={{ width: phoneWidth * 1.1, height: phoneWidth * 1.1, top: "12%", left: "38%" }}
      />
      <View
        className="absolute rounded-full bg-accent opacity-[0.08]"
        style={{ width: phoneWidth * 0.85, height: phoneWidth * 0.85, top: "30%", left: "52%" }}
      />

      <Text className="text-white/35 text-xs tracking-[3px] uppercase mb-3 font-semibold">
        Hireable • Mobile Demo
      </Text>

      <View
        className="relative overflow-hidden bg-background border-[#22222f]"
        style={{
          width: phoneWidth,
          height: phoneHeight,
          borderRadius,
          borderWidth: Math.max(5, Math.round(phoneWidth * 0.015)),
          shadowColor: "#6C63FF",
          shadowOffset: { width: 0, height: 24 },
          shadowOpacity: 0.35,
          shadowRadius: 48,
        }}
      >
        <View
          className="absolute z-[100] bg-black"
          style={{
            top: notchTop,
            left: "50%",
            marginLeft: -notchWidth / 2,
            width: notchWidth,
            height: notchHeight,
            borderRadius: notchHeight,
          }}
        />
        <View className="flex-1 w-full h-full" style={{ paddingTop: contentTopInset }}>
          {children}
        </View>
        <View
          className="absolute z-[100] bg-white/20 rounded-full"
          style={{
            bottom: Math.round(phoneWidth * 0.02),
            left: "50%",
            marginLeft: -(phoneWidth * 0.16),
            width: phoneWidth * 0.32,
            height: 5,
          }}
        />
      </View>
    </View>
  );
}
