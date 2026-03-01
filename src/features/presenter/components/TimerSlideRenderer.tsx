import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ITimerSettings } from '@/core/types';
import { cn } from '@/core/utils/cn';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useSetAtom } from 'jotai';
import { activeOverrideAtom, OverrideType } from '@/core/store/uiAtoms';
import { audioService } from '@/core/services/AudioService';
import { IAudioScope } from '@/core/types';

interface TimerSlideRendererProps {
    id: string;
    settings: ITimerSettings;
    isPreview?: boolean;
    isLive?: boolean;
}

const FlipCard = ({ value, label, color }: { value: string; label: string; color: string }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [nextValue, setNextValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (value !== currentValue) {
            setNextValue(value);
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setCurrentValue(value);
                setIsAnimating(false);
            }, 800); // Matched reference timing
            return () => clearTimeout(timer);
        }
    }, [value, currentValue]);

    return (
        <div className="flex flex-col items-center gap-10">
            <style dangerouslySetInnerHTML={{
                __html: `
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-x-180 { transform: rotateX(180deg); }
                .rotate-x-0 { transform: rotateX(0deg); }
                .rotate-x-minus-180 { transform: rotateX(-180deg); }
            `}} />

            <div className="relative w-[340px] h-[400px] perspective-1000 group">
                {/* Background Shadow Wrap */}
                <div className="absolute -inset-6 bg-black/40 rounded-[60px] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

                {/* Static Top (Next Value behind) */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-[#222] rounded-t-[32px] flex items-center justify-center overflow-hidden border-x border-t border-white/5 shadow-inner">
                    <span
                        className="text-[300px] font-bold text-white/95 leading-none tracking-tighter font-mono translate-y-1/2"
                        style={{ textShadow: '1px 1px 1px #000' }}
                    >
                        {nextValue}
                    </span>
                    <div className="absolute inset-0 bg-linear-to-b from-black/30 to-transparent" />
                </div>

                {/* Static Bottom (Current Value) */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#222] rounded-b-[32px] flex items-center justify-center overflow-hidden border-x border-b border-white/5 shadow-lg">
                    <span
                        className="text-[300px] font-bold text-white/95 leading-none tracking-tighter font-mono -translate-y-1/2"
                        style={{ textShadow: '1px 1px 1px #000' }}
                    >
                        {currentValue}
                    </span>
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                </div>

                {/* Flipping Card (animates from top to bottom) */}
                <div
                    className={cn(
                        "absolute inset-x-0 top-0 h-1/2 z-20 transition-transform duration-800 preserve-3d origin-bottom",
                        isAnimating ? "rotate-x-minus-180" : "rotate-x-0"
                    )}
                >
                    {/* Front Face (Current Top) */}
                    <div className="absolute inset-0 bg-[#222] rounded-t-[32px] flex items-center justify-center overflow-hidden border-x border-t border-white/5 backface-hidden">
                        <span
                            className="text-[300px] font-bold text-white/95 leading-none tracking-tighter font-mono translate-y-1/2"
                            style={{ textShadow: '1px 1px 1px #000' }}
                        >
                            {currentValue}
                        </span>
                        <div className="absolute inset-0 bg-linear-to-b from-black/20 to-transparent" />
                    </div>

                    {/* Back Face (Next Bottom) */}
                    <div
                        className="absolute inset-x-0 -bottom-full h-full bg-[#222] rounded-b-[32px] flex items-center justify-center overflow-hidden border-x border-b border-white/5 backface-hidden rotate-x-180"
                        style={{ transform: 'rotateX(180deg) translateY(0)' }}
                    >
                        <span
                            className="text-[300px] font-bold text-white/95 leading-none tracking-tighter font-mono -translate-y-1/2"
                            style={{ textShadow: '1px 1px 1px #000' }}
                        >
                            {nextValue}
                        </span>
                        <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                    </div>
                </div>

                {/* Mid line / Hinge */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-black/95 z-30 shadow-[0_0_15px_rgba(0,0,0,0.8)]" />

                {/* Bolts/Mechanical hinges */}
                <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-linear-to-br from-[#333] to-[#111] border border-white/10 z-40 shadow-xl" />
                <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-linear-to-br from-[#333] to-[#111] border border-white/10 z-40 shadow-xl" />
            </div>

            {/* Subtitle Label */}
            <div className="px-6 py-2 bg-black/20 rounded-full border border-white/5 backdrop-blur-sm shadow-lg">
                <span className="text-xl uppercase tracking-[0.6em] font-black text-white/30 whitespace-nowrap">
                    {label}
                </span>
            </div>
        </div>
    );
};

const TimerSlideRenderer: React.FC<TimerSlideRendererProps> = ({ id, settings, isPreview = false, isLive = false }) => {
    const [timeLeft, setTimeLeft] = useState(settings.duration);
    const [isStarted, setIsStarted] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const setOverride = useSetAtom(activeOverrideAtom as any);
    const firedTriggers = useRef<Set<string>>(new Set());

    const [currentSongIndex, setCurrentSongIndex] = useState(0);

    // Sync with duration changes
    useEffect(() => {
        if (!isLive) {
            setTimeLeft(settings.duration);
            firedTriggers.current.clear();
            setCurrentSongIndex(0);
        }
    }, [settings.duration, isLive]);

    // Playlist logic - Start/Stop audio
    useEffect(() => {
        if (!isLive || !settings.playlist || settings.playlist.length === 0) {
            return;
        }

        const playCurrentSong = async (index: number) => {
            const songPath = settings.playlist![index];
            if (!songPath) return;

            // Create a temporary audio scope for the timer
            const tempScope: IAudioScope = {
                id: `timer-audio-${id}-${index}`,
                startSlideId: id,
                endSlideId: id,
                fileId: songPath,
                volume: 1,
                loop: settings.playlist!.length === 1, // Loop if only one song
                crossfadeSettings: { fadeInDuration: 1, fadeOutDuration: 1 }
            };

            await audioService.playScope(tempScope);
        };

        playCurrentSong(currentSongIndex);

        return () => {
            // Stop audio when slide is no longer live or component unmounts
            audioService.stopAll(0.5);
        };
    }, [isLive, id, settings.playlist, currentSongIndex]);

    // Timer logic
    useEffect(() => {
        if (!isLive) return;

        const startTime = Date.now();
        const initialTime = timeLeft;
        const duration = settings.duration;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, initialTime - elapsed);
            setTimeLeft(remaining);

            // Trigger Logic
            if (settings.triggers) {
                settings.triggers.forEach(trigger => {
                    let shouldFire = false;
                    const elapsedFromStart = duration - remaining;

                    switch (trigger.type) {
                        case 'start':
                            if (elapsedFromStart <= 0.1) shouldFire = true;
                            break;
                        case 'finish':
                            if (remaining <= 0.1) shouldFire = true;
                            break;
                        case 'remaining':
                            if (remaining <= trigger.value && remaining > trigger.value - 1) shouldFire = true;
                            break;
                        case 'elapsed':
                            if (elapsedFromStart >= trigger.value && elapsedFromStart < trigger.value + 1) shouldFire = true;
                            break;
                        case 'percentage':
                            const currentPct = (elapsedFromStart / duration) * 100;
                            if (currentPct >= trigger.value) shouldFire = true;
                            break;
                    }

                    if (shouldFire && !firedTriggers.current.has(trigger.id)) {
                        firedTriggers.current.add(trigger.id);
                        executeActions(trigger.actions);
                    }
                });
            }

            if (remaining === 0) {
                clearInterval(interval);
                handleEndAction();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isLive, settings.triggers, timeLeft]); // Added timeLeft to dependencies for handleEndAction to be correct

    const executeActions = (actions: any[]) => {
        actions.forEach(action => {
            switch (action.type) {
                case 'next_slide':
                    usePresentationStore.getState().navigateNext();
                    break;
                case 'blackout':
                    setOverride('blackout');
                    break;
                case 'play_sound':
                    // Simple synthesized beep for now
                    try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                        gain.gain.setValueAtTime(0.1, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.5);
                    } catch (e) {
                        console.error('Failed to play trigger sound:', e);
                    }
                    break;
                case 'flash':
                    setShowFlash(true);
                    setTimeout(() => setShowFlash(false), 500);
                    break;
                case 'change_bg':
                    if (action.payload?.background) {
                        usePresentationStore.getState().updateSlideBackground(id, action.payload.background);
                    }
                    break;
                case 'volume_fade':
                    const volume = action.payload?.volume ?? 0;
                    const fadeDuration = action.payload?.duration ?? 0.1;

                    // Directly call audioService stop with fade if target is 0
                    if (volume === 0) {
                        audioService.stopAll(fadeDuration);
                    } else {
                        // For non-zero volume updates, we'd need to update the current gain node
                        // Since audioService doesn't expose public volume control yet, we'll just stop
                        // but let's assume we want to stop for most timer use cases
                        audioService.stopAll(fadeDuration);
                    }
                    break;
            }
        });
    };

    const handleEndAction = () => {
        if (!isLive) return;

        if (settings.endAction === 'loop') {
            setTimeLeft(settings.duration);
        } else if (settings.endAction === 'next') {
            const { navigateNext } = usePresentationStore.getState();
            navigateNext();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = settings.duration > 0 ? (timeLeft / settings.duration) : 0;

    // Visual Styles
    const renderStyle = () => {
        const timeStr = formatTime(timeLeft);
        const color = settings.themeColor || '#f97316'; // orange-500
        const [mins, secs] = timeStr.split(':');

        switch (settings.style) {
            case 'digital':
                return (
                    <div className="flex flex-col items-center justify-center font-mono">
                        <div
                            className="text-[280px] font-black tracking-tighter text-white relative"
                            style={{
                                textShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
                                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))'
                            }}
                        >
                            {/* Inner Glow / Pulse */}
                            <div className="absolute inset-0 blur-2xl opacity-20 animate-pulse bg-white/30 rounded-full" />
                            <div className="relative z-10 flex">
                                {timeStr.split('').map((char, i) => (
                                    <span key={i} className={cn(char === ':' && "animate-pulse opacity-50")}>{char}</span>
                                ))}
                            </div>
                            {/* Scanline Effect */}
                            <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.2)] z-20 pointer-events-none" />
                        </div>
                    </div>
                );
            case 'circular':
                const radius = 320;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference * (1 - progress);
                return (
                    <div className="relative flex items-center justify-center scale-110">
                        <svg className="w-[800px] h-[800px] -rotate-90 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            {/* Background Track */}
                            <circle
                                cx="400"
                                cy="400"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-white/5"
                            />
                            {/* Glow Track */}
                            <circle
                                cx="400"
                                cy="400"
                                r={radius}
                                stroke={color}
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={circumference}
                                className="opacity-20 blur-sm"
                                style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
                                strokeLinecap="round"
                            />
                            {/* Main Progress */}
                            <circle
                                cx="400"
                                cy="400"
                                r={radius}
                                stroke={color}
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={circumference}
                                style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <div className="text-[200px] font-black text-white leading-none tracking-tighter">
                                {timeStr}
                            </div>
                            {settings.prefix && (
                                <div className="text-2xl uppercase tracking-[0.5em] text-white/30 mt-4 font-bold">
                                    {settings.prefix}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'minimal':
                return (
                    <div className="flex gap-4 items-baseline overflow-hidden h-[400px]">
                        {timeStr.split('').map((char, i) => (
                            <div key={i} className="relative h-full flex items-center justify-center">
                                <span
                                    key={`${char}-${timeLeft}`}
                                    className={cn(
                                        "text-[340px] font-light tracking-tighter transition-all duration-300 transform",
                                        char === ':' ? "opacity-30 mx-2" : "animate-in slide-in-from-bottom-20 fade-in text-white/90"
                                    )}
                                >
                                    {char}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            case 'neon':
                return (
                    <div className="flex flex-col items-center justify-center">
                        <div
                            className="text-[280px] font-black italic tracking-tighter relative"
                            style={{
                                color: '#fff',
                                textShadow: `
                                    0 0 7px #fff,
                                    0 0 10px #fff,
                                    0 0 21px ${color},
                                    0 0 42px ${color},
                                    0 0 82px ${color},
                                    0 0 92px ${color},
                                    0 0 102px ${color},
                                    0 0 151px ${color}
                                `
                            }}
                        >
                            <div className="flex animate-pulse duration-3000">
                                {timeStr.split('').map((char, i) => (
                                    <span key={i} className={cn(i % 3 === 0 && "animate-[pulse_2s_ease-in-out_infinite] opacity-90")}>{char}</span>
                                ))}
                            </div>
                            {/* Micro-flicker overlay */}
                            <div className="absolute inset-0 opacity-[0.03] bg-white animate-pulse" />
                        </div>
                    </div>
                );
            case 'bar':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center px-60">
                        <div className="text-[240px] font-black text-white mb-16 tracking-tighter drop-shadow-2xl">
                            {timeStr}
                        </div>
                        <div className="w-full h-10 bg-black/40 rounded-3xl p-1.5 border border-white/10 backdrop-blur-xl shadow-2xl relative group overflow-hidden">
                            {/* Track Glow */}
                            <div className="absolute inset-0 bg-white/5 animate-pulse" />

                            {/* Progress Fill */}
                            <div
                                className="h-full rounded-2xl transition-all duration-1000 linear relative overflow-hidden"
                                style={{
                                    width: `${progress * 100}%`,
                                    backgroundColor: color,
                                    boxShadow: `0 0 30px ${color}40`
                                }}
                            >
                                {/* Moving highlight */}
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    </div>
                );
            case 'flip':
                return (
                    <div className="flex gap-12 items-center justify-center">
                        <FlipCard value={mins} label="Minutes" color={color} />
                        <div className="flex flex-col gap-6 -mt-10">
                            <div className="w-5 h-5 rounded-full bg-white/20 animate-pulse" />
                            <div className="w-5 h-5 rounded-full bg-white/20 animate-pulse delay-500" />
                        </div>
                        <FlipCard value={secs} label="Seconds" color={color} />
                    </div>
                );
            case 'modern':
                return (
                    <div className="flex flex-col items-center justify-center p-20 animate-in zoom-in-95 duration-700">
                        <div className="relative group">
                            {/* Aura Glow */}
                            <div className="absolute -inset-20 bg-linear-to-tr from-accent/20 via-transparent to-white/10 blur-[100px] opacity-50 rounded-full animate-pulse" />

                            <div className="relative flex flex-col items-center text-center">
                                <div
                                    className="text-[340px] font-black leading-none bg-linear-to-b from-white via-white to-white/20 bg-clip-text text-transparent tracking-tighter transition-all"
                                    style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
                                >
                                    {timeStr}
                                </div>
                                {settings.prefix && (
                                    <div className="absolute -top-12 left-0 right-0">
                                        <div className="h-px bg-linear-to-r from-transparent via-white/20 to-transparent mb-4" />
                                        <span className="text-3xl uppercase tracking-[1.5em] font-light text-white/40 block">
                                            {settings.prefix}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'dots':
                return (
                    <div className="flex flex-col items-center justify-center gap-4 bg-black/60 p-20 rounded-[60px] border border-white/5 backdrop-blur-md">
                        <div
                            className="text-[240px] font-black text-white p-10 relative overflow-hidden group"
                            style={{
                                fontFamily: '"DotGothic16", monospace',
                                WebkitTextStroke: '2px rgba(255,255,255,0.05)'
                            }}
                        >
                            {/* Dot Grid Layer */}
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,#fff_2px,transparent_0)] bg-size-[12px_12px]" />
                            <div className="relative z-10 animate-in fade-in slide-in-from-right-10 duration-500">
                                {timeStr}
                            </div>
                            <div className="absolute inset-0 bg-linear-to-r from-accent/5 to-transparent mix-blend-overlay" />
                        </div>
                    </div>
                );
            case 'glass':
                return (
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-linear-to-br from-white/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="bg-white/5 backdrop-blur-[60px] border border-white/15 rounded-[100px] p-24 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            {/* Glossy Reflection */}
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-linear-to-b from-white/10 to-transparent" />

                            <div
                                className="text-[240px] font-black text-white relative z-10 mix-blend-plus-lighter"
                                style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}
                            >
                                <span className="inline-block animate-in slide-in-from-top-10 duration-700">{timeStr}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'bold':
                return (
                    <div className="relative flex flex-col items-center justify-center group">
                        <div
                            className="text-[500px] font-black text-white leading-none scale-y-110 tracking-tighter animate-[pulse_1s_ease-in-out_infinite]"
                            style={{
                                WebkitTextStroke: '4px #fff',
                                paintOrder: 'stroke fill',
                            }}
                        >
                            <span className="mix-blend-difference">{timeStr}</span>
                        </div>
                        {/* Shadow copy for depth */}
                        <div className="absolute text-[500px] font-black text-black/40 leading-none scale-y-110 tracking-tighter translate-y-10 blur-xl -z-10">
                            {timeStr}
                        </div>
                    </div>
                );
            default:
                return <div className="text-[120px] text-white font-black tracking-tighter">{timeStr}</div>;
        }
    };

    return (
        <div
            className="w-full h-full flex items-center justify-center relative transition-colors duration-500"
            style={{
                backgroundColor: `rgba(0, 0, 0, ${settings.backgroundOpacity ?? 0})`
            }}
        >
            {renderStyle()}
            {showFlash && (
                <div className="absolute inset-0 bg-white animate-out fade-out duration-500 pointer-events-none z-50" />
            )}
        </div>
    );
};

export default TimerSlideRenderer;
