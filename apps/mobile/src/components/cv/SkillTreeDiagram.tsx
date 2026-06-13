import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import type { Roadmap, SkillTreeBranch, SkillTreeStatus } from "@/types";
import { branchCoverage, countSkillStatuses, isLeaf, normalizeSkillTree } from "@/utils/skillTree";
import { findJumpToLesson, type LessonJumpTarget } from "@/utils/skillTreeProgress";

const STATUS = {
  known: {
    bg: "#00C896",
    border: "#00C896",
    text: "#FFFFFF",
    icon: "✓",
    label: "Have",
  },
  partial: {
    bg: "rgba(0,210,255,0.2)",
    border: "#00D2FF",
    text: "#00D2FF",
    icon: "◐",
    label: "Partial",
  },
  missing: {
    bg: "rgba(255,77,109,0.25)",
    border: "#FF4D6D",
    text: "#FF9AAD",
    icon: "✗",
    label: "Gap",
  },
  unverified: {
    bg: "rgba(108,99,255,0.2)",
    border: "#6C63FF",
    text: "#C4BEFF",
    icon: "?",
    label: "Not on CV",
  },
} as const;

function Legend({ compact }: { compact?: boolean }) {
  return (
    <View className={`flex-row flex-wrap gap-x-3 gap-y-1.5 ${compact ? "mb-2" : "mb-3"}`}>
      {(Object.keys(STATUS) as SkillTreeStatus[]).map((key) => (
        <View key={key} className="flex-row items-center gap-1">
          <View
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: STATUS[key].bg, borderWidth: 1, borderColor: STATUS[key].border }}
          />
          <Text className="text-white/50 text-[10px]">{STATUS[key].label}</Text>
        </View>
      ))}
    </View>
  );
}

