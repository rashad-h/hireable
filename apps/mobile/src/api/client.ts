import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export type UploadFile = {
  uri: string;
  name: string;
  mimeType?: string;
  file?: File;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function uploadCV(file: UploadFile, jobTitle: string) {
  const formData = new FormData();
  const mimeType = file.mimeType || "application/pdf";

  if (Platform.OS === "web") {
    const webFile =
      file.file ??
      new File([await (await fetch(file.uri)).blob()], file.name, { type: mimeType });
    formData.append("file", webFile);
  } else {
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: mimeType,
    } as unknown as Blob);
  }

  formData.append("job_title", jobTitle);

  return request<import("@/types").UploadResponse>("/api/cv/upload", {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
  });
}

export function getCVStatus(sessionId: string) {
  return request<import("@/types").StatusResponse>(`/api/cv/${sessionId}/status`);
}

export function getCVAnalysis(sessionId: string) {
  return request<import("@/types").AnalysisReport>(`/api/cv/${sessionId}/analysis`);
}

export function acknowledgeAnalysis(sessionId: string, claimedSkills: string[]) {
  return request<import("@/types").StatusResponse>(`/api/cv/${sessionId}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ claimed_skills: claimedSkills }),
  });
}

export function getRoadmap(roadmapId: string, sessionId?: string) {
  const query = sessionId ? `?session_id=${sessionId}` : "";
  return request<import("@/types").Roadmap>(`/api/roadmap/${roadmapId}${query}`);
}

export function getRoadmapSummary(roadmapId: string, sessionId: string) {
  return request<import("@/types").RoadmapSummary>(
    `/api/roadmap/${roadmapId}/summary?session_id=${sessionId}`,
  );
}

export function getLesson(lessonId: string, sessionId?: string) {
  const query = sessionId ? `?session_id=${sessionId}` : "";
  return request<import("@/types").Lesson>(`/api/lessons/${lessonId}${query}`);
}

export function generateLessonContent(lessonId: string, contentType: "flashcards" | "quiz" | "resources" | "learn") {
  return request<{
    learn_content?: import("@/types").LearnContent;
    flashcards?: import("@/types").FlashcardItem[];
    quiz?: import("@/types").QuizItem[];
    resources?: import("@/types").ResourceItem[];
  }>(
    `/api/lessons/${lessonId}/generate-content`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType }),
    },
  );
}

export function completeLesson(lessonId: string, sessionId: string, quizScore?: number) {
  return request<import("@/types").CompleteLessonResponse>(
    `/api/lessons/${lessonId}/complete?session_id=${sessionId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz_score: quizScore ?? null }),
    },
  );
}

export function getProgress(sessionId: string) {
  return request<import("@/types").ProgressResponse>(`/api/progress/${sessionId}`);
}
