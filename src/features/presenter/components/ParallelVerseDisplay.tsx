import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Verse, PresenterSettings } from '@/core/types';
import { getBookName } from '@/core/data/bookData';
import { useTranslation } from 'react-i18next';
import { processChildren } from '@/core/utils/markdownUtils';
import { cn } from '@/core/utils/cn';

import { usePresenterStore } from '@/core/store/presenterStore';
import { SlideBackground } from './SlideBackground';
import { loadFontOffline } from '@/core/utils/fontLoader';

const fontSizeCache = new Map<string, number>();

const getCacheKey = (v1: Verse, v2: Verse, width: number, height: number, settings: PresenterSettings) => {
    return `${v1.id}-${v2.id}-${width}-${height}-${settings.font.family}-${settings.font.weight}-${settings.display.padding.top}-${settings.display.padding.bottom}-${settings.display.referenceGap}-${settings.display.translationGap}-${settings.display.verseGap}`;
};

interface ParallelVerseDisplayProps {
    verse1: Verse;
    verse2: Verse;
    fontSize?: number;
    showReference?: boolean;
    autoFit?: boolean;
    className?: string;
    settings?: PresenterSettings;
}

// Small inner padding so verse text never touches the edges of its flex container
const TEXT_INNER_PADDING = 8;

