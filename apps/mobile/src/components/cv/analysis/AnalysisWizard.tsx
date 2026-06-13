import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HirabilityRing, SkillTreeDiagram } from "@/components/cv/SkillTreeDiagram";
import { JobListingCard } from "@/components/cv/JobListingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AnalysisReport } from "@/types";

export type AnalysisStepId =
  | "welcome"
  | "ideal"
  | "hirability"
  | "strengths"
  | "gaps"
  | "hidden"
  | "claim"
  | "tree"
  | "jobs"
  | "confirm";

const STEP_META: Record<AnalysisStepId, { title: string; cta: string }> = {
  welcome: { title: "Your Analysis", cta: "Let's begin →" },
  ideal: { title: "The Ideal Candidate", cta: "I understand →" },
  hirability: { title: "Your Hirability", cta: "Next →" },
  strengths: { title: "Your Strengths", cta: "Next →" },
  gaps: { title: "Your Gaps", cta: "I understand →" },
  hidden: { title: "Hidden Gaps", cta: "I understand →" },
  claim: { title: "Quick Check", cta: "Continue →" },
  tree: { title: "Skill Map", cta: "Next →" },
  jobs: { title: "Jobs You'll Target", cta: "Next →" },
  confirm: { title: "Ready?", cta: "I understand — Build My Roadmap →" },
};

export function buildSteps(report: AnalysisReport): AnalysisStepId[] {
  const { gap_analysis: gap } = report;
  const steps: AnalysisStepId[] = ["welcome", "ideal", "hirability", "strengths", "gaps"];
  if (gap.hidden_weaknesses.length > 0) steps.push("hidden");
  if (gap.skills_to_claim.length > 0) steps.push("claim");
  steps.push("tree");
  if ((gap.target_jobs ?? []).length > 0) steps.push("jobs");
  steps.push("confirm");
  return steps;
}

function StepProgress({ steps, currentIndex }: { steps: AnalysisStepId[]; currentIndex: number }) {
  return (
    <View className="mb-6">
      <Text className="text-white/40 text-xs text-center mb-3">
        Step {currentIndex + 1} of {steps.length}
      </Text>
      <View className="flex-row gap-1.5 justify-center px-2">
        {steps.map((step, i) => (
          <View
            key={step}
            className={`h-1.5 rounded-full flex-1 max-w-10 ${
              i <= currentIndex ? "bg-accent" : "bg-white/10"
            }`}
          />
        ))}
      </View>
    </View>
  );
}

function SkillRow({ skill, detail, tone }: { skill: string; detail: string; tone: "success" | "error" }) {
  const icon = tone === "success" ? "✓" : "✗";
  const color = tone === "success" ? "text-success" : "text-error";
  const bg = tone === "success" ? "bg-success/8 border-success/25" : "bg-error/8 border-error/25";
  return (
    <View className={`mb-3 rounded-2xl p-3 border ${bg}`}>
      <Text className={`font-bold ${color}`}>
        {icon} {skill}
      </Text>
      <Text className="text-white/65 text-sm mt-1 leading-5">{detail}</Text>
    </View>
  );
}

interface AnalysisWizardProps {
  report: AnalysisReport;
  claimed: Set<string>;
  onToggleClaim: (skill: string) => void;
  onFinish: () => void;
  submitting: boolean;
}

