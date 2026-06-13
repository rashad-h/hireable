import { View, type ViewProps } from "react-native";

export function Card({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={`rounded-3xl bg-white/5 border border-white/10 p-4 ${className || ""}`} {...props}>
      {children}
    </View>
  );
}
