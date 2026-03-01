import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Verse } from '@/core/types';
import { getBookName } from '@/core/data/bookData';
import { useTranslation } from 'react-i18next';
import { processChildren } from '@/core/utils/markdownUtils';
import { cn } from '@/core/utils/cn';

import { usePresenterStore } from '@/core/store/presenterStore';
import { PresenterSettings } from '@/core/types';
import { SlideBackground } from './SlideBackground';
import { loadFontOffline } from '@/core/utils/fontLoader';

// Global cache for calculated font sizes to avoid re-calculating the same layout
// Key: string hash of (verseText, width, height, fontFamily, weight, settings)
const fontSizeCache = new Map<string, number>();

// Helper to generate a cache key
const getCacheKey = (verse: Verse, width: number, height: number, settings: PresenterSettings) => {
    return `${verse.id}-${width}-${height}-${settings.font.family}-${settings.font.weight}-${settings.display.padding.top}-${settings.display.padding.bottom}-${settings.display.referenceGap}-${settings.reference.position}`;
};

interface VerseDisplayProps {
    verse: Verse;
    settings?: PresenterSettings;
    bookName?: string;
    showReference?: boolean;
    fontSize?: number;
    autoFit?: boolean;
    className?: string;
    isProjector?: boolean;
}

// Small inner padding so verse text never touches the edges of its flex container
const TEXT_INNER_PADDING = 8;

