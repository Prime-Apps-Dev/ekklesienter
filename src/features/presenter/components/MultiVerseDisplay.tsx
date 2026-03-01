import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { Verse } from '@/core/types';
import { getBookName } from '@/core/data/bookData';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';
import { usePresenterStore } from '@/core/store/presenterStore';
import { PresenterSettings } from '@/core/types';
import ReactMarkdown from 'react-markdown';
import { processChildren } from '@/core/utils/markdownUtils';
import { formatMultiVerseReference } from '@/core/utils/bibleUtils';
import { loadFontOffline } from '@/core/utils/fontLoader';

const fontSizeCache = new Map<string, number>();

const getCacheKey = (verses: Verse[], width: number, height: number, settings: PresenterSettings) => {
    return `${verses.map(v => v.id).join('-')}-${width}-${height}-${settings.font.family}-${settings.font.weight}-${settings.display.padding.top}-${settings.display.padding.bottom}-${settings.display.referenceGap}-${settings.reference.position}`;
};

interface MultiVerseDisplayProps {
    verses: Verse[];
    settings?: PresenterSettings;
    showReference?: boolean;
    autoFit?: boolean;
    className?: string;
    isProjector?: boolean;
}

// Small inner padding so verse text never touches the edges of its flex container
const TEXT_INNER_PADDING = 8;
const MIN_FONT_SIZE = 0.5; // rem
const MAX_FONT_SIZE = 40;  // rem
const PRECISION = 0.05;

