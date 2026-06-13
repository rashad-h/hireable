import type { Lesson, Roadmap, SkillTreeBranch } from "@/types";

export interface LessonJumpTarget {
  topicId: string;
  lessonId: string;
  lessonTitle: string;
}

function skillMatchesText(skill: string, text: string): boolean {
  const skillLower = skill.toLowerCase().trim();
  const textLower = text.toLowerCase();
  if (!skillLower || !textLower) return false;
  if (textLower.includes(skillLower)) return true;

  const words = skillLower.split(/\W+/).filter((w) => w.length > 1);
  if (words.length >= 2) {
    const acronym = words.map((w) => w[0]).join("");
    if (acronym.length >= 2 && new RegExp(`\\b${acronym}\\b`).test(textLower)) return true;
  }

  return words.some((word) => word.length >= 4 && new RegExp(`\\b${word}\\b`).test(textLower));
}

function lessonContext(
  topicTitle: string,
  topicDescription: string,
  subtopicTitle: string,
  lessonTitle: string,
  lessonDescription: string,
): string {
  return [topicTitle, topicDescription, subtopicTitle, lessonTitle, lessonDescription].join(" ");
}

function relatedLessonIds(skill: string, roadmap: Roadmap): string[] {
  const ids: string[] = [];
  for (const topic of roadmap.topics) {
    for (const subtopic of topic.subtopics) {
      for (const lesson of subtopic.lessons) {
        const context = lessonContext(
          topic.title,
          topic.description ?? "",
          subtopic.title,
          lesson.title,
          lesson.description ?? "",
        );
        if (skillMatchesText(skill, context)) ids.push(lesson.id);
      }
    }
  }
  return ids;
}

export function findJumpToLesson(skill: string, roadmap: Roadmap): LessonJumpTarget | null {
  const candidates: { topicId: string; lesson: Lesson; order: number }[] = [];
  let order = 0;

  for (const topic of roadmap.topics) {
    for (const subtopic of topic.subtopics) {
      for (const lesson of subtopic.lessons) {
        const context = lessonContext(
          topic.title,
          topic.description ?? "",
          subtopic.title,
          lesson.title,
          lesson.description ?? "",
        );
        if (skillMatchesText(skill, context)) {
          candidates.push({ topicId: topic.id, lesson, order: order++ });
        }
      }
    }
  }

  if (!candidates.length) return null;

  const pick = (c: { topicId: string; lesson: Lesson }) => ({
    topicId: c.topicId,
    lessonId: c.lesson.id,
    lessonTitle: c.lesson.title,
  });

  const nextAvailable = candidates.find((c) => !c.lesson.completed && !c.lesson.is_locked);
  if (nextAvailable) return pick(nextAvailable);

  const nextIncomplete = candidates.find((c) => !c.lesson.completed);
  if (nextIncomplete) return pick(nextIncomplete);

  return null;
}

function applyToNode(node: SkillTreeBranch, roadmap: Roadmap, completed: Set<string>): SkillTreeBranch {
  if (node.status && node.children.length === 0) {
    const related = relatedLessonIds(node.name, roadmap);
    if (related.length) {
      const done = related.filter((id) => completed.has(id)).length;
      if (done === related.length) return { ...node, status: "known" };
      if (done > 0 && (node.status === "missing" || node.status === "unverified" || node.status === "partial")) {
        return { ...node, status: "partial" };
      }
    }
    return node;
  }

  return {
    ...node,
    children: node.children.map((child) => applyToNode(child, roadmap, completed)),
  };
}

export function applyLessonProgressToTree(
  tree: SkillTreeBranch | null | undefined,
  roadmap: Roadmap | null | undefined,
): SkillTreeBranch | null | undefined {
  if (!tree || !roadmap) return tree;

  const completed = new Set<string>();
  for (const topic of roadmap.topics) {
    for (const subtopic of topic.subtopics) {
      for (const lesson of subtopic.lessons) {
        if (lesson.completed) completed.add(lesson.id);
      }
    }
  }

  return applyToNode(tree, roadmap, completed);
}
