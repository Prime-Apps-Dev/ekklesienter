import { IAudioScope, ISlide } from '../types';
import { generateWaveformPoints } from '../utils/audioUtils';

class AudioService {
    private static instance: AudioService;
    private audioContext: AudioContext | null = null;
    private currentScope: IAudioScope | null = null;

    // Playback nodes
    private currentSource: AudioBufferSourceNode | null = null;
    private currentGain: GainNode | null = null;

    // File cache to avoid re-decoding
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
    private waveformCache: Map<string, number[]> = new Map();

    private constructor() { }

    public static getInstance(): AudioService {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }

    private ensureContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    private resolveUrl(fileId: string): string {
        // Already a protocol URL
        if (fileId.startsWith('http://') || fileId.startsWith('https://') || fileId.startsWith('local-resource://') || fileId.startsWith('blob:')) {
            return fileId;
        }
        // Local filesystem path → convert to Electron custom protocol
        // We need to encode the path to handle spaces and special characters
        const cleanPath = fileId.replace(/\\/g, '/');
        const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
        const prefix = encodedPath.startsWith('/') ? '' : '/';
        return `local-resource://${prefix}${encodedPath}`;
    }

    public async getWaveform(fileId: string, samples: number = 100): Promise<number[] | null> {
        const cacheKey = `${fileId}:${samples}`;
        if (this.waveformCache.has(cacheKey)) {
            return this.waveformCache.get(cacheKey)!;
        }

        const buffer = await this.loadAudio(fileId);
        if (!buffer) return null;

        const points = generateWaveformPoints(buffer, samples);
        this.waveformCache.set(cacheKey, points);
        return points;
    }

    private async loadAudio(url: string): Promise<AudioBuffer | null> {
        const resolvedUrl = this.resolveUrl(url);
        if (this.bufferCache.has(resolvedUrl)) return this.bufferCache.get(resolvedUrl)!;

        // If already loading, return existing promise
        const existingPromise = this.loadingPromises.get(resolvedUrl);
        if (existingPromise) return existingPromise;

        const loadPromise = (async () => {
            try {
                const ctx = this.ensureContext();
                const response = await fetch(resolvedUrl);
                if (!response.ok) {
                    console.error('AudioService: Failed to fetch audio:', resolvedUrl, response.status);
                    return null;
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                this.bufferCache.set(resolvedUrl, audioBuffer);
                return audioBuffer;
            } catch (error) {
                // Only log if it's not a expected fetch error (like a stale blob)
                if (!(error instanceof TypeError && url.startsWith('blob:'))) {
                    console.error('Failed to load audio:', resolvedUrl, error);
                }
                return null;
            } finally {
                this.loadingPromises.delete(resolvedUrl);
            }
        })();

        this.loadingPromises.set(resolvedUrl, loadPromise);
        return loadPromise;
    }

    public async sync(liveSlideId: string | null, slides: ISlide[]) {
        console.log('[AudioService] sync called:', { liveSlideId, slidesCount: slides.length, hasScopes: slides.some(s => s.audioScopes?.length) });

        if (!liveSlideId) {
            this.stopAll(0.5);
            this.currentScope = null;
            return;
        }

        const activeScope = this.findActiveScope(liveSlideId, slides);
        console.log('[AudioService] activeScope:', activeScope ? { id: activeScope.id, fileId: activeScope.fileId } : null);

        if (!activeScope) {
            if (this.currentScope) {
                const fadeOut = this.currentScope.crossfadeSettings?.fadeOutDuration ?? 1.0;
                this.stopAll(fadeOut);
                this.currentScope = null;
            }
            return;
        }

        // Same scope, already playing
        if (this.currentScope?.id === activeScope.id) {
            // Update volume/mute if it changed
            if (this.currentGain && this.audioContext) {
                const now = this.audioContext.currentTime;
                const volumeChanged = this.currentScope.volume !== activeScope.volume;
                const muteChanged = this.currentScope.isMuted !== activeScope.isMuted;

                if (volumeChanged || muteChanged) {
                    const targetVolume = activeScope.isMuted ? 0.001 : (activeScope.volume ?? 1);
                    // Use custom fade duration if provided (e.g. from timer action), 
                    // else use configured fades for mute, else 0.1s for smooth slider updates
                    const fadeDuration = activeScope.volumeFadeDuration ?? (muteChanged
                        ? (activeScope.isMuted ? (activeScope.crossfadeSettings?.fadeOutDuration ?? 1.0) : (activeScope.crossfadeSettings?.fadeInDuration ?? 1.0))
                        : 0.1);

                    this.currentGain.gain.cancelScheduledValues(now);
                    this.currentGain.gain.setValueAtTime(this.currentGain.gain.value, now);
                    this.currentGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVolume), now + Math.max(0.01, fadeDuration));

                    this.currentScope.volume = activeScope.volume;
                    this.currentScope.isMuted = activeScope.isMuted;
                }
            }
            return;
        }

