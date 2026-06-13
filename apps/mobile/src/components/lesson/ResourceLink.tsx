import { Linking, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import type { ResourceItem } from "@/types";

interface ResourceLinkProps {
  resource: ResourceItem;
}

export function ResourceLink({ resource }: ResourceLinkProps) {
  return (
    <Pressable onPress={() => Linking.openURL(resource.url)}>
      <Card className="mb-3">
        <View className="flex-row items-center gap-3">
          <Text className="text-2xl">{resource.type === "youtube" ? "▶️" : "📰"}</Text>
          <View className="flex-1">
            <Text className="text-white font-medium">{resource.title}</Text>
            <Text className="text-white/50 text-xs mt-1" numberOfLines={1}>
              {resource.url}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
