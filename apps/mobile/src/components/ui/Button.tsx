import { Pressable, Text, type PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ title, variant = "primary", disabled, className, ...props }: ButtonProps & { className?: string }) {
  const base = "rounded-2xl px-6 py-4 items-center justify-center";
  const variants = {
    primary: "bg-primary",
    secondary: "bg-white/10 border border-white/20",
    ghost: "bg-transparent",
  };

  return (
    <Pressable
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? "opacity-50" : ""} ${className || ""}`}
      {...props}
    >
      <Text className="text-white font-semibold text-base">{title}</Text>
    </Pressable>
  );
}
