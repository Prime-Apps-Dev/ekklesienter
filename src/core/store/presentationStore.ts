import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/core/db';
import { ISlide, ICanvasItem, IPresentationFile, IServiceFile, IPresentationSummary, IStyleLayer, BackgroundSettings, IAudioScope, ITimerSettings } from '@/core/types';
import { EktService } from '../services/ektService';
import { EktpService } from '../services/ektpService';
import { toast } from '@/core/utils/toast';
import i18n from '@/core/i18n';

interface PresentationState {
    activeServiceId: string | null;
    activePresentationId: string | null;
    selectedPresentationId: string | null;
    previewSlideId: string | null;
    liveSlideId: string | null;
    activeBlockId: string | null;
    selectedAudioScopeId: string | null;

    // Preloaded Data
    activeService: IServiceFile | null;
    activePresentation: IPresentationFile | null;
    selectedPresentation: IPresentationFile | null;
    cachedPresentation: IPresentationFile | null;
    recents: IPresentationSummary[];

    // UI Actions
    setActiveService: (id: string | null) => Promise<void>;
    setActivePresentation: (id: string | null) => Promise<void>;

    // Blind Mode Actions
    setPreviewSlide: (id: string | null, presentationId?: string | null) => void;
    setLiveSlide: (id: string | null) => void;
    syncPreviewToLive: () => void;

    setActiveBlockId: (id: string | null) => void;

    // Timeline Structure
    toggleSlideExpansion: (slideId: string) => Promise<void>;
    detachNestedInstance: (slideId: string) => Promise<void>;

    // Audio Actions
    addAudioScope: (slideId: string, fileId: string, fileName?: string) => Promise<void>;
    updateAudioScopeBoundary: (scopeId: string, startSlideId: string, endSlideId: string) => Promise<void>;
    updateAudioScope: (scopeId: string, updates: Partial<IAudioScope>) => Promise<void>;
    removeAudioScope: (scopeId: string) => Promise<void>;
    selectAudioScope: (id: string | null) => void;
    resolveAudioConflict: (action: 'replace' | 'shift', params: { targetSlideId: string, fileId: string, overlappingScopes: IAudioScope[] }) => Promise<void>;

    // Data Actions
    loadRecents: () => Promise<void>;
    createService: (name: string) => Promise<string>;
    createPresentation: (name: string, options?: { serviceId?: string, isMaster?: boolean }) => Promise<string>;
    renamePresentation: (presentationId: string, newName: string) => Promise<void>;
    removePresentation: (presentationId: string) => Promise<void>;
    updatePresentationSlides: (presentationId: string, slides: ISlide[]) => Promise<void>;
    updateSlideVariable: (slideId: string, name: string, value: string) => Promise<void>;
    updateSlideBackground: (slideId: string, background: IStyleLayer[] | null) => Promise<void>;
    applyBackgroundToAll: (background: IStyleLayer[]) => Promise<void>;
    saveActiveService: () => Promise<void>;
    duplicateSlide: (presentationId: string, slideId: string) => Promise<void>;
    moveSlide: (presentationId: string, slideId: string, direction: 'back' | 'forth' | 'start' | 'end') => Promise<void>;
    removeSlide: (presentationId: string, slideId: string) => Promise<void>;

    // Canvas Item CRUD
    addCanvasItem: (slideId: string, item: ICanvasItem) => Promise<void>;
    updateCanvasItem: (slideId: string, itemId: string, updates: Partial<ICanvasItem>) => Promise<void>;
    updateCanvasItems: (slideId: string, updates: Array<{ id: string, updates: Partial<ICanvasItem> }>) => Promise<void>;
    updateCanvasItemsOrder: (slideId: string, items: ICanvasItem[]) => Promise<void>;
    removeCanvasItem: (slideId: string, itemId: string) => Promise<void>;
    reorderCanvasItem: (slideId: string, itemId: string, direction: 'up' | 'down') => Promise<void>;
    setMediaBackground: (slideId: string, mediaItem: any) => Promise<void>;
    addMediaLayer: (slideId: string, mediaItem: any, position?: { x: number, y: number }) => Promise<void>;

    // Timer Actions
    updateTimerSettings: (slideId: string, settings: Partial<ITimerSettings>) => Promise<void>;

    // History Actions
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    takeSnapshot: (slideId: string) => Promise<void>;
    navigateNext: (detached?: boolean) => Promise<void>;
    navigatePrev: (detached?: boolean) => Promise<void>;

    // Nested Stacks Actions
    addPresentationToTimeline: (presentationId: string) => Promise<void>;
    saveNestedChanges: (options: { syncBack: boolean }) => Promise<void>;

    // Stage 1: Save Performance & Assets
    isSaving: boolean;
    saveActivePresentation: () => Promise<void>;
}

export const usePresentationStore = create<PresentationState>()(
    persist(
        (set, get) => ({
            activeServiceId: null,
            activePresentationId: null,
            selectedPresentationId: null,
            previewSlideId: null,
            liveSlideId: null,
            activeBlockId: null,
            selectedAudioScopeId: null,

            activeService: null,
            activePresentation: null,
            selectedPresentation: null,
            cachedPresentation: null,
            recents: [],
            isSaving: false,


            setActiveService: async (id) => {
                if (!id) {
                    set({ activeServiceId: null, activeService: null, activePresentationId: null, activePresentation: null });
                    return;
                }

                const service = await db.serviceFiles.get(id);
                if (service) {
                    const now = new Date();
                    await db.serviceFiles.update(id, { lastOpened: now });
                    set({ activeServiceId: id, activeService: { ...service, lastOpened: now } });

                    // Auto-load master presentation
                    await get().setActivePresentation(service.masterPresentationId);
                    await get().loadRecents();
                }
            },

            setActivePresentation: async (id) => {
                const { activePresentationId, activePresentation, cachedPresentation } = get();

                if (id === activePresentationId) return;

                // Move current to cache if it exists
                if (activePresentation) {
                    set({ cachedPresentation: activePresentation });
                }

                if (!id) {
                    set({ activePresentationId: null, activePresentation: null, previewSlideId: null });
                    return;
                }

                // Load from DB
                const pres = await db.presentationFiles.get(id);
                if (pres) {
                    // Update last opened
                    const now = new Date();
                    await db.presentationFiles.update(id, { lastOpened: now });

                    set({
                        activePresentationId: id,
                        selectedPresentationId: id,
                        activePresentation: { ...pres, lastOpened: now },
                        selectedPresentation: { ...pres, lastOpened: now },
                        previewSlideId: pres.slides.length > 0 ? pres.slides[0].id : null,
                        liveSlideId: null
                    });

                    await get().loadRecents();
                }
            },

            setPreviewSlide: async (id, presentationId) => {
                const { activePresentationId, selectedPresentationId } = get();
                const targetPresId = presentationId || activePresentationId;

                if (targetPresId && targetPresId !== selectedPresentationId) {
                    const pres = await db.presentationFiles.get(targetPresId);
                    if (pres) {
                        set({
                            previewSlideId: id,
                            selectedPresentationId: targetPresId,
                            selectedPresentation: pres
                        });
                        return;
                    }
                }

                set({
                    previewSlideId: id,
                    selectedPresentationId: targetPresId
                });
            },
            setLiveSlide: (id) => set({ liveSlideId: id }),
            syncPreviewToLive: () => {
                const { liveSlideId, activePresentationId, activePresentation } = get();
                if (liveSlideId) {
                    set({
                        previewSlideId: liveSlideId,
                        selectedPresentationId: activePresentationId,
                        selectedPresentation: activePresentation // Sync the object too for instant reactivity
                    });
                }
            },
            setActiveBlockId: (id) => set({ activeBlockId: id }),
            selectAudioScope: (id) => set({ selectedAudioScopeId: id }),

            toggleSlideExpansion: async (slideId) => {
                const { activePresentationId, activePresentation } = get();
                if (!activePresentationId || !activePresentation) return;

                const newSlides = activePresentation.slides.map(s => {
                    if (s.id === slideId) {
                        return { ...s, isExpanded: !s.isExpanded };
                    }
                    return s;
                });

                await get().updatePresentationSlides(activePresentationId, newSlides);
            },

            detachNestedInstance: async (slideId) => {
                const { activePresentationId, activePresentation } = get();
                if (!activePresentationId || !activePresentation) return;

                const slideIndex = activePresentation.slides.findIndex(s => s.id === slideId);
                if (slideIndex === -1) return;

                const slide = activePresentation.slides[slideIndex];
                if (!slide.linkedPresentationId && !slide.masterPresentationId) return;

                // For a real implementation, we would load the external document slides and merge them directly
                // For now, we just clear the linked ID to make it functionally "local"
                const newSlides = [...activePresentation.slides];
                newSlides[slideIndex] = {
                    ...slide,
                    localNestedPresentationId: slide.linkedPresentationId || slide.masterPresentationId,
                    linkedPresentationId: undefined,
                    masterPresentationId: undefined
                };

                await get().updatePresentationSlides(activePresentationId, newSlides);
            },

            addAudioScope: async (slideId, fileId, fileName) => {
                const { activePresentationId } = get();
                if (!activePresentationId) return;

                // Search in all presentations for the target slide
                const allPres = await db.presentationFiles.toArray();
                let targetPresId: string | undefined;
                let targetSlides: ISlide[] | undefined;

                for (const p of allPres) {
                    if (!p.slides) continue;
                    const slide = p.slides.find(s => s.id === slideId);
                    if (slide) {
                        targetPresId = p.id;
                        targetSlides = p.slides;
                        break;
                    }
                }

                if (!targetPresId || !targetSlides) return;

                const newScope: IAudioScope = {
                    id: crypto.randomUUID(),
                    startSlideId: slideId,
                    endSlideId: slideId,
                    fileId,
                    fileName,
                    volume: 1,
                    loop: false,
                    crossfadeSettings: {
                        fadeInDuration: 1.0,
                        fadeOutDuration: 1.0
                    }
                };

                const newSlides = targetSlides.map(s => {
                    if (s.id === slideId) {
                        return {
                            ...s,
                            audioScopes: [...(s.audioScopes || []), newScope]
                        };
                    }
                    return s;
                });
                await get().updatePresentationSlides(targetPresId, newSlides);
            },

            updateAudioScopeBoundary: async (scopeId, startSlideId, endSlideId) => {
                const { activePresentationId } = get();
                if (!activePresentationId) return;

                const allPres = await db.presentationFiles.toArray();
                let targetPresId: string | undefined;
                let targetSlides: ISlide[] | undefined;
                let matchedScope: IAudioScope | undefined;
                let oldSlideId: string | undefined;

                for (const p of allPres) {
                    if (!p.slides) continue;
                    for (const slide of p.slides) {
                        const scope = slide.audioScopes?.find(s => s.id === scopeId);
                        if (scope) {
                            targetPresId = p.id;
                            targetSlides = p.slides;
                            matchedScope = scope;
                            oldSlideId = slide.id;
                            break;
                        }
                    }
                    if (targetPresId) break;
                }

                if (!targetPresId || !targetSlides || !matchedScope) return;

                const newSlides = targetSlides.map(s => {
                    // Remove scope from its old hosting slide, unless the start didn't change (still on same slide)
                    if (s.id === oldSlideId && s.id !== startSlideId) {
                        return { ...s, audioScopes: (s.audioScopes || []).filter(scp => scp.id !== scopeId) };
                    }
                    // Attach scope to the new start slide, or update if it's the same
                    if (s.id === startSlideId) {
                        const updatedScope = { ...matchedScope, startSlideId, endSlideId };
                        const existingScopes = (s.audioScopes || []).filter(scp => scp.id !== scopeId);
                        return { ...s, audioScopes: [...existingScopes, updatedScope] };
                    }
                    return s;
                });
                await get().updatePresentationSlides(targetPresId, newSlides);
            },

            updateAudioScope: async (scopeId, updates) => {
                const { activePresentationId } = get();
                if (!activePresentationId) return;

                const allPres = await db.presentationFiles.toArray();
                let targetPresId: string | undefined;
                let targetSlides: ISlide[] | undefined;

                for (const p of allPres) {
                    if (!p.slides) continue;
                    const hasScope = p.slides.some(s => s.audioScopes?.some(scp => scp.id === scopeId));
                    if (hasScope) {
                        targetPresId = p.id;
                        targetSlides = p.slides;
                        break;
                    }
                }

                if (!targetPresId || !targetSlides) return;

                const newSlides = targetSlides.map(s => {
                    if (!s.audioScopes) return s;
                    return {
                        ...s,
                        audioScopes: s.audioScopes.map(scp =>
                            scp.id === scopeId ? { ...scp, ...updates } : scp
                        )
                    };
                });
                await get().updatePresentationSlides(targetPresId, newSlides);
            },

            removeAudioScope: async (scopeId) => {
                const { activePresentationId } = get();
                if (!activePresentationId) return;

                const allPres = await db.presentationFiles.toArray();
                for (const p of allPres) {
                    if (!p.slides) continue;
                    const hasScope = p.slides.some(s => s.audioScopes?.some(scp => scp.id === scopeId));
                    if (hasScope) {
                        const newSlides = p.slides.map(s => {
                            if (!s.audioScopes) return s;
                            return { ...s, audioScopes: s.audioScopes.filter(scp => scp.id !== scopeId) };
                        });
                        await get().updatePresentationSlides(p.id, newSlides);
                        break;
                    }
                }
            },

            resolveAudioConflict: async (action, { targetSlideId, fileId, overlappingScopes }) => {
                const { activePresentationId } = get();
                if (!activePresentationId) return;

                const pres = await db.presentationFiles.get(activePresentationId);
                if (!pres) return;

                if (action === 'replace') {
                    const scopeIdsToRemove = new Set(overlappingScopes.map(s => s.id));
                    const newSlides = pres.slides.map(s => {
                        if (!s.audioScopes) return s;
                        const filtered = s.audioScopes.filter(scp => !scopeIdsToRemove.has(scp.id));
                        return { ...s, audioScopes: filtered };
                    });

                    // After removing, add the new one
                    const targetIdx = newSlides.findIndex(s => s.id === targetSlideId);
                    if (targetIdx !== -1) {
                        const newScope: IAudioScope = {
                            id: crypto.randomUUID(),
                            startSlideId: targetSlideId,
                            endSlideId: targetSlideId,
                            fileId,
                            volume: 1,
                            loop: false,
                            crossfadeSettings: { fadeInDuration: 1.0, fadeOutDuration: 1.0 }
                        };
                        newSlides[targetIdx] = {
                            ...newSlides[targetIdx],
                            audioScopes: [...(newSlides[targetIdx].audioScopes || []), newScope]
                        };
                    }
                    await get().updatePresentationSlides(activePresentationId, newSlides);
                } else if (action === 'shift') {
                    const newSlides = [...pres.slides];
                    const targetIdx = newSlides.findIndex(s => s.id === targetSlideId);
                    if (targetIdx === -1) return;

                    const newScopeId = crypto.randomUUID();
                    const newScopeConfig: IAudioScope = {
                        id: newScopeId,
                        startSlideId: targetSlideId,
                        endSlideId: targetSlideId,
                        fileId,
                        volume: 1,
                        loop: false,
                        crossfadeSettings: { fadeInDuration: 1.0, fadeOutDuration: 1.0 }
                    };

                    const scopeIdsToMove = new Set(overlappingScopes.map(s => s.id));
                    const shiftStartIdx = targetIdx + 1;
                    const shiftStartSlideId = shiftStartIdx < newSlides.length ? newSlides[shiftStartIdx].id : null;

                    const updatedSlides = newSlides.map((s, idx) => {
                        let currentScopes = s.audioScopes || [];
                        currentScopes = currentScopes.filter(scp => !scopeIdsToMove.has(scp.id));

                        if (s.id === targetSlideId) {
                            currentScopes = [...currentScopes, newScopeConfig];
                        }

                        if (shiftStartSlideId && s.id === shiftStartSlideId) {
                            const movedScopes = overlappingScopes.map(scp => {
                                const originalStartIdx = pres.slides.findIndex(sl => sl.id === scp.startSlideId);
                                const originalEndIdx = pres.slides.findIndex(sl => sl.id === scp.endSlideId);
                                const span = originalEndIdx - originalStartIdx;

                                const newEndIdx = Math.min(newSlides.length - 1, shiftStartIdx + span);
                                return {
                                    ...scp,
                                    startSlideId: shiftStartSlideId,
                                    endSlideId: newSlides[newEndIdx].id
                                };
                            });
                            currentScopes = [...currentScopes, ...movedScopes];
                        }

                        return { ...s, audioScopes: currentScopes };
                    });

                    await get().updatePresentationSlides(activePresentationId, updatedSlides);
                }
            },

            loadRecents: async () => {
                const presentations = await db.presentationFiles.orderBy('lastOpened').reverse().limit(10).toArray();
                const services = await db.serviceFiles.orderBy('lastOpened').reverse().limit(10).toArray();

                const summaries: IPresentationSummary[] = [
                    ...presentations.map(p => ({
                        id: p.id,
                        name: p.name,
                        lastOpened: p.lastOpened || p.updatedAt,
                        type: 'presentation' as const
                    })),
                    ...services.map(s => ({
                        id: s.id,
                        name: s.name,
                        lastOpened: s.lastOpened || s.updatedAt,
                        type: 'service' as const
                    }))
                ].sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime()).slice(0, 10);

                set({ recents: summaries });
            },

            createService: async (name) => {
                const serviceId = crypto.randomUUID();
                const now = new Date();

                // Create master presentation directly with correct linkage
                const masterId = crypto.randomUUID();
                const newMaster: IPresentationFile = {
                    id: masterId,
                    name: `${name} (Master)`,
                    serviceId: serviceId,
                    isMaster: true,
                    createdAt: now,
                    updatedAt: now,
                    lastOpened: now,
                    slides: []
                };

                await db.presentationFiles.add(newMaster);

                const newService: IServiceFile = {
                    id: serviceId,
                    name,
                    presentationIds: [masterId],
                    masterPresentationId: masterId,
                    createdAt: now,
                    updatedAt: now,
                    lastOpened: now
                };

                await db.serviceFiles.add(newService);

                // Set both as active
                await get().setActiveService(serviceId);
                await get().setActivePresentation(masterId);

                return serviceId;
            },

            createPresentation: async (name, options) => {
                const now = new Date();

                // Enforce single master rule
                if (options?.isMaster && options.serviceId) {
                    const existingMaster = await db.presentationFiles
                        .where({ serviceId: options.serviceId, isMaster: true })
                        .first();
                    if (existingMaster) {
                        toast.error(i18n.t('master_already_exists', 'A master presentation already exists for this service'));
                        return existingMaster.id;
                    }
                }

                const id = crypto.randomUUID();
                const newPresentation: IPresentationFile = {
                    id,
                    name,
                    serviceId: options?.serviceId,
                    isMaster: options?.isMaster,
                    createdAt: now,
                    updatedAt: now,
                    lastOpened: now,
                    slides: []
                };
                await db.presentationFiles.add(newPresentation);

                // If part of a service, update the service manifest
                if (options?.serviceId) {
                    const service = await db.serviceFiles.get(options.serviceId);
                    if (service) {
                        await db.serviceFiles.update(options.serviceId, {
                            presentationIds: [...service.presentationIds, id],
                            updatedAt: now
                        });
                        // Refresh active service if it's the one we're editing
                        if (get().activeServiceId === options.serviceId) {
                            set({ activeService: { ...service, presentationIds: [...service.presentationIds, id], updatedAt: now } });
                        }
                    }
                }

                if (!options?.serviceId || options.isMaster) {
                    await get().setActivePresentation(id);
                }
                return id;
            },

            renamePresentation: async (presentationId, newName) => {
                const pres = await db.presentationFiles.get(presentationId);
                if (!pres || pres.isMaster) return; // Master cannot be renamed

                const now = new Date();
                await db.presentationFiles.update(presentationId, { name: newName, updatedAt: now });

                const { activePresentationId, activePresentation } = get();
                if (activePresentationId === presentationId && activePresentation) {
                    set({ activePresentation: { ...activePresentation, name: newName, updatedAt: now } });
                }
                await get().loadRecents();
            },

            removePresentation: async (presentationId) => {
                const pres = await db.presentationFiles.get(presentationId);
                if (!pres || pres.isMaster) return; // Master cannot be removed

                const now = new Date();
                await db.presentationFiles.delete(presentationId);

                // If part of a service, update manifest
                if (pres.serviceId) {
                    const service = await db.serviceFiles.get(pres.serviceId);
                    if (service) {
                        const newIds = service.presentationIds.filter(id => id !== presentationId);
                        await db.serviceFiles.update(pres.serviceId, { presentationIds: newIds, updatedAt: now });
                        if (get().activeServiceId === pres.serviceId) {
                            set({ activeService: { ...service, presentationIds: newIds, updatedAt: now } });
                        }
                    }
                }

                if (get().activePresentationId === presentationId) {
                    // Fallback to master if possible
                    const service = pres.serviceId ? await db.serviceFiles.get(pres.serviceId) : null;
                    if (service) {
                        await get().setActivePresentation(service.masterPresentationId);
                    } else {
                        await get().setActivePresentation(null);
                    }
                }
                await get().loadRecents();
            },

            updatePresentationSlides: async (presentationId, slides) => {
                const now = new Date();

                // Update store FIRST for instant UI reactivity
                const { activePresentationId, activePresentation, selectedPresentationId, selectedPresentation } = get();
                const updates: Partial<PresentationState> = {};

                if (activePresentationId === presentationId) {
                    const basePres = activePresentation || { id: presentationId, name: '', slides: [], updatedAt: now } as any;
                    updates.activePresentation = { ...basePres, slides, updatedAt: now };
                }

                if (selectedPresentationId === presentationId) {
                    const basePres = selectedPresentation || { id: presentationId, name: '', slides: [], updatedAt: now } as any;
                    updates.selectedPresentation = { ...basePres, slides, updatedAt: now };
                }

                if (Object.keys(updates).length > 0) {
                    set(updates);
                }

                // Persist to DB in background (non-blocking)
                await db.presentationFiles.update(presentationId, {
                    slides,
                    updatedAt: now
                });
            },

            updateSlideVariable: async (slideId, name, value) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
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

                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            updateSlideBackground: async (slideId, background) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        return {
                            ...s,
                            backgroundOverride: background || undefined
                        };
                    }
                    return s;
                });

                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            applyBackgroundToAll: async (background) => {
                const { selectedPresentationId } = get();
                if (!selectedPresentationId) return;

                const pres = await db.presentationFiles.get(selectedPresentationId);
                if (!pres) return;

                const newSlides = pres.slides.map(s => ({
                    ...s,
                    backgroundOverride: background
                }));

                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },
            duplicateSlide: async (presentationId, slideId) => {
                const pres = await db.presentationFiles.get(presentationId);
                if (!pres) return;

                const slideIdx = pres.slides.findIndex(s => s.id === slideId);
                if (slideIdx === -1) return;

                // Take snapshot for all slides because order changes
                await Promise.all(pres.slides.map(s => get().takeSnapshot(s.id)));

                const original = pres.slides[slideIdx];
                const newSlide: ISlide = {
                    ...original,
                    id: crypto.randomUUID(),
                    order: slideIdx + 1,
                    // Clear stateful properties
                    isExpanded: false,
                };

                const newSlides = [...pres.slides];
                newSlides.splice(slideIdx + 1, 0, newSlide);

                const ordered = newSlides.map((s, i) => ({ ...s, order: i }));
                await get().updatePresentationSlides(presentationId, ordered);

                // If this is the active presentation, auto-select the new slide
                if (presentationId === get().activePresentationId) {
                    get().setPreviewSlide(newSlide.id, presentationId);
                }
            },

            moveSlide: async (presentationId, slideId, direction) => {
                const pres = await db.presentationFiles.get(presentationId);
                if (!pres) return;

                const idx = pres.slides.findIndex(s => s.id === slideId);
                if (idx === -1) return;

                // Take snapshot for all slides affected by order change
                await Promise.all(pres.slides.map(s => get().takeSnapshot(s.id)));

                const newSlides = [...pres.slides];
                const [moved] = newSlides.splice(idx, 1);

                if (direction === 'back') {
                    if (idx === 0) return;
                    newSlides.splice(idx - 1, 0, moved);
                } else if (direction === 'forth') {
                    if (idx === pres.slides.length - 1) return;
                    newSlides.splice(idx + 1, 0, moved);
                } else if (direction === 'start') {
                    newSlides.unshift(moved);
                } else if (direction === 'end') {
                    newSlides.push(moved);
                }

                const ordered = newSlides.map((s, i) => ({ ...s, order: i }));
                await get().updatePresentationSlides(presentationId, ordered);
            },

            removeSlide: async (presentationId, slideId) => {
                const pres = await db.presentationFiles.get(presentationId);
                if (!pres) return;

                await get().takeSnapshot(slideId);

                const newSlides = pres.slides.filter(s => s.id !== slideId).map((s, i) => ({ ...s, order: i }));
                await get().updatePresentationSlides(presentationId, newSlides);

                if (get().previewSlideId === slideId) {
                    get().setPreviewSlide(null);
                }
                if (get().liveSlideId === slideId) {
                    get().setLiveSlide(null);
                }
            },

            addPresentationToTimeline: async (presentationId) => {
                const { activePresentationId, activePresentation, activeServiceId } = get();
                if (!activePresentationId || !activePresentation) return;

                const pres = await db.presentationFiles.get(presentationId);
                if (!pres) return;

                // Ensure it's in the same service (workflow)
                if (pres.serviceId !== activeServiceId) {
                    // Force import or error? User said: "if user want to import nested presentation on timeline, he should import it into workflow"
                    // So we expect it to be there. For now, let's toast an error if it's not.
                    // But maybe we should auto-import? Let's check.
                    console.warn('[addPresentationToTimeline] Presentation not in active service');
                }

                const newSlide: ISlide = {
                    id: crypto.randomUUID(),
                    order: activePresentation.slides.length,
                    blockId: 'master-presentation', // Logic for stack
                    templateId: 'default',
                    content: { variables: {} },
                    masterPresentationId: presentationId,
                    isExpanded: false
                };

                const newSlides = [...activePresentation.slides, newSlide];
                await get().updatePresentationSlides(activePresentationId, newSlides);
                set({ previewSlideId: newSlide.id });
            },

            saveNestedChanges: async ({ syncBack }) => {
                const { activePresentation } = get();
                if (!activePresentation) return;

                // This will be implemented fully once we have the 'dirty' state tracking
                console.log(`Saving nested changes. Sync back: ${syncBack}`);
            },

            addCanvasItem: async (slideId, item) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        const existing = s.content.canvasItems || [];
                        // Set zIndex to the top-most value
                        const newItem = { ...item, zIndex: existing.length };
                        return {
                            ...s,
                            content: { ...s.content, canvasItems: [...existing, newItem] }
                        };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            updateCanvasItem: async (slideId, itemId, updates) => {
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                // Priority 1: Store state (for instant reactivity)
                let pres = selectedPresentation;

                // Priority 2: Fallback to active presentation if it's the same ID
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) {
                        pres = active;
                    }
                }

                // Priority 3: Database (cold start)
                if (!pres || pres.id !== selectedPresentationId) {
                    pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }

                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        const items = (s.content.canvasItems || []).map(ci => {
                            if (ci.id !== itemId) return ci;

                            // Perform a deeper merge for nested objects to prevent partial updates
                            // from overwriting the entire sub-object (e.g. text, shape)
                            const mergedItem = { ...ci, ...updates };

                            if (updates.text && ci.text) {
                                mergedItem.text = { ...ci.text, ...updates.text };
                            }
                            if (updates.shape && ci.shape) {
                                mergedItem.shape = { ...ci.shape, ...updates.shape };
                            }
                            if ((updates as any).video && (ci as any).video) {
                                (mergedItem as any).video = { ...(ci as any).video, ...(updates as any).video };
                            }
                            if ((updates as any).image && (ci as any).image) {
                                (mergedItem as any).image = { ...(ci as any).image, ...(updates as any).image };
                            }

                            return mergedItem;
                        });
                        return { ...s, content: { ...s.content, canvasItems: items } };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            updateCanvasItems: async (slideId, updates) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                // Priority 1: Store state (for instant reactivity)
                let pres = selectedPresentation;

                // Priority 2: Fallback to active presentation if it's the same ID
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) {
                        pres = active;
                    }
                }

                // Priority 3: Database (cold start)
                if (!pres || pres.id !== selectedPresentationId) {
                    pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }

                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        const items = (s.content.canvasItems || []).map(ci => {
                            const update = updates.find(u => u.id === ci.id);
                            if (!update) return ci;

                            const mergedItem = { ...ci, ...update.updates };

                            // Perform a deeper merge for nested objects
                            if (update.updates.text && ci.text) {
                                mergedItem.text = { ...ci.text, ...update.updates.text };
                            }
                            if (update.updates.shape && ci.shape) {
                                mergedItem.shape = { ...ci.shape, ...update.updates.shape };
                            }
                            if ((update.updates as any).video && (ci as any).video) {
                                (mergedItem as any).video = { ...(ci as any).video, ...(update.updates as any).video };
                            }
                            if ((update.updates as any).image && (ci as any).image) {
                                (mergedItem as any).image = { ...(ci as any).image, ...(update.updates as any).image };
                            }

                            return mergedItem;
                        });
                        return { ...s, content: { ...s.content, canvasItems: items } };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },
            updateCanvasItemsOrder: async (slideId, items) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        return { ...s, content: { ...s.content, canvasItems: items } };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },


            removeCanvasItem: async (slideId, itemId) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        const items = (s.content.canvasItems || [])
                            .filter(ci => ci.id !== itemId)
                            .map((ci, idx) => ({ ...ci, zIndex: idx })); // Maintain z-index sequence
                        return { ...s, content: { ...s.content, canvasItems: items } };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            reorderCanvasItem: async (slideId, itemId, direction) => {
                await get().takeSnapshot(slideId);
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        const items = [...(s.content.canvasItems || [])];
                        const index = items.findIndex(item => item.id === itemId);
                        if (index === -1) return s;

                        const newIndex = direction === 'up' ? index + 1 : index - 1;
                        if (newIndex < 0 || newIndex >= items.length) return s;

                        // Swap
                        [items[index], items[newIndex]] = [items[newIndex], items[index]];

                        // Update z-indexes to match new array order
                        const updatedItems = items.map((item, idx) => ({
                            ...item,
                            zIndex: idx
                        }));

                        return { ...s, content: { ...s.content, canvasItems: updatedItems } };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            setMediaBackground: async (slideId, mediaItem) => {
                const isVideo = mediaItem.type === 'video';
                const layer: IStyleLayer = {
                    id: crypto.randomUUID(),
                    type: isVideo ? 'video' : 'image',
                    visible: true,
                    opacity: 1,
                    blendMode: 'normal',
                    ...(isVideo ? {
                        video: {
                            url: mediaItem.path,
                            source: 'local',
                            isMuted: true,
                            isLooping: true,
                        }
                    } : {
                        image: {
                            url: mediaItem.path,
                            source: 'local',
                        }
                    })
                };
                await get().updateSlideBackground(slideId, [layer]);
            },

            addMediaLayer: async (slideId, mediaItem, position) => {
                const isVideo = mediaItem.type === 'video';
                const newItem: ICanvasItem = {
                    id: crypto.randomUUID(),
                    type: isVideo ? 'video' : 'image',
                    x: position?.x ?? 50,
                    y: position?.y ?? 50,
                    width: 40,
                    height: 40,
                    rotation: 0,
                    zIndex: 0,
                    locked: false,
                    visible: true,
                    opacity: 1,
                    fills: [],
                    strokes: [],
                    ...(isVideo ? {
                        video: {
                            url: mediaItem.path,
                            loop: true,
                            muted: false,
                            volume: 1,
                            playbackRate: 1,
                            startTime: 0
                        }
                    } : {
                        image: {
                            url: mediaItem.path,
                            fit: 'contain',
                            flipX: false,
                            flipY: false
                        }
                    })
                } as any; // Cast as any if some nested properties are still slightly off in local types
                await get().addCanvasItem(slideId, newItem);
            },

            updateTimerSettings: async (slideId, updates) => {
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }
                if (!pres) return;

                const newSlides = pres.slides.map(s => {
                    if (s.id === slideId) {
                        return {
                            ...s,
                            timerSettings: {
                                ...(s.timerSettings || {
                                    duration: 300,
                                    style: 'digital',
                                    endAction: 'none'
                                }),
                                ...updates
                            }
                        };
                    }
                    return s;
                });
                await get().updatePresentationSlides(selectedPresentationId, newSlides);
            },

            // ─── History ───────────────────────────────────────────────
            takeSnapshot: async (slideId) => {
                const { useHistoryStore } = await import('./historyStore');
                const { selectedPresentationId, selectedPresentation } = get();
                if (!selectedPresentationId) return;

                let pres = selectedPresentation;
                if (!pres || pres.id !== selectedPresentationId) {
                    const active = get().activePresentation;
                    if (active && active.id === selectedPresentationId) pres = active;
                    else pres = await db.presentationFiles.get(selectedPresentationId) || null;
                }

                const slide = pres?.slides?.find(s => s.id === slideId);
                if (!slide) return;

                useHistoryStore.getState().pushSnapshot({
                    slideId,
                    canvasItems: JSON.parse(JSON.stringify(slide.content?.canvasItems || [])),
                    background: JSON.parse(JSON.stringify(slide.backgroundOverride || []))
                });
            },

            undo: async () => {
                const { useHistoryStore } = await import('./historyStore');
                const snapshot = useHistoryStore.getState().undo();
                if (!snapshot) return;

                const { selectedPresentationId } = get();
                if (!selectedPresentationId) return;

                await db.presentationFiles.where('id').equals(selectedPresentationId).modify(pres => {
                    const slide = pres.slides.find(s => s.id === snapshot.slideId);
                    if (slide) {
                        slide.content = { ...slide.content, canvasItems: snapshot.canvasItems };
                        slide.backgroundOverride = snapshot.background;
                    }
                });

                // Refresh local state if current slide was impacted
                const updatedPres = await db.presentationFiles.get(selectedPresentationId);
                if (updatedPres) set({ activePresentation: updatedPres });
            },

            redo: async () => {
                const { useHistoryStore } = await import('./historyStore');
                const snapshot = useHistoryStore.getState().redo();
                if (!snapshot) return;

                const { selectedPresentationId } = get();
                if (!selectedPresentationId) return;

                await db.presentationFiles.where('id').equals(selectedPresentationId).modify(pres => {
                    const slide = pres.slides.find(s => s.id === snapshot.slideId);
                    if (slide) {
                        slide.content = { ...slide.content, canvasItems: snapshot.canvasItems };
                        slide.backgroundOverride = snapshot.background;
                    }
                });

                // Refresh local state if current slide was impacted
                const updatedPres = await db.presentationFiles.get(selectedPresentationId);
                if (updatedPres) set({ activePresentation: updatedPres });
            },

            navigateNext: async (detached = false) => {
                const { activePresentationId, previewSlideId, setPreviewSlide, setLiveSlide } = get();
                if (!activePresentationId) return;

                const presentation = await db.presentationFiles.get(activePresentationId);
                if (!presentation || !presentation.slides.length) return;

                const slides = presentation.slides;
                // Use preview as the basis for navigation
                const currentId = previewSlideId || slides[0].id;
                const idx = slides.findIndex(s => s.id === currentId);
                const nextIdx = Math.min(slides.length - 1, idx + 1);
                const nextId = slides[nextIdx].id;

                setPreviewSlide(nextId);
                if (!detached) {
                    setLiveSlide(nextId);
                }
            },

            navigatePrev: async (detached = false) => {
                const { activePresentationId, previewSlideId, setPreviewSlide, setLiveSlide } = get();
                if (!activePresentationId) return;

                const presentation = await db.presentationFiles.get(activePresentationId);
                if (!presentation || !presentation.slides.length) return;

                const slides = presentation.slides;
                const currentId = previewSlideId || slides[0].id;
                const idx = slides.findIndex(s => s.id === currentId);
                const prevIdx = Math.max(0, idx - 1);
                const prevId = slides[prevIdx].id;

                setPreviewSlide(prevId);
                if (!detached) {
                    setLiveSlide(prevId);
                }
            },

            saveActiveService: async () => {
                const { activeServiceId, activeService } = get();
                if (!activeServiceId || !activeService) return;

                set({ isSaving: true });
                try {
                    // If we have a file handle, use it for direct save
                    if (activeService.fileHandle) {
                        await EktService.save(activeServiceId);
                    } else {
                        // Otherwise, do a standard export/downloadpack
                        const blob = await EktService.pack(activeServiceId);
                        EktService.download(blob, activeService.name);
                    }
                } catch (error) {
                    console.error('Failed to save service:', error);
                    throw error;
                } finally {
                    set({ isSaving: false });
                }
            },

            saveActivePresentation: async () => {
                const { activePresentationId, activePresentation } = get();
                if (!activePresentationId || !activePresentation) return;

                set({ isSaving: true });
                try {
                    if (activePresentation.fileHandle) {
                        await EktpService.save(activePresentationId);
                    } else {
                        const blob = await EktpService.pack(activePresentationId);
                        EktpService.download(blob, activePresentation.name);
                    }
                } catch (error) {
                    console.error('Failed to save presentation:', error);
                    throw error;
                } finally {
                    set({ isSaving: false });
                }
            },

        }),
        {
            name: 'presentation-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeServiceId: state.activeServiceId,
                activePresentationId: state.activePresentationId,
                selectedPresentationId: state.selectedPresentationId,
                previewSlideId: state.previewSlideId,
                activeBlockId: state.activeBlockId,
            }),
        }
    )
);