export const ParallelVerseDisplay: React.FC<ParallelVerseDisplayProps> = ({
    verse1,
    verse2,
    fontSize,
    showReference = true,
    autoFit = true,
    className,
    settings: propSettings,
}) => {
    const { settings: storeSettings } = usePresenterStore();
    const settings = propSettings || storeSettings;

    // containerRef — flex area that holds ONLY the verse texts (excludes reference & labels)
    const containerRef = useRef<HTMLDivElement>(null);
    // contentRef — the actual text node whose font size we scale
    const contentRef = useRef<HTMLDivElement>(null);
    // referenceRef — observe its size to recalc when reference settings change
    const referenceRef = useRef<HTMLDivElement>(null);
    // labelsRef — observe combined height of both translation label rows
    const labelsTopRef = useRef<HTMLDivElement>(null);
    const labelsBottomRef = useRef<HTMLDivElement>(null);

    const effectiveFontSize = fontSize || settings.font.size || 3.5;

    const [computedFontSize, setComputedFontSize] = useState(autoFit ? 4 : effectiveFontSize);
    const [isReady, setIsReady] = useState(!autoFit);

    const { i18n } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';
    const resolvedBookName = getBookName(verse1.bookId, lang);

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
        const cacheKey = getCacheKey(verse1, verse2, availableWidth, availableHeight, settings);
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

        // Smarter initial range
        const charCount = verse1.text.length + verse2.text.length;
        let lo = 0.5;
        let hi = charCount > 1000 ? 8 : charCount > 500 ? 15 : 30;
        const PRECISION = 0.1;

        while (hi - lo > PRECISION) {
            const mid = (lo + hi) / 2;
            content.style.fontSize = `${mid}rem`;

            const rect = content.getBoundingClientRect();
            const fits = rect.height <= availableHeight && rect.width <= availableWidth;

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
    }, [autoFit, verse1, verse2, settings]);

    // Recalculate when verse content or display settings change
    useLayoutEffect(() => {
        if (autoFit) calculateFit();
    }, [
        verse1.text,
        verse2.text,
        autoFit,
        calculateFit,
        settings.font,
        settings.reference,
        settings.display.cornerRadius,
        settings.display.referenceGap,
        settings.display.translationGap,
        settings.display.verseGap,
        settings.display.padding,
        settings.translationLabel,
    ]);

    // ResizeObserver on the verse container (catches window / slide resize)
    useEffect(() => {
        if (!autoFit || !containerRef.current) return;
        let timeoutId: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => calculateFit(), 50);
        });
        ro.observe(containerRef.current);
        return () => {
            ro.disconnect();
            clearTimeout(timeoutId);
        };
    }, [autoFit, calculateFit]);

    // ResizeObserver on the reference block
    useEffect(() => {
        if (!autoFit || !referenceRef.current) return;
        const ro = new ResizeObserver(() => calculateFit());
        ro.observe(referenceRef.current);
        return () => ro.disconnect();
    }, [autoFit, calculateFit]);

    // ResizeObservers on the translation label rows
    useEffect(() => {
        if (!autoFit) return;
        const observers: ResizeObserver[] = [];
        [labelsTopRef, labelsBottomRef].forEach(ref => {
            if (!ref.current) return;
            const ro = new ResizeObserver(() => calculateFit());
            ro.observe(ref.current);
            observers.push(ro);
        });
        return () => observers.forEach(ro => ro.disconnect());
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

        if (settings.translationLabel?.fontFamily && !standardFonts.includes(settings.translationLabel.fontFamily)) {
            loadFontOffline(settings.translationLabel.fontFamily, '700');
        }
    }, [settings.font.family, settings.font.weight, settings.reference.fontFamily, settings.translationLabel?.fontFamily]);

    const shadowScale = computedFontSize / 4;

    const referenceStyle = {
        fontFamily: settings.reference.fontFamily || settings.font.family,
        color: settings.reference.color || settings.font.color,
        fontSize: settings.reference.fontSize
            ? `${settings.reference.fontSize}rem`
            : `${settings.reference.scale * 2}rem`,
        opacity: settings.reference.opacity,
    };

    const labelStyle = {
        fontFamily: settings.translationLabel?.fontFamily || settings.font.family,
        color: settings.translationLabel?.color || settings.font.color,
        fontSize: `${settings.translationLabel?.fontSize || 0.8}rem`,
        opacity: settings.translationLabel?.opacity ?? 0.5,
    };

    const labelsEnabled = settings.translationLabel?.enabled !== false;

    // Reference is ALWAYS rendered to reserve space.
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
                    'whitespace-nowrap transition-all duration-300',
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
                {resolvedBookName} {verse1.chapter}:{verse1.verseNumber}
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

                {/* Top Translation Label — always in DOM when labels enabled */}
                <div
                    ref={labelsTopRef}
                    className="font-black uppercase tracking-widest text-center w-full shrink-0"
                    style={{
                        ...labelStyle,
                        // Reserve space even when hidden so layout is stable
                        visibility: labelsEnabled ? 'visible' : 'hidden',
                        marginBottom: `${settings.display.translationGap ?? 32}px`,
                    }}
                >
                    {verse1.translationId}
                </div>

                {/* Verse text area — grows to fill remaining space */}
                <div
                    ref={containerRef}
                    className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
                >
                    <div
                        ref={contentRef}
                        className="flex flex-col items-center max-w-full"
                        style={{
                            gap: `${settings.display.verseGap ?? 24}px`,
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
                        {/* Primary translation text */}
                        <div className="leading-tight text-center">
                            <ReactMarkdown
                                components={{
                                    strong: ({ children }: any) => (
                                        <span className="text-accent/80 font-semibold">
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                    em: ({ children }: any) => (
                                        <span className="opacity-80 italic">
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                    p: ({ children }: any) => (
                                        <span>{processChildren(children, settings.font.showSuperscript)}</span>
                                    ),
                                }}
                            >
                                {verse1.text}
                            </ReactMarkdown>
                        </div>

                        {/* Secondary translation text */}
                        <div className="leading-tight text-center opacity-80">
                            <ReactMarkdown
                                components={{
                                    strong: ({ children }: any) => (
                                        <span className="text-accent/60 font-semibold">
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                    em: ({ children }: any) => (
                                        <span className="opacity-60 italic">
                                            {processChildren(children, settings.font.showSuperscript)}
                                        </span>
                                    ),
                                    p: ({ children }: any) => (
                                        <span>{processChildren(children, settings.font.showSuperscript)}</span>
                                    ),
                                }}
                            >
                                {verse2.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>

                {/* Bottom Translation Label — always in DOM when labels enabled */}
                <div
                    ref={labelsBottomRef}
                    className="font-black uppercase tracking-widest text-center w-full shrink-0"
                    style={{
                        ...labelStyle,
                        visibility: labelsEnabled ? 'visible' : 'hidden',
                        marginTop: `${settings.display.translationGap ?? 32}px`,
                    }}
                >
                    {verse2.translationId}
                </div>

                {/* Bottom Reference — always in DOM, space always reserved */}
                {settings.reference.position === 'bottom' && renderReference()}
            </div>
        </div>
    );
};
