import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import type { UploadFile } from "@/api/client";

interface UploadCardProps {
  fileName?: string | null;
  onPick: (file: UploadFile) => void;
}

export function UploadCard({ fileName, onPick }: UploadCardProps) {
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onPick({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? undefined,
        file: asset.file,
      });
    }
  };

  return (
    <Pressable onPress={pickFile} className="rounded-3xl border-2 border-dashed border-primary/60 p-8 items-center bg-primary/5">
      <Text className="text-5xl mb-4">{fileName ? "📄" : "📁"}</Text>
      <Text className="text-white text-lg font-semibold mb-2">
        {fileName ? fileName : "Tap to upload your CV"}
      </Text>
      <Text className="text-white/60 text-sm">PDF files only</Text>
    </Pressable>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <View className={`bg-white/10 rounded-2xl animate-pulse ${className || "h-24"}`} />;
}