export const MultiVerseDisplay: React.FC<MultiVerseDisplayProps> = ({
    verses,
    showReference = true,
    autoFit = true,
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

    const [computedFontSize, setComputedFontSize] = useState(autoFit ? 4 : 2);
    const [isReady, setIsReady] = useState(!autoFit);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const { i18n } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';

    // ─── Reference text ────────────────────────────────────────────────────────
    const getReferenceText = () => {
        if (verses.length === 0) return '';
        const first = verses[0];
        const bookName = getBookName(first.bookId, lang);

        return formatMultiVerseReference(verses, bookName, lang);
    };

    // ─── Auto-fit binary search ────────────────────────────────────────────────
    const calculateFit = useCallback(() => {
        if (!autoFit || !containerRef.current || !contentRef.current) return;
        const container = containerRef.current;
        const content = contentRef.current;

        const availH = container.clientHeight - TEXT_INNER_PADDING * 2 - 1;
        const availW = container.clientWidth - TEXT_INNER_PADDING * 2;

        if (availH <= 0 || availW <= 0) return;

        // Check Cache
        const cacheKey = getCacheKey(verses, availW, availH, settings);
        if (fontSizeCache.has(cacheKey)) {
            const cachedSize = fontSizeCache.get(cacheKey)!;
            setComputedFontSize(cachedSize);
            setIsReady(true);
            return;
        }

        setIsReady(false);
        setIsOverflowing(false);

        const prevOverflow = container.style.overflow;
        container.style.overflow = 'visible';
        content.style.maxWidth = `${availW}px`;

        // Heuristic initial range
        const charCount = verses.reduce((acc, v) => acc + v.text.length, 0);
        let lo = MIN_FONT_SIZE;
        let hi = charCount > 2000 ? 5 : charCount > 1000 ? 10 : 25;
        const PRECISION_LOCAL = 0.01; // Increased precision

        // Subtract a bit more safety margin to prevent rounding-related overflows
        const safeHeight = availH - 4; // Extra 4px safety buffer

        while (hi - lo > PRECISION_LOCAL) {
            const mid = (lo + hi) / 2;
            content.style.fontSize = `${mid}rem`;

            const rect = content.getBoundingClientRect();
            const fitsH = rect.height <= safeHeight;
            const fitsW = rect.width <= availW;

            if (fitsH && fitsW) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        // Restore
        container.style.overflow = prevOverflow;
        content.style.maxWidth = '';

        fontSizeCache.set(cacheKey, lo);
        setComputedFontSize(lo);
        setIsReady(true);

        const finalRect = content.getBoundingClientRect();
        if (finalRect.height > availH + 5 || finalRect.width > availW + 5) {
            setIsOverflowing(true);
        }
    }, [autoFit, verses, settings]);

    // Run on relevant data change
    useLayoutEffect(() => {
        if (autoFit) calculateFit();
    }, [verses, calculateFit, settings.font, settings.reference, settings.display]);

    // ResizeObserver for container size changes
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

    // ResizeObserver for reference block changes (position/mode change)
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

    // ─── Styles ────────────────────────────────────────────────────────────────
    const referenceStyle: React.CSSProperties = {
        fontFamily: settings.reference.fontFamily || settings.font.family,
        color: settings.reference.color || settings.font.color,
        fontSize: settings.reference.fontSize
            ? `${settings.reference.fontSize}rem`
            : `${settings.reference.scale * 2}rem`,
        opacity: settings.reference.opacity,
    };

    const renderReference = () => (
        <div
            ref={referenceRef}
            className={cn(
                'flex items-center shrink-0 relative z-20 self-center',
                settings.reference.style === 'classic'
                    ? 'w-full justify-between gap-[1em]'
                    : 'w-auto gap-[0.5em]'
            )}
            style={{ visibility: showReference ? 'visible' : 'hidden' }}
        >
            {settings.reference.style === 'classic' && (
                <div
                    className="h-px flex-1 opacity-50"
                    style={{ background: `linear-gradient(to right, transparent, ${referenceStyle.color || 'currentColor'})` }}
                />
            )}
            <span className="whitespace-nowrap font-bold uppercase tracking-widest" style={referenceStyle}>
                {getReferenceText()}
            </span>
            {settings.reference.style === 'classic' && (
                <div
                    className="h-px flex-1 opacity-50"
                    style={{ background: `linear-gradient(to right, ${referenceStyle.color || 'currentColor'}, transparent)` }}
                />
            )}
        </div>
    );

    // ─── Verse rendering ───────────────────────────────────────────────────────
    //
    // Handles \n\n paragraph breaks inside verse.text.
    // Each verse is split into paragraphs; the superscript sits before the
    // first paragraph of each verse.
    //
    const renderVerse = (verse: Verse, index: number) => {
        // Split on double newline (paragraph break)
        const paragraphs = verse.text.split(/\n\n+/);

        return (
            <div
                key={verse.id ?? index}
                className="text-center"
                // Space between verses scales with font size
                style={{ marginBottom: index < verses.length - 1 ? '0.5em' : 0 }}
            >
                {paragraphs.map((para, pIdx) => (
                    <div
                        key={pIdx}
                        className="leading-tight"
                        style={{ marginTop: pIdx > 0 ? '0.3em' : 0 }}
                    >
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => (
                                    <span className="inline">
                                        {pIdx === 0 && (
                                            <sup
                                                className="font-bold mr-[0.25em]"
                                                style={{
                                                    fontSize: '0.45em',
                                                    color: settings.font.color,
                                                    opacity: 0.55,
                                                    verticalAlign: 'super',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {verse.verseNumber}
                                            </sup>
                                        )}
                                        {processChildren(children, true)}
                                    </span>
                                ),
                                strong: ({ children }) => (
                                    <strong className="font-bold" style={{ color: settings.font.color }}>
                                        {processChildren(children, true)}
                                    </strong>
                                ),
                                em: ({ children }) => (
                                    <em className="italic opacity-80">
                                        {processChildren(children, true)}
                                    </em>
                                ),
                            }}
                        >
                            {para.trim()}
                        </ReactMarkdown>
                    </div>
                ))}
            </div>
        );
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className={cn('w-full h-full relative flex flex-col', className)}
            style={{
                paddingTop: `${settings.display.padding?.top ?? 48}px`,
                paddingBottom: `${settings.display.padding?.bottom ?? 48}px`,
                paddingLeft: `${settings.display.padding?.left ?? 64}px`,
                paddingRight: `${settings.display.padding?.right ?? 64}px`,
                gap: `${settings.display.referenceGap ?? 16}px`,
                borderRadius: settings.display.cornerRadius ? `${settings.display.cornerRadius}px` : undefined,
            }}
        >
            {settings.reference.position === 'top' && renderReference()}

            {/* Text container — fills remaining height */}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
            >
                <div
                    ref={contentRef}
                    className="w-full text-center"
                    style={{
                        fontSize: `${computedFontSize}rem`,
                        // Keep invisible during measurement to avoid flash,
                        // but keep in layout flow so dimensions are accurate
                        visibility: isReady ? 'visible' : 'hidden',
                        fontFamily: settings.font.family,
                        fontWeight: settings.font.weight,
                        color: settings.font.color,
                        // Overflow clip at min font size
                        overflow: isOverflowing ? 'hidden' : 'visible',
                    }}
                >
                    {verses.map(renderVerse)}
                </div>
            </div>

            {settings.reference.position !== 'top' && renderReference()}
        </div>
    );
};
