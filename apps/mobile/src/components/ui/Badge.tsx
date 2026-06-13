import { Text, View } from "react-native";

interface BadgeProps {
  label: string;
  tone?: "primary" | "success" | "accent";
}

export function Badge({ label, tone = "primary" }: BadgeProps) {
  const bg = {
    primary: "bg-primary/20",
    success: "bg-success/20",
    accent: "bg-accent/20",
  }[tone];
  const text = {
    primary: "text-primary",
    success: "text-success",
    accent: "text-accent",
  }[tone];

  return (
    <View className={`px-3 py-1 rounded-full ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}
