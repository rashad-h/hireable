import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Roadmap } from "@/types";

interface AppState {
  sessionId: string | null;
  roadmapId: string | null;
  targetRole: string | null;
  xp: number;
  level: number;
  roadmap: Roadmap | null;
  lastXpEarned: number;
  showXpPopup: boolean;
  levelUp: boolean;
  _hasHydrated: boolean;
  setSession: (sessionId: string, roadmapId?: string | null, targetRole?: string | null) => void;
  setRoadmap: (roadmap: Roadmap | null) => void;
  setProgress: (xp: number, level: number) => void;
  triggerXpPopup: (amount: number, levelUp?: boolean) => void;
  clearXpPopup: () => void;
  setHasHydrated: (value: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessionId: null,
      roadmapId: null,
      targetRole: null,
      xp: 0,
      level: 1,
      roadmap: null,
      lastXpEarned: 0,
      showXpPopup: false,
      levelUp: false,
      _hasHydrated: false,
      setSession: (sessionId, roadmapId = null, targetRole = null) =>
        set((state) => ({
          sessionId,
          roadmapId,
          targetRole: targetRole ?? state.targetRole,
        })),
      setRoadmap: (roadmap) =>
        set({
          roadmap,
          roadmapId: roadmap?.id ?? null,
          targetRole: roadmap?.target_role ?? null,
        }),
      setProgress: (xp, level) => set({ xp, level }),
      triggerXpPopup: (amount, levelUp = false) =>
        set({ lastXpEarned: amount, showXpPopup: true, levelUp }),
      clearXpPopup: () => set({ showXpPopup: false, levelUp: false }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      reset: () =>
        set({
          sessionId: null,
          roadmapId: null,
          targetRole: null,
          xp: 0,
          level: 1,
          roadmap: null,
          lastXpEarned: 0,
          showXpPopup: false,
          levelUp: false,
        }),
    }),
    {
      name: "hireable-app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        roadmapId: state.roadmapId,
        targetRole: state.targetRole,
        xp: state.xp,
        level: state.level,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useStoreHydrated() {
  return useAppStore((s) => s._hasHydrated);
}
