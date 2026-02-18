import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/core/db';
import { ISlide, IPresentationFile } from '@/core/types';

interface PresentationState {
    activeWorkflowId: string | null;
    activePresentationId: string | null;
    selectedSlideId: string | null;

    // Actions
    setActiveWorkflow: (id: string | null) => void;
    setActivePresentation: (id: string | null) => void;
    setSelectedSlide: (id: string | null) => void;

    // Data Actions
    createPresentation: (name: string, workflowId?: string) => Promise<string>;
    saveActiveWorkflow: () => Promise<void>;
    updatePresentationSlides: (presentationId: string, slides: ISlide[]) => Promise<void>;
    updateSlideVariable: (slideId: string, name: string, value: string) => Promise<void>;
}

export const usePresentationStore = create<PresentationState>()(
    persist(
        (set, get) => ({
            activeWorkflowId: null,
            activePresentationId: null,
            selectedSlideId: null,

            setActiveWorkflow: (id) => set({ activeWorkflowId: id }),
            setActivePresentation: (id) => set({ activePresentationId: id, selectedSlideId: null }),
            setSelectedSlide: (id) => set({ selectedSlideId: id }),

            createPresentation: async (name, workflowId) => {
                const id = crypto.randomUUID();
                const now = new Date();
                const newPresentation: IPresentationFile = {
                    id,
                    name,
                    workflowId,
                    createdAt: now,
                    updatedAt: now,
                    slides: []
                };
                await db.presentationFiles.add(newPresentation);
                set({ activePresentationId: id });
                return id;
            },

            updatePresentationSlides: async (presentationId, slides) => {
                await db.presentationFiles.update(presentationId, {
                    slides,
                    updatedAt: new Date()
                });
            },

            updateSlideVariable: async (slideId, name, value) => {
                const { activePresentationId } = get();
                if (!activePresentationId) return;

                const pres = await db.presentationFiles.get(activePresentationId);
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        return {
                            ...s,
                            content: {
                                ...s.content,
                                variables: {
                                    ...s.content.variables,
                                    [name]: value
                                }
                            }
                        };
                    }
                    return s;
                });

                await db.presentationFiles.update(activePresentationId, {
                    slides: newSlides,
                    updatedAt: new Date()
                });
            },

            saveActiveWorkflow: async () => {
                const { activeWorkflowId } = get();
                if (!activeWorkflowId) return;
                console.log(`Saving workflow: ${activeWorkflowId}`);
                // Future: implementation for saving state snapshot
            }
        }),
        {
            name: 'presentation-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
