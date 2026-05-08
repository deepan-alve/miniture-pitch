import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import type { ReturnPath, SelfDeclaredGrade } from './use-path-recommendation';

// Lightweight in-memory state for the multi-step return flow. Lives only as
// long as the user is inside `app/return/[id]/*` — wrapped via the group's
// `_layout.tsx`. Doesn't persist to disk; if the user backgrounds the app
// mid-flow, they restart from intro. Acceptable for v1 / demo.

export type CapturedPhoto = {
  prompt: 'front' | 'damage' | 'all_parts';
  uri: string;
};

type ReturnFlowState = {
  ownedUnitId: string | null;
  setOwnedUnitId: (id: string) => void;
  photos: CapturedPhoto[];
  setPhoto: (prompt: CapturedPhoto['prompt'], uri: string | null) => void;
  grade: SelfDeclaredGrade | null;
  setGrade: (g: SelfDeclaredGrade) => void;
  path: ReturnPath | null;
  setPath: (p: ReturnPath) => void;
  pickupSlotIso: string | null;
  setPickupSlotIso: (iso: string) => void;
  reset: () => void;
};

const ReturnFlowContext = createContext<ReturnFlowState | null>(null);

export function ReturnFlowProvider({ children }: { children: ReactNode }) {
  const [ownedUnitId, setOwnedUnitId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [grade, setGrade] = useState<SelfDeclaredGrade | null>(null);
  const [path, setPath] = useState<ReturnPath | null>(null);
  const [pickupSlotIso, setPickupSlotIso] = useState<string | null>(null);

  const value = useMemo<ReturnFlowState>(
    () => ({
      ownedUnitId,
      setOwnedUnitId,
      photos,
      setPhoto: (prompt, uri) => {
        setPhotos((prev) => {
          const without = prev.filter((p) => p.prompt !== prompt);
          return uri ? [...without, { prompt, uri }] : without;
        });
      },
      grade,
      setGrade,
      path,
      setPath,
      pickupSlotIso,
      setPickupSlotIso,
      reset: () => {
        setOwnedUnitId(null);
        setPhotos([]);
        setGrade(null);
        setPath(null);
        setPickupSlotIso(null);
      },
    }),
    [ownedUnitId, photos, grade, path, pickupSlotIso],
  );

  return <ReturnFlowContext.Provider value={value}>{children}</ReturnFlowContext.Provider>;
}

export function useReturnFlow(): ReturnFlowState {
  const ctx = useContext(ReturnFlowContext);
  if (!ctx) {
    throw new Error('useReturnFlow must be used inside <ReturnFlowProvider>');
  }
  return ctx;
}