export function AnalysisWizard({ report, claimed, onToggleClaim, onFinish, submitting }: AnalysisWizardProps) {
  const steps = buildSteps(report);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const { gap_analysis: gap } = report;
  const hirability = gap.hirability_score || gap.gap_score;
  const meta = STEP_META[step];
  const isLast = stepIndex === steps.length - 1;

  const goNext = () => {
    if (isLast) onFinish();
    else setStepIndex((i) => i + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        <StepProgress steps={steps} currentIndex={stepIndex} />

        <Text className="text-white/45 text-xs uppercase tracking-widest mb-1">{meta.title}</Text>

        <ScrollView className="flex-1" contentContainerClassName="pb-4" showsVerticalScrollIndicator={false}>
          {step === "welcome" && (
            <View>
              <Text className="text-white text-3xl font-bold mb-3 leading-tight">
                Hi {report.candidate_name.split(" ")[0] || "there"} 👋
              </Text>
              <Text className="text-white/70 text-lg leading-7 mb-6">
                We've analyzed your CV against real <Text className="text-accent font-semibold">{report.target_role}</Text>{" "}
                job postings. Let's walk through what we found — step by step.
              </Text>
              <Card>
                <Text className="text-white/50 text-sm mb-1">Your target role</Text>
                <Text className="text-white text-xl font-bold">{report.target_role}</Text>
                <Text className="text-white/50 text-sm mt-3 mb-1">Skills on your CV</Text>
                <Text className="text-white/80">{report.cv_data.skills.join(", ") || "None listed explicitly"}</Text>
              </Card>
            </View>
          )}

          {step === "ideal" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-3">What a perfect hire looks like</Text>
              <Text className="text-white/65 leading-6 mb-5">{gap.ideal_candidate_summary}</Text>
              <Text className="text-white/50 text-sm mb-3">Key skills employers expect:</Text>
              <View className="flex-row flex-wrap gap-2">
                {gap.ideal_skills.map((skill) => (
                  <View key={skill} className="bg-white/8 border border-white/15 px-3 py-2 rounded-xl">
                    <Text className="text-white/80 text-sm">{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {step === "hirability" && (
            <View className="items-center">
              <Text className="text-white text-2xl font-bold mb-2 text-center self-stretch">
                Can you get hired as a {report.target_role}?
              </Text>
              <Text className="text-white/55 text-center mb-6 self-stretch leading-5">
                Based on your CV vs. current market requirements
              </Text>
              <HirabilityRing score={hirability} size={160} />
              <Card className="mt-6 self-stretch">
                <Text className="text-white/80 leading-6 text-center">{gap.goal_assessment}</Text>
              </Card>
              <View className="flex-row gap-3 mt-4 self-stretch">
                <View className="flex-1 bg-white/5 rounded-2xl p-3 items-center">
                  <Text className="text-white text-xl font-bold">{gap.gap_score}%</Text>
                  <Text className="text-white/45 text-xs">Skill fit</Text>
                </View>
                <View className="flex-1 bg-white/5 rounded-2xl p-3 items-center">
                  <Text className="text-white text-xl font-bold">{gap.skills_missing.length}</Text>
                  <Text className="text-white/45 text-xs">Gaps found</Text>
                </View>
              </View>
            </View>
          )}

          {step === "strengths" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-2">What's working for you</Text>
              <Text className="text-white/55 mb-5 leading-5">
                These are skills we found on your CV that match what employers want.
              </Text>
              {gap.strengths.length ? (
                gap.strengths.map((s) => <SkillRow key={s.skill} skill={s.skill} detail={s.detail} tone="success" />)
              ) : (
                gap.skills_present.map((skill) => (
                  <SkillRow
                    key={skill}
                    skill={skill}
                    detail="Listed on your CV and relevant to this role."
                    tone="success"
                  />
                ))
              )}
            </View>
          )}

          {step === "gaps" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-2">Where you need to grow</Text>
              <Text className="text-white/55 mb-5 leading-5">
                These gaps are why your hirability score isn't higher — and what your roadmap will target.
              </Text>
              {gap.weaknesses.length ? (
                gap.weaknesses.map((s) => <SkillRow key={s.skill} skill={s.skill} detail={s.detail} tone="error" />)
              ) : (
                gap.skills_missing.map((skill) => (
                  <SkillRow
                    key={skill}
                    skill={skill}
                    detail="Required for this role but not demonstrated on your CV."
                    tone="error"
                  />
                ))
              )}
            </View>
          )}

          {step === "hidden" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-2">Gaps you didn't mention</Text>
              <Text className="text-white/55 mb-5 leading-5">
                People who lack a skill often leave it off their CV. These appear in job descriptions but aren't on yours.
              </Text>
              {gap.hidden_weaknesses.map((item) => (
                <View key={item.skill} className="mb-3 bg-error/10 rounded-2xl p-4 border border-error/30">
                  <Text className="text-error font-bold text-base">{item.skill}</Text>
                  <Text className="text-white/65 text-sm mt-2 leading-5">{item.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {step === "claim" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-2">Do you have any of these?</Text>
              <Text className="text-white/55 mb-5 leading-5">
                You might have these skills but didn't list them. Tap yes if you do — they won't go on your learning plan.
              </Text>
              {gap.skills_to_claim.map((item) => {
                const selected = claimed.has(item.skill);
                return (
                  <Pressable
                    key={item.skill}
                    onPress={() => onToggleClaim(item.skill)}
                    className={`mb-3 rounded-2xl p-4 border-2 ${
                      selected ? "bg-success/12 border-success" : "bg-white/5 border-white/10"
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className={`font-bold text-base ${selected ? "text-success" : "text-white"}`}>
                        {item.skill}
                      </Text>
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center ${
                          selected ? "bg-success" : "bg-white/10"
                        }`}
                      >
                        <Text className="text-white font-bold">{selected ? "✓" : ""}</Text>
                      </View>
                    </View>
                    <Text className="text-white/60 text-sm leading-5">{item.prompt}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === "tree" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-2">Your skill map</Text>
              <Text className="text-white/55 mb-4 leading-5">
                A breakdown of everything this role requires — what you have vs. what you need.
              </Text>
              <SkillTreeDiagram targetRole={report.target_role} tree={gap.skill_tree} />
            </View>
          )}

          {step === "jobs" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-2">Jobs you'll be ready for</Text>
              <Text className="text-white/55 mb-5 leading-5">
                After completing your roadmap, these are real {report.target_role} listings you could apply to.
              </Text>
              {(gap.target_jobs ?? []).map((job, i) => (
                <JobListingCard key={`${job.company}-${job.title}-${i}`} job={job} />
              ))}
            </View>
          )}

          {step === "confirm" && (
            <View>
              <Text className="text-white text-2xl font-bold mb-3">You're all set</Text>
              <Text className="text-white/65 leading-6 mb-6">
                We'll build a personalized roadmap focused on your {gap.skills_missing.length || gap.weaknesses.length}{" "}
                skill gaps — starting from where you are today.
              </Text>
              <Card>
                <Text className="text-white/50 text-sm mb-2">Summary</Text>
                <Text className="text-white/80 leading-6">
                  Hirability: {hirability}% · {gap.strengths.length || gap.skills_present.length} strengths ·{" "}
                  {gap.weaknesses.length || gap.skills_missing.length} gaps to close
                  {(gap.target_jobs ?? []).length > 0 ? ` · ${(gap.target_jobs ?? []).length} target jobs` : ""}
                </Text>
              </Card>
            </View>
          )}
        </ScrollView>

        <View className="pt-3 pb-2 gap-2">
          {stepIndex > 0 && (
            <Button title="← Back" variant="ghost" onPress={() => setStepIndex((i) => i - 1)} disabled={submitting} />
          )}
          <Button
            title={submitting ? "Starting roadmap..." : meta.cta}
            onPress={goNext}
            disabled={submitting}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
