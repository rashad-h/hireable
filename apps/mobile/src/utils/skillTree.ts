import type { SkillTreeBranch, SkillTreeStatus } from "@/types";

/** @deprecated flat category format from older analyses */
interface LegacySkillTreeCategory {
  name: string;
  icon?: string;
  nodes: { name: string; status: SkillTreeStatus; category?: string }[];
}

export function normalizeSkillTree(
  tree: SkillTreeBranch | LegacySkillTreeCategory[] | null | undefined,
  targetRole: string,
): SkillTreeBranch {
  if (!tree) {
    return { name: targetRole, icon: "🎯", children: [] };
  }
  if (!Array.isArray(tree)) {
    return tree;
  }
  return {
    name: targetRole,
    icon: "🎯",
    children: tree.map((cat) => ({
      name: cat.name,
      icon: cat.icon ?? "📁",
      children: cat.nodes.map((n) => ({
        name: n.name,
        status: n.status,
        children: [],
      })),
    })),
  };
}

export function countSkillStatuses(node: SkillTreeBranch): Record<SkillTreeStatus, number> {
  const counts: Record<SkillTreeStatus, number> = {
    known: 0,
    partial: 0,
    missing: 0,
    unverified: 0,
  };

  function walk(n: SkillTreeBranch) {
    if (n.status) counts[n.status] += 1;
    n.children.forEach(walk);
  }
  walk(node);
  return counts;
}

export function branchCoverage(node: SkillTreeBranch): { have: number; total: number } {
  let have = 0;
  let total = 0;

  function walk(n: SkillTreeBranch) {
    if (n.status) {
      total += 1;
      if (n.status === "known" || n.status === "partial") have += 1;
    }
    n.children.forEach(walk);
  }
  walk(node);
  return { have, total };
}

export function isLeaf(node: SkillTreeBranch): boolean {
  return node.children.length === 0;
}
