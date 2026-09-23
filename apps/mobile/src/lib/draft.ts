import type { Species } from '@canmyeatthis/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The in-progress Home input (docs/07 Phase 3: "draft persistence — the in-progress input
 * survives a backgrounding"). Same zustand + AsyncStorage pattern as `lib/settings.ts`, not the
 * MMKV that docs/02-tech-decisions.md D10 originally specified for drafts — see D20, which
 * records that substitution for both this and `settings.ts` at once rather than adding a second
 * storage engine for one more small piece of state.
 *
 * `photos` holds already-processed (resized, EXIF-stripped) local URIs, not raw camera output —
 * `lib/imagePipeline.ts` runs before a URI ever reaches this store.
 */
export const MAX_PHOTOS = 4;

interface DraftState {
  species: Species;
  description: string;
  photos: string[];
  setSpecies: (species: Species) => void;
  setDescription: (description: string) => void;
  addPhoto: (uri: string) => void;
  removePhoto: (index: number) => void;
  movePhoto: (index: number, direction: -1 | 1) => void;
  reset: () => void;
}

const initialState = { species: 'dog' as Species, description: '', photos: [] as string[] };

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      ...initialState,
      setSpecies: (species) => set({ species }),
      setDescription: (description) => set({ description }),
      addPhoto: (uri) =>
        set((state) =>
          state.photos.length >= MAX_PHOTOS ? state : { photos: [...state.photos, uri] },
        ),
      removePhoto: (index) =>
        set((state) => ({ photos: state.photos.filter((_, i) => i !== index) })),
      movePhoto: (index, direction) =>
        set((state) => {
          const target = index + direction;
          if (target < 0 || target >= state.photos.length) return state;
          const photos = [...state.photos];
          const [moved] = photos.splice(index, 1);
          if (moved === undefined) return state;
          photos.splice(target, 0, moved);
          return { photos };
        }),
      reset: () => set(initialState),
    }),
    {
      name: 'canmyeatthis.draft.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
