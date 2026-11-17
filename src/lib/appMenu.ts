import { createContext, useContext } from 'react';

export type AppMenuContextValue = {
  open: () => void;
  hasBadge: boolean;
};

export const AppMenuContext = createContext<AppMenuContextValue | null>(null);

export function useAppMenu(): AppMenuContextValue | null {
  return useContext(AppMenuContext);
}
