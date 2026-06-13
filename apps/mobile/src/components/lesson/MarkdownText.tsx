import type { ReactNode } from "react";
import { Linking, Text, View } from "react-native";

/** Lightweight markdown-ish renderer for lesson content. */
export function MarkdownText({ content, className }: { content: string; className?: string }) {
  const lines = content.split("\n");

  return (
    <View className={className}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={index} className="h-2" />;
        }

        if (trimmed.startsWith("## ")) {
          return (
            <Text key={index} className="text-white text-lg font-bold mt-3 mb-1">
              {trimmed.slice(3)}
            </Text>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <Text key={index} className="text-white text-xl font-bold mt-3 mb-2">
              {trimmed.slice(2)}
            </Text>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <View key={index} className="flex-row gap-2 mb-1 pl-1">
              <Text className="text-accent">•</Text>
              <Text className="text-white/80 flex-1 leading-6">{renderInline(trimmed.slice(2))}</Text>
            </View>
          );
        }

        return (
          <Text key={index} className="text-white/80 leading-6 mb-1">
            {renderInline(trimmed)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} className="text-white font-bold">
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

export function MarkdownLink({ label, url }: { label: string; url: string }) {
  return (
    <Text className="text-accent underline" onPress={() => Linking.openURL(url)}>
      {label}
    </Text>
  );
}