        // New scope or different file
        console.log('[AudioService] Switching to scope', activeScope.id, 'fileId:', activeScope.fileId, 'resolvedUrl:', this.resolveUrl(activeScope.fileId));
        await this.playScope(activeScope);
    }

    private findActiveScope(slideId: string, slides: ISlide[]): IAudioScope | null {
        const slideIndex = slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) {
            console.log('[AudioService] findActiveScope: slideId not found in slides');
            return null;
        }

        // Collect all scopes from all slides
        const allScopes: IAudioScope[] = [];
        slides.forEach(s => {
            if (s.audioScopes) {
                allScopes.push(...s.audioScopes);
            }
        });

        console.log('[AudioService] findActiveScope: slideIndex=', slideIndex, 'totalScopes=', allScopes.length);

        // Find scope that covers the current slide
        for (const scope of allScopes) {
            const startIndex = slides.findIndex(s => s.id === scope.startSlideId);
            const endIndex = slides.findIndex(s => s.id === scope.endSlideId);

            console.log('[AudioService]   scope', scope.id, 'range:', startIndex, '-', endIndex, 'current:', slideIndex, 'match:', slideIndex >= startIndex && slideIndex <= endIndex);

            if (startIndex !== -1 && endIndex !== -1) {
                if (slideIndex >= startIndex && slideIndex <= endIndex) {
                    return scope;
                }
            }
        }

        return null;
    }

    public async playScope(scope: IAudioScope) {
        const ctx = this.ensureContext();
        const buffer = await this.loadAudio(scope.fileId);
        if (!buffer) return;

        // Prepare fade durations (Guard against 0 to prevent Web Audio errors and clicks)
        const fadeOutTime = Math.max(0.01, this.currentScope?.crossfadeSettings?.fadeOutDuration ?? 1.0);
        const fadeInTime = Math.max(0.01, scope.crossfadeSettings?.fadeInDuration ?? 1.0);

        // Fade out current
        if (this.currentGain) {
            const now = ctx.currentTime;
            this.currentGain.gain.cancelScheduledValues(now);
            this.currentGain.gain.setValueAtTime(this.currentGain.gain.value, now);
            this.currentGain.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);
            this.currentSource?.stop(now + fadeOutTime);
        }

        // Create new source
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = scope.loop;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.001; // Start from near silence

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;
        const offset = scope.trimStart || 0;
        const duration = (scope.trimEnd && scope.trimEnd > offset) ? (scope.trimEnd - offset) : undefined;

        source.start(now, offset, duration);

        const targetVolume = scope.isMuted ? 0.001 : (scope.volume ?? 1);
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(targetVolume, now + fadeInTime);

        this.currentSource = source;
        this.currentGain = gainNode;
        this.currentScope = { ...scope };
    }

    public stopAll(fadeDuration: number) {
        if (!this.audioContext || !this.currentGain) return;

        const now = this.audioContext.currentTime;
        this.currentGain.gain.cancelScheduledValues(now);
        this.currentGain.gain.setValueAtTime(this.currentGain.gain.value, now);
        this.currentGain.gain.exponentialRampToValueAtTime(0.001, now + fadeDuration);
        this.currentSource?.stop(now + fadeDuration);

        this.currentSource = null;
        this.currentGain = null;
    }
}

export const audioService = AudioService.getInstance();
