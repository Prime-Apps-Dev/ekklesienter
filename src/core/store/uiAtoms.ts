import { atom } from 'jotai';
import { AppMode } from '../types';

// App state
export const appModeAtom = atom<AppMode>('scripture');

// Text settings
export const fontSizeAtom = atom<number>(3.5); // rem
export const previewFontSizeAtom = atom<number>(3.5);
export const showReferenceAtom = atom<boolean>(true);
export const themeAccentAtom = atom<string>('amber'); // amber, rose, blue, stone

// Layout
export const sidebarOpenAtom = atom<boolean>(true);
export const historyOpenAtom = atom<boolean>(false);
export const searchOpenAtom = atom<boolean>(false);

// Live Modes
export const blackoutActiveAtom = atom<boolean>(false);
export const whiteoutActiveAtom = atom<boolean>(false);
export const logoActiveAtom = atom<boolean>(false);
export const liveLogoUrlAtom = atom<string | null>(null);

// Computed style for the slide text
export const slideStyleAtom = atom((get) => ({
  fontSize: `${get(fontSizeAtom)}rem`,
  lineHeight: 1.4,
}));