'use client';

import { Store, useStore } from '@/store/store';
import { useEffect } from 'react';

export type StoreProviderProps = {
  children: React.ReactNode;
  state: Partial<Store>;
};

export const StoreProvider = ({ children, state }: StoreProviderProps) => {
  const { setState } = useStore();

  useEffect(() => {
    setState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return children;
};
