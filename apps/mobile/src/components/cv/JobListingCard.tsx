import { Linking, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import type { TargetJobListing } from "@/types";

interface JobListingCardProps {
  job: TargetJobListing;
}

export function JobListingCard({ job }: JobListingCardProps) {
  const openLink = () => {
    if (job.url?.startsWith("http")) {
      Linking.openURL(job.url);
    }
  };

  return (
    <Card className="mb-3">
      <Text className="text-white font-bold text-base leading-5">{job.title}</Text>
      <Text className="text-accent text-sm mt-1">
        {job.company}
        {job.location ? ` · ${job.location}` : ""}
      </Text>
      {job.salary_range ? (
        <Text className="text-white/50 text-xs mt-1">{job.salary_range}</Text>
      ) : null}

      {job.why_ready ? (
        <Text className="text-white/70 text-sm mt-3 leading-5">{job.why_ready}</Text>
      ) : null}

      {job.training_focus.length > 0 && (
        <View className="mt-3">
          <Text className="text-white/45 text-xs mb-1.5">Roadmap will prepare you for:</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {job.training_focus.map((skill) => (
              <View key={skill} className="bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-lg">
                <Text className="text-primary text-[11px] font-medium">{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {job.key_requirements.length > 0 && (
        <View className="mt-2">
          <Text className="text-white/45 text-xs mb-1">Key requirements:</Text>
          <Text className="text-white/55 text-xs leading-4">{job.key_requirements.join(" · ")}</Text>
        </View>
      )}

      {job.url?.startsWith("http") && (
        <Pressable onPress={openLink} className="mt-3 bg-accent/15 border border-accent/40 rounded-xl py-2.5 items-center">
          <Text className="text-accent font-semibold text-sm">View listing →</Text>
        </Pressable>
      )}
    </Card>
  );
}
