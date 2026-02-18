import { create } from 'zustand';
import { PresenterSettings } from '../types';

interface PresenterStore {
    settings: PresenterSettings;
    draftSettings: PresenterSettings | null;
    startEditing: () => void;
    updateDraft: (update: Partial<PresenterSettings> | ((prev: PresenterSettings) => PresenterSettings)) => void;
    commitDraft: () => void;
    cancelEditing: () => void;
    updateBackground: (bg: Partial<PresenterSettings['background']>) => void;
    updateFont: (font: Partial<PresenterSettings['font']>) => void;
    updateReference: (ref: Partial<PresenterSettings['reference']>) => void;
    updateTranslationLabel: (label: Partial<PresenterSettings['translationLabel']>) => void;
    updateDisplay: (display: Partial<PresenterSettings['display']>) => void;
    setSettings: (settings: PresenterSettings) => void;
    resetSettings: () => void;
    syncSettings: () => void;
}

const DEFAULT_SETTINGS: PresenterSettings = {
    background: {
        type: 'gradient',
        gradient: {
            from: '#1c1917', // stone-900
            to: '#0c0a09', // stone-950
            angle: 135
        },
        blur: 0
    },
    font: {
        family: 'serif',
        weight: '400',
        size: 3.5,
        color: '#f5f5f4', // stone-100
        shadow: false,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        showSuperscript: true
    },
    reference: {
        style: 'classic',
        position: 'bottom',
        opacity: 0.9,
        scale: 0.4,
        fontSize: 1.2,
        color: '#f5f5f4', // stone-100
        fontFamily: 'sans'
    },
    translationLabel: {
        enabled: true,
        color: '#f5f5f4', // stone-100
        opacity: 0.3,
        fontSize: 0.8,
        fontFamily: 'sans'
    },
    display: {
        autoDefine: true,
        cornerRadius: 0,
        referenceGap: 16,
        translationGap: 32,
        verseGap: 24,
        padding: {
            top: 48,
            bottom: 48,
            left: 64,
            right: 64
        }
    }
};

export const usePresenterStore = create<PresenterStore>((set, get) => ({
    settings: DEFAULT_SETTINGS,
    draftSettings: null,

    startEditing: () => {
        set({ draftSettings: JSON.parse(JSON.stringify(get().settings)) });
    },

    updateDraft: (update) => {
        set((state) => {
            if (!state.draftSettings) return state;

            let newDraft: PresenterSettings;
            if (typeof update === 'function') {
                newDraft = update(state.draftSettings);
            } else {
                newDraft = { ...state.draftSettings, ...update };
            }

            return { draftSettings: newDraft };
        });
    },

    commitDraft: () => {
        const { draftSettings } = get();
        if (draftSettings) {
            set({ settings: draftSettings, draftSettings: null });
            get().syncSettings();
        }
    },

    cancelEditing: () => {
        set({ draftSettings: null });
    },

    updateBackground: (bg) => {
        set((state) => ({
            settings: {
                ...state.settings,
                background: { ...state.settings.background, ...bg }
            }
        }));
        get().syncSettings();
    },

    updateFont: (font) => {
        set((state) => ({
            settings: {
                ...state.settings,
                font: { ...state.settings.font, ...font }
            }
        }));
        get().syncSettings();
    },

    updateReference: (ref) => {
        set((state) => ({
            settings: {
                ...state.settings,
                reference: { ...state.settings.reference, ...ref }
            }
        }));
        get().syncSettings();
    },

    updateTranslationLabel: (label) => {
        set((state) => ({
            settings: {
                ...state.settings,
                translationLabel: { ...state.settings.translationLabel, ...label }
            }
        }));
        get().syncSettings();
    },

    updateDisplay: (display) => {
        set((state) => {
            const newDisplay = { ...state.settings.display, ...display };
            const nextState: Partial<PresenterStore> = {
                settings: { ...state.settings, display: newDisplay }
            };

            if (state.draftSettings) {
                nextState.draftSettings = {
                    ...state.draftSettings,
                    display: { ...state.draftSettings.display, ...display }
                };
            }

            return nextState;
        });
        get().syncSettings();
    },

    setSettings: (settings) => {
        set({ settings });
    },

    resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        get().syncSettings();
    },

    syncSettings: () => {
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('projector-command', 'update-settings', get().settings);
        }
    }
}));
