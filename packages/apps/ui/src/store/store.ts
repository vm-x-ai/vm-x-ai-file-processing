import { FileRead, ProjectRead } from '@/clients/api/types.gen';
import { createStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type Store = {
  project?: ProjectRead;
  file?: FileRead;
};

export type AppActions = {
  setState: (state: Partial<Store>) => void;
};

export type AppStore = Store & AppActions;

const initialState: Store = {};

export const createAppStore = (initState: Store = initialState) =>
  createStore<AppStore>()(
    subscribeWithSelector((set, get) => ({
      ...initState,
      setState: (state: Partial<Store>) => set({ ...get(), ...state }),
    }))
  );
