import { create } from "zustand";
import type { Activity } from "./desktop-side-panel";

type DesktopUiState = {
  activity: Activity;
  drawerOpen: boolean;
  paletteOpen: boolean;
  terminalOpen: boolean;
  updateOpen: boolean;
  setActivity: (activity: Activity) => void;
  setDrawerOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  setUpdateOpen: (open: boolean) => void;
  togglePalette: () => void;
  toggleTerminal: () => void;
};

export const useDesktopUiStore = create<DesktopUiState>((set) => ({
  activity: "overview",
  drawerOpen: false,
  paletteOpen: false,
  terminalOpen: false,
  updateOpen: false,
  setActivity: (activity) => set({ activity }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),
  setUpdateOpen: (updateOpen) => set({ updateOpen }),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen }))
}));
