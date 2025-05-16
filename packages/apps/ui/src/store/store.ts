import { ProjectRead } from '@/file-classifier-api';
import { create } from 'zustand';

export type Store = {
  project?: ProjectRead;
  setState: (state: Partial<Store>) => void;
};

export const useStore = create<Store>((set, get) => ({
  project: undefined,
  setState: (state: Partial<Store>) => set({ ...get(), ...state }),
}));

