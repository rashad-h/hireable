import type { ImageSourcePropType } from "react-native";

export const MASCOT_STAGES = [
  {
    stage: 1,
    label: "Curious Kitten",
    source: require("../../assets/mascots/mascot-kitten.png") as ImageSourcePropType,
  },
  {
    stage: 2,
    label: "Eager Intern",
    source: require("../../assets/mascots/mascot-young.png") as ImageSourcePropType,
  },
  {
    stage: 3,
    label: "Finance Pro",
    source: require("../../assets/mascots/mascot-professional.png") as ImageSourcePropType,
  },
  {
    stage: 4,
    label: "Corner Office",
    source: require("../../assets/mascots/mascot-executive.png") as ImageSourcePropType,
  },
] as const;

export const MAX_MASCOT_STAGE = MASCOT_STAGES.length;

export function mascotStageForLevel(level: number): number {
  return Math.min(Math.max(level, 1), MAX_MASCOT_STAGE);
}

export function mascotForStage(stage: number) {
  const index = mascotStageForLevel(stage) - 1;
  return MASCOT_STAGES[index];
}

export function topicFunFactFallback(topicTitle: string): string {
  return `*purrs* Mrow? Even senior devs still Google ${topicTitle} basics. Our little secret.`;
}