export const VerseDisplay: React.FC<VerseDisplayProps> = ({
    verse,
    bookName,
    showReference = true,
    fontSize,
    autoFit = false,
    className,
    settings: propsSettings,
    isProjector = false,
}) => {
    const { settings: storeSettings } = usePresenterStore();
    const settings = propsSettings || storeSettings;

    // containerRef — flex area that holds ONLY the verse text (excludes reference)
    const containerRef = useRef<HTMLDivElement>(null);
    // contentRef — the actual text node whose font size we scale
    const contentRef = useRef<HTMLDivElement>(null);
    // referenceRef — we watch its size so we recalc when reference settings change
    const referenceRef = useRef<HTMLDivElement>(null);

    const effectiveFontSize = fontSize || settings.font.size || 3.5;

    const [computedFontSize, setComputedFontSize] = useState(autoFit ? 4 : effectiveFontSize);
    const [isReady, setIsReady] = useState(!autoFit);

    const { i18n } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';
    const resolvedBookName = getBookName(verse.bookId, lang);

    // Sync manual font size when not auto-fitting
    useEffect(() => {
        if (!autoFit) {
            setComputedFontSize(effectiveFontSize);
            setIsReady(true);
        }
    }, [effectiveFontSize, autoFit]);

    // Binary-search auto-fit: largest font that fits the verse content area
    const calculateFit = useCallback(() => {
        if (!autoFit || !containerRef.current || !contentRef.current) return;

        const container = containerRef.current;
        const content = contentRef.current;

        const availableHeight = container.clientHeight - TEXT_INNER_PADDING * 2 - 1;
        const availableWidth = container.clientWidth - TEXT_INNER_PADDING * 2;

        if (availableHeight <= 0 || availableWidth <= 0) return;

        // Check Cache first
        const cacheKey = getCacheKey(verse, availableWidth, availableHeight, settings);
        if (fontSizeCache.has(cacheKey)) {
            const cachedSize = fontSizeCache.get(cacheKey)!;
            setComputedFontSize(cachedSize);
            setIsReady(true);
            return;
        }

        setIsReady(false);

        // Force content width to match available
        const prevMaxWidth = content.style.maxWidth;
        const prevOverflow = container.style.overflow;
        content.style.maxWidth = `${availableWidth}px`;
        container.style.overflow = 'visible';

        // Smarter initial range for binary search
        const charCount = verse.text.length;
        let lo = 0.5;
        let hi = charCount > 500 ? 10 : charCount > 200 ? 20 : 40;
        const PRECISION = 0.01; // Increased precision for better fit

        // Subtract a bit more safety margin to prevent rounding-related overflows
        const safeHeight = availableHeight - 4; // Extra 4px safety buffer

        while (hi - lo > PRECISION) {
            const mid = (lo + hi) / 2;
            content.style.fontSize = `${mid}rem`;

            const rect = content.getBoundingClientRect();
            // Using a strict comparison plus a small buffer
            const fits = rect.height <= safeHeight && rect.width <= availableWidth;

            if (fits) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        // Restore
        content.style.maxWidth = prevMaxWidth;
        container.style.overflow = prevOverflow;

        fontSizeCache.set(cacheKey, lo);
        setComputedFontSize(lo);
        setIsReady(true);
    }, [autoFit, verse, settings]);

    // Recalculate when verse content or display settings change
    useLayoutEffect(() => {
        if (autoFit) calculateFit();
    }, [
        verse.text,
        verse.bookId,
        autoFit,
        calculateFit,
        settings.font,
        settings.reference,
        settings.display.cornerRadius,
        settings.display.referenceGap,
        settings.display.padding,
    ]);

    // ResizeObserver on the verse container (catches window / slide resize)
    useEffect(() => {
        if (!autoFit || !containerRef.current) return;
        let timeoutId: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => calculateFit(), 50); // Debounce resizing
        });
        ro.observe(containerRef.current);
        return () => {
            ro.disconnect();
            clearTimeout(timeoutId);
        };
    }, [autoFit, calculateFit]);

    // ResizeObserver on the reference block — recalc when reference size changes
    useEffect(() => {
        if (!autoFit || !referenceRef.current) return;
        const ro = new ResizeObserver(() => calculateFit());
        ro.observe(referenceRef.current);
        return () => ro.disconnect();
    }, [autoFit, calculateFit]);

    // Recalculate after custom fonts load
    useEffect(() => {
        if (!autoFit) return;
        const recalc = () => calculateFit();
        document.fonts.ready.then(recalc);
        document.fonts.addEventListener('loadingdone', recalc);
        return () => document.fonts.removeEventListener('loadingdone', recalc);
    }, [autoFit, calculateFit]);

    // Load custom fonts locally
    useEffect(() => {
        const standardFonts = ['sans', 'serif', 'mono', 'system-ui', 'inherit'];

        if (settings.font.family && !standardFonts.includes(settings.font.family)) {
            loadFontOffline(settings.font.family, settings.font.weight);
        }

        if (settings.reference.fontFamily && !standardFonts.includes(settings.reference.fontFamily)) {
            loadFontOffline(settings.reference.fontFamily, '700');
        }
    }, [settings.font.family, settings.font.weight, settings.reference.fontFamily]);

    const shadowScale = computedFontSize / 4;

    const referenceStyle = {
        fontFamily: settings.reference.fontFamily || settings.font.family,
        color: settings.reference.color || settings.font.color,
        fontSize: settings.reference.fontSize
            ? `${settings.reference.fontSize}rem`
            : `${settings.reference.scale * 2}rem`,
        opacity: settings.reference.opacity,
    };

    // Reference is ALWAYS rendered to reserve space in the layout.
    // When hidden: visibility:hidden keeps the space, display:none would collapse it.
    const isReferenceHidden = !showReference || settings.reference.style === 'hidden';

    const renderReference = () => (
        <div
            ref={referenceRef}
            className={cn(
                'flex items-center shrink-0 relative z-20',
                settings.reference.style === 'classic' ? 'w-full justify-between' : 'w-auto',
                settings.reference.style === 'ribbon' ? 'self-start' : 'self-center',
                !isReferenceHidden && settings.reference.style === 'pill' && 'bg-white/10 px-[1em] py-[0.2em] rounded-full backdrop-blur-md',
                !isReferenceHidden && settings.reference.style === 'outline' && 'border border-white/20 px-[1em] py-[0.2em] rounded-full',
                !isReferenceHidden && settings.reference.style === 'ribbon' && 'border-l-4 border-accent bg-linear-to-r from-accent/10 to-transparent pl-[0.8em] pr-[1em] py-[0.2em]',
                !isReferenceHidden && settings.reference.style === 'underline' && 'border-b border-accent/50 pb-[0.2em]',
                (settings.reference.style === 'modern' ||
                    settings.reference.style === 'minimal' ||
                    settings.reference.style === 'accent' ||
                    settings.reference.style === 'brackets') && 'gap-[0.5em]',
                settings.reference.style === 'classic' && 'gap-[1em]',
            )}
            style={{ visibility: isReferenceHidden ? 'hidden' : 'visible' }}
        >
            {/* Classic Lines - Left */}
            {!isReferenceHidden && settings.reference.style === 'classic' && (
                <div
                    className="h-px flex-1"
                    style={{
                        background: `linear-gradient(to right, transparent, ${referenceStyle.color || 'currentColor'})`,
                        opacity: 0.5,
                    }}
                />
            )}

            {/* Brackets Left */}
            {!isReferenceHidden && settings.reference.style === 'brackets' && (
                <span className="opacity-40 font-light text-[0.8em]">[</span>
            )}

            <span
                className={cn(
                    'whitespace-nowrap',
                    settings.reference.style === 'modern' && 'font-bold uppercase tracking-[0.2em]',
                    settings.reference.style === 'classic' && 'uppercase tracking-[0.2em] font-light',
                    settings.reference.style === 'minimal' && 'font-light tracking-wide opacity-80',
                    settings.reference.style === 'accent' && 'text-accent font-bold tracking-widest',
                    settings.reference.style === 'pill' && 'font-bold tracking-wide text-white',
                    settings.reference.style === 'outline' && 'font-medium tracking-widest uppercase',
                    settings.reference.style === 'brackets' && 'font-medium tracking-widest uppercase text-accent/80',
                    settings.reference.style === 'underline' && 'font-bold tracking-widest uppercase',
                    settings.reference.style === 'ribbon' && 'font-bold tracking-widest uppercase text-white/90',
                )}
                style={referenceStyle}
            >
                {bookName || resolvedBookName} {verse.chapter}:{verse.verseNumber}
            </span>

            {/* Brackets Right */}
            {!isReferenceHidden && settings.reference.style === 'brackets' && (
                <span className="opacity-40 font-light text-[0.8em]">]</span>
            )}

            {/* Classic Lines - Right */}
            {!isReferenceHidden && settings.reference.style === 'classic' && (
                <div
                    className="h-px flex-1"
                    style={{
                        background: `linear-gradient(to right, ${referenceStyle.color || 'currentColor'}, transparent)`,
                        opacity: 0.5,
                    }}
                />
            )}
        </div>
    );

    return (
        <div
            className={cn('w-full h-full relative overflow-hidden', className)}
            style={{ borderRadius: settings?.display?.cornerRadius ? `${settings.display.cornerRadius}px` : undefined }}
        >
            <SlideBackground background={settings.background} />

            {/* Outer layout: outer padding + flex column */}
            <div
                className="relative z-10 w-full h-full flex flex-col"
                style={{
                    paddingTop: `${settings.display.padding?.top ?? 48}px`,
                    paddingBottom: `${settings.display.padding?.bottom ?? 48}px`,
                    paddingLeft: `${settings.display.padding?.left ?? 64}px`,
                    paddingRight: `${settings.display.padding?.right ?? 64}px`,
                    gap: `${settings.display.referenceGap ?? 16}px`,
                }}
            >
                {/* Top Reference — always in DOM, space always reserved */}
                {settings.reference.position === 'top' && renderReference()}

                {/* Verse text area — grows to fill remaining space */}
                <div
                    ref={containerRef}
                    className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
                >
                    <div
                        ref={contentRef}
                        className="max-w-full"
                        style={{
                            fontSize: `${computedFontSize}rem`,
                            opacity: isReady ? 1 : 0,
                            fontFamily: settings.font.family,
                            fontWeight: settings.font.weight,
                            color: settings.font.color,
                            textShadow: settings.font.shadow
                                ? `${settings.font.shadowOffsetX * shadowScale}px ${settings.font.shadowOffsetY * shadowScale}px ${settings.font.shadowBlur * shadowScale}px ${settings.font.shadowColor}`
                                : 'none',
                        }}
                    >
                        <div className="leading-tight text-center">
                            <ReactMarkdown
                                components={{
                                    strong: ({ node, children, ...props }: any) => (
                                        <span className="text-accent/80 font-semibold" {...props}>
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                    em: ({ node, children, ...props }: any) => (
                                        <span className="opacity-80 italic" {...props}>
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                    p: ({ node, children, ...props }: any) => (
                                        <span {...props}>
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                }}
                            >
                                {verse.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>

                {/* Bottom Reference — always in DOM, space always reserved */}
                {settings.reference.position === 'bottom' && renderReference()}
            </div>
        </div>
    );
};