function LeafChip({
  node,
  compact,
  jumpTarget,
}: {
  node: SkillTreeBranch;
  compact?: boolean;
  jumpTarget?: LessonJumpTarget | null;
}) {
  const status = node.status ?? "missing";
  const style = STATUS[status];
  const isComplete = status === "known";
  const canJump = Boolean(jumpTarget && !isComplete);

  const chip = (
    <View
      className={`rounded-lg flex-row items-center gap-1 ${compact ? "px-2 py-1" : "px-2.5 py-1.5"} ${
        canJump ? "pr-1.5" : ""
      }`}
      style={{
        backgroundColor: style.bg,
        borderWidth: 1.5,
        borderColor: style.border,
        borderStyle: status === "unverified" ? "dashed" : "solid",
      }}
    >
      <Text style={{ color: style.text, fontSize: compact ? 10 : 11, fontWeight: "800" }}>{style.icon}</Text>
      <Text
        style={{ color: style.text, fontSize: compact ? 11 : 12, fontWeight: "600" }}
        numberOfLines={1}
        className="flex-shrink"
      >
        {node.name}
      </Text>
      {canJump ? (
        <View className="ml-0.5 px-1.5 py-0.5 rounded-md bg-white/10">
          <Text style={{ color: style.text, fontSize: compact ? 9 : 10, fontWeight: "700" }}>Go →</Text>
        </View>
      ) : null}
    </View>
  );

  if (!canJump || !jumpTarget) return chip;

  return (
    <Pressable
      onPress={() => router.push(`/roadmap/${jumpTarget.topicId}/${jumpTarget.lessonId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Jump to lesson: ${jumpTarget.lessonTitle}`}
    >
      {chip}
    </Pressable>
  );
}

function collectLeaves(node: SkillTreeBranch): SkillTreeBranch[] {
  if (isLeaf(node)) return [node];
  return node.children.flatMap(collectLeaves);
}

function defaultExpandedPaths(root: SkillTreeBranch): Set<string> {
  const paths = new Set<string>();
  if (root.children[0]) {
    paths.add(root.children[0].name);
    if (root.children[0].children[0]) {
      paths.add(`${root.children[0].name}/${root.children[0].children[0].name}`);
    }
  }
  return paths;
}

function ExpandableBranch({
  node,
  path,
  depth,
  expanded,
  onToggle,
  compact,
  roadmap,
}: {
  node: SkillTreeBranch;
  path: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  compact?: boolean;
  roadmap?: Roadmap | null;
}) {
  const isOpen = expanded.has(path);
  const coverage = branchCoverage(node);
  const leaves = collectLeaves(node);
  const gapCount = leaves.filter((l) => l.status === "missing").length;

  if (isLeaf(node)) {
    const jumpTarget = roadmap ? findJumpToLesson(node.name, roadmap) : null;
    return (
      <View style={{ paddingLeft: depth * 10 }} className="mb-1">
        <LeafChip node={node} compact={compact} jumpTarget={jumpTarget} />
      </View>
    );
  }

  return (
    <View className="mb-2" style={{ paddingLeft: depth > 0 ? 10 : 0 }}>
      <Pressable
        onPress={() => onToggle(path)}
        className={`flex-row items-center justify-between rounded-2xl border px-3 py-2.5 ${
          depth === 0 ? "bg-primary/15 border-primary/40" : "bg-white/5 border-white/10"
        }`}
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-white/50 text-xs">{isOpen ? "▾" : "▸"}</Text>
          {node.icon ? <Text className="text-sm">{node.icon}</Text> : null}
          <Text className="text-white font-semibold text-sm flex-1" numberOfLines={1}>
            {node.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {coverage.total > 0 && (
            <Text className="text-white/40 text-[11px]">
              {coverage.have}/{coverage.total}
            </Text>
          )}
          {gapCount > 0 && (
            <View className="bg-error/20 px-1.5 py-0.5 rounded-md">
              <Text className="text-error text-[10px] font-bold">{gapCount} gap{gapCount > 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>
      </Pressable>

      {isOpen && (
        <View
          className="mt-1.5 ml-3 border-l-2 pl-2"
          style={{ borderColor: depth === 0 ? "rgba(108,99,255,0.35)" : "rgba(255,255,255,0.1)" }}
        >
          {node.children.map((child) =>
            isLeaf(child) ? (
              <View key={child.name} className="mb-1">
                <LeafChip
                  node={child}
                  compact={compact}
                  jumpTarget={roadmap ? findJumpToLesson(child.name, roadmap) : null}
                />
              </View>
            ) : (
              <ExpandableBranch
                key={`${path}/${child.name}`}
                node={child}
                path={`${path}/${child.name}`}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                compact={compact}
                roadmap={roadmap}
              />
            ),
          )}
        </View>
      )}
    </View>
  );
}

interface SkillTreeDiagramProps {
  targetRole?: string;
  tree: SkillTreeBranch | null | undefined;
  compact?: boolean;
  roadmap?: Roadmap | null;
}

export function SkillTreeDiagram({ targetRole, tree, compact, roadmap }: SkillTreeDiagramProps) {
  const root = useMemo(() => normalizeSkillTree(tree, targetRole ?? "Target Role"), [tree, targetRole]);
  const stats = useMemo(() => countSkillStatuses(root), [root]);
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpandedPaths(root));

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => {
    const paths = new Set<string>();
    function walk(n: SkillTreeBranch, prefix: string) {
      if (!isLeaf(n)) {
        paths.add(prefix || n.name);
        n.children.forEach((c) => walk(c, prefix ? `${prefix}/${c.name}` : c.name));
      }
    }
    root.children.forEach((c) => walk(c, c.name));
    setExpanded(paths);
  };

  const collapseAll = () => setExpanded(new Set());

  if (!root.children.length && !stats.known && !stats.missing) {
    return (
      <View className="rounded-2xl bg-white/5 border border-white/10 p-5 items-center">
        <Text className="text-white/40 text-sm">Skill map loading...</Text>
      </View>
    );
  }

  const totalCoverage = branchCoverage(root);

  return (
    <View className="rounded-2xl bg-[#0D0D14] border border-white/10 p-3">
      <View className="flex-row items-center justify-between mb-2 px-1">
        <View className="flex-row items-center gap-2 flex-1">
          {root.icon ? <Text>{root.icon}</Text> : null}
          <Text className="text-white font-bold text-sm" numberOfLines={1}>
            {root.name}
          </Text>
        </View>
        {totalCoverage.total > 0 && (
          <Text className="text-white/45 text-xs">
            {totalCoverage.have}/{totalCoverage.total} skills
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-1.5 mb-2 px-1">
        {stats.known > 0 && (
          <View className="bg-success/15 px-2 py-0.5 rounded-full">
            <Text className="text-success text-[10px] font-semibold">{stats.known} have</Text>
          </View>
        )}
        {stats.partial > 0 && (
          <View className="bg-accent/15 px-2 py-0.5 rounded-full">
            <Text className="text-accent text-[10px] font-semibold">{stats.partial} partial</Text>
          </View>
        )}
        {stats.missing > 0 && (
          <View className="bg-error/15 px-2 py-0.5 rounded-full">
            <Text className="text-error text-[10px] font-semibold">{stats.missing} gaps</Text>
          </View>
        )}
        {stats.unverified > 0 && (
          <View className="bg-primary/15 px-2 py-0.5 rounded-full">
            <Text className="text-primary text-[10px] font-semibold">{stats.unverified} unlisted</Text>
          </View>
        )}
      </View>

      {!compact && <Legend compact={compact} />}

      {!compact && (
        <View className="flex-row gap-2 mb-2 px-1">
          <Pressable onPress={expandAll} className="px-2 py-1 rounded-lg bg-white/5">
            <Text className="text-white/50 text-[10px]">Expand all</Text>
          </Pressable>
          <Pressable onPress={collapseAll} className="px-2 py-1 rounded-lg bg-white/5">
            <Text className="text-white/50 text-[10px]">Collapse all</Text>
          </Pressable>
        </View>
      )}

      <Text className="text-white/35 text-[10px] px-1 mb-2">
        {roadmap ? "Tap a section to expand · Tap a gap to jump to its lesson" : "Tap a section to expand"}
      </Text>

      {root.children.map((child) => (
        <ExpandableBranch
          key={child.name}
          node={child}
          path={child.name}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          compact={compact}
          roadmap={roadmap}
        />
      ))}
    </View>
  );
}

export function HirabilityRing({ score, size = 140 }: { score: number; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#00C896" : score >= 40 ? "#00D2FF" : "#FF4D6D";
  const label = score >= 70 ? "Strong fit" : score >= 40 ? "Room to grow" : "Big gaps";

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="items-center">
        <Text className="text-white text-4xl font-bold">{score}</Text>
        <Text className="text-white/50 text-xs">Hirability</Text>
        <Text style={{ color, fontSize: 11, fontWeight: "600", marginTop: 2 }}>{label}</Text>
      </View>
    </View>
  );
}
