import React, { useEffect, useState } from 'react';
import { Verse, ISlide } from '@/core/types';
import { useTranslation } from 'react-i18next';
import { VerseDisplay } from './VerseDisplay';
import { ParallelVerseDisplay } from './ParallelVerseDisplay';
import SlideDisplay from './SlideDisplay';
import { db } from '@/core/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/core/utils/cn';

const ProjectorView: React.FC = () => {
    const { t } = useTranslation();
    const [verse, setVerse] = useState<Verse | null>(null);
    const [multiVerses, setMultiVerses] = useState<Verse[] | null>(null);
    const [slide, setSlide] = useState<ISlide | null>(null);
    const [appMode, setAppMode] = useState<'scripture' | 'presentation'>('scripture');
    const [secondTranslationId, setSecondTranslationId] = useState<string | null>(null);

    // Live Overrides
    const [isBlackout, setIsBlackout] = useState(false);
    const [isWhiteout, setIsWhiteout] = useState(false);
    const [isLogo, setIsLogo] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // Fetch parallel verse if second translation is active
    const parallelVerse = useLiveQuery(
        async () => {
            if (!verse || !secondTranslationId) return null;
            return await db.verses
                .where('[translationId+bookId+chapter]')
                .equals([secondTranslationId, verse.bookId, verse.chapter])
                .and(v => v.verseNumber === verse.verseNumber)
                .first();
        },
        [verse?.id, secondTranslationId]
    );

    useEffect(() => {
        // Add 'projector-mode' class to body for specific styling
        document.body.classList.add('projector-mode');

        // Keyboard handlers
        const handleKeyDown = (e: KeyboardEvent) => {
            if (window.electron && window.electron.ipcRenderer) {
                // ESC: Close projector window
                if (e.key === 'Escape') {
                    window.electron.ipcRenderer.invoke('close-projector');
                }
                // Arrow Right or Down: Next verse
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    window.electron.ipcRenderer.send('navigate-verse', 'next');
                }
                // Arrow Left or Up: Previous verse
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    window.electron.ipcRenderer.send('navigate-verse', 'prev');
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Listen for verse updates from Controller via IPC
        let unsubscribe: (() => void) | undefined;
        if (window.electron && window.electron.ipcRenderer) {
            // Signal that projector is ready to receive data
            window.electron.ipcRenderer.send('projector-ready');

            unsubscribe = window.electron.ipcRenderer.on(
                'projector-command',
                (command: string, payload: any) => {

                    if (command === 'show-verse') {
                        setVerse(payload.verse);
                        setMultiVerses(null);
                        setSecondTranslationId(payload.secondTranslationId);
                        setSlide(null);
                    } else if (command === 'show-multiverses') {
                        setMultiVerses(payload.verses);
                        setVerse(null);
                        setSecondTranslationId(payload.secondTranslationId);
                        setSlide(null);
                    } else if (command === 'show-slide') {
                        setSlide(payload.slide);
                        setVerse(null);
                        setMultiVerses(null);
                    } else if (command === 'set-app-mode') {
                        setAppMode(payload);
                    } else if (command === 'set-blackout') {
                        setIsBlackout(payload);
                    } else if (command === 'set-whiteout') {
                        setIsWhiteout(payload);
                    } else if (command === 'set-logo') {
                        setIsLogo(payload.active);
                        if (payload.url) setLogoUrl(payload.url);
                    } else if (command === 'update-theme') {
                        document.documentElement.setAttribute('data-theme', payload);
                    } else if (command === 'clear') {
                        setVerse(null);
                        setSlide(null);
                        setSecondTranslationId(null);
                        setIsBlackout(false);
                        setIsWhiteout(false);
                        setIsLogo(false);
                    }
                }
            );
        }

        // Report initial and subsequent aspect ratios
        const reportRatio = () => {
            if (window.electron?.ipcRenderer) {
                const ratio = window.innerWidth / window.innerHeight;
                window.electron.ipcRenderer.send('projector-ready', { ratio });
            }
        };

        window.addEventListener('resize', reportRatio);
        reportRatio(); // Report initial ratio

        return () => {
            window.removeEventListener('resize', reportRatio);
            document.body.classList.remove('projector-mode');
            document.removeEventListener('keydown', handleKeyDown);
            unsubscribe?.();
        };
    }, []);

    return (
        <div className="w-screen h-screen overflow-hidden bg-black relative">
            {/* Main Content Layer */}
            <div className={cn(
                "w-full h-full transition-opacity duration-500",
                (isBlackout || isWhiteout || isLogo) ? "opacity-0" : "opacity-100"
            )}>
                <SlideDisplay
                    isProjector={true}
                    activeVerse={verse}
                    selectedSlide={slide}
                    parallelVerse={parallelVerse}
                    multiVerses={multiVerses}
                    appMode={appMode}
                />
            </div>

            {/* Blackout Overlay */}
            <div className={cn(
                "absolute inset-0 bg-black z-100 transition-opacity duration-700 pointer-events-none",
                isBlackout ? "opacity-100" : "opacity-0"
            )} />

            {/* Whiteout Overlay */}
            <div className={cn(
                "absolute inset-0 bg-white z-101 transition-opacity duration-700 pointer-events-none",
                isWhiteout ? "opacity-100" : "opacity-0"
            )} />

            {/* Logo Overlay */}
            <div className={cn(
                "absolute inset-0 bg-stone-950 z-102 transition-opacity duration-700 pointer-events-none flex items-center justify-center p-24",
                isLogo ? "opacity-100" : "opacity-0"
            )}>
                {logoUrl ? (
                    <img src={logoUrl} alt="Church Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                    <div className="text-stone-700 flex flex-col items-center gap-6">
                        <div className="w-32 h-32 rounded-full border-4 border-stone-800 flex items-center justify-center opacity-20">
                            <span className="text-4xl font-black">E</span>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-[0.3em] opacity-20">Ekklesienter</h1>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectorView;
