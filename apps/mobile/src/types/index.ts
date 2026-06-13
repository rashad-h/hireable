export interface ExperienceItem {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface CVData {
  name: string;
  email: string;
  skills: string[];
  experience: ExperienceItem[];
  education: { degree: string; institution: string; year: string }[];
  certifications: string[];
}

export interface JobRequirements {
  required_skills: string[];
  nice_to_have: string[];
  tools: string[];
  experience_years: number;
}

export interface TargetJobListing {
  title: string;
  company: string;
  location: string;
  url: string;
  salary_range: string;
  why_ready: string;
  key_requirements: string[];
  training_focus: string[];
}

export interface SkillAssessment {
  skill: string;
  detail: string;
}

export interface HiddenSkillPrompt {
  skill: string;
  reason: string;
  in_job_descriptions: boolean;
}

export interface SkillClaimPrompt {
  skill: string;
  prompt: string;
  related_to: string;
}

export type SkillTreeStatus = "known" | "partial" | "missing" | "unverified";

export interface SkillTreeBranch {
  name: string;
  icon?: string;
  status?: SkillTreeStatus | null;
  children: SkillTreeBranch[];
}

export interface GapAnalysis {
  skills_present: string[];
  skills_missing: string[];
  skills_partial: string[];
  gap_score: number;
  role_fun_fact?: string;
  ideal_candidate_summary: string;
  ideal_skills: string[];
  strengths: SkillAssessment[];
  weaknesses: SkillAssessment[];
  hirability_score: number;
  goal_assessment: string;
  hidden_weaknesses: HiddenSkillPrompt[];
  skills_to_claim: SkillClaimPrompt[];
  skill_tree: SkillTreeBranch | null;
  target_jobs?: TargetJobListing[];
}

export interface AnalysisReport {
  target_role: string;
  candidate_name: string;
  cv_data: CVData;
  job_requirements: JobRequirements;
  gap_analysis: GapAnalysis;
  claimed_skills: string[];
}

export interface ResourceItem {
  type: "youtube" | "article";
  title: string;
  url: string;
}

export interface LearnCheckItem {
  id: string;
  label: string;
}

export interface LearnStep {
  id: string;
  title: string;
  content: string;
  check_items: LearnCheckItem[];
  resource?: ResourceItem | null;
}

export interface LearnContent {
  summary: string;
  steps: LearnStep[];
  resources: ResourceItem[];
}

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  xp_reward: number;
  order_index: number;
  is_locked: boolean;
  prerequisite_lesson_id?: string | null;
  completed: boolean;
  learn_content?: LearnContent | null;
  resources?: ResourceItem[] | null;
  flashcards?: FlashcardItem[] | null;
  quiz?: QuizItem[] | null;
}

export interface Subtopic {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  order_index: number;
  icon: string;
  color: string;
  xp_total: number;
  completed_lessons: number;
  total_lessons: number;
  subtopics: Subtopic[];
}

export interface Roadmap {
  id: string;
  title: string;
  target_role: string;
  gap_score: number;
  role_fun_fact?: string;
  skill_tree?: SkillTreeBranch | null;
  session_id?: string | null;
  topics: Topic[];
}

export interface UploadResponse {
  session_id: string;
  status: string;
}

export interface StatusResponse {
  status: string;
  progress: number;
  message: string;
  roadmap_id?: string | null;
  skill_tree?: SkillTreeBranch | null;
  target_role?: string | null;
}

export interface RoadmapSummary {
  title: string;
  target_role: string;
  gap_score: number;
  total_lessons: number;
  completed_lessons: number;
  xp_earned: number;
  level: number;
}

export interface ProgressResponse {
  xp: number;
  level: number;
  completed_lessons: string[];
  streak: number;
  completion_percentage: number;
}

export interface CompleteLessonResponse {
  xp_earned: number;
  new_level?: number | null;
  total_xp: number;
  level_up: boolean;
}
