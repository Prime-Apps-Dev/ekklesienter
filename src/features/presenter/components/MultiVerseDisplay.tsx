import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { Verse } from '@/core/types';
import { getBookName } from '@/core/data/bookData';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';
import { usePresenterStore } from '@/core/store/presenterStore';
import { PresenterSettings } from '@/core/types';
import { SlideBackground } from './SlideBackground';
import ReactMarkdown from 'react-markdown';
import { processChildren } from '@/core/utils/markdownUtils';

interface MultiVerseDisplayProps {
    verses: Verse[];
    settings?: PresenterSettings;
    showReference?: boolean;
    autoFit?: boolean;
    className?: string;
}

const TEXT_INNER_PADDING = 32;

export const MultiVerseDisplay: React.FC<MultiVerseDisplayProps> = ({
    verses,
    showReference = true,
    autoFit = true,
    className,
    settings: propsSettings,
}) => {
    const { settings: storeSettings } = usePresenterStore();
    const settings = propsSettings || storeSettings;
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const referenceRef = useRef<HTMLDivElement>(null);

    const [computedFontSize, setComputedFontSize] = useState(2);
    const [isReady, setIsReady] = useState(!autoFit);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const { i18n, t } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';

    // Grouping references
    const getReferenceText = () => {
        if (verses.length === 0) return '';
        const first = verses[0];
        const last = verses[verses.length - 1];
        const bookName = getBookName(first.bookId, lang);

        if (first.bookId === last.bookId) {
            if (first.chapter === last.chapter) {
                if (first.verseNumber === last.verseNumber) {
                    return `${bookName} ${first.chapter}:${first.verseNumber}`;
                }
                return `${bookName} ${first.chapter}:${first.verseNumber}–${last.verseNumber}`;
            }
            return `${bookName} ${first.chapter}:${first.verseNumber} – ${last.chapter}:${last.verseNumber}`;
        }
        const lastBookName = getBookName(last.bookId, lang);
        return `${bookName} ${first.chapter}:${first.verseNumber} | ${lastBookName} ${last.chapter}:${last.verseNumber}`;
    };

    const calculateFit = useCallback(() => {
        if (!autoFit || !containerRef.current || !contentRef.current) return;

        const container = containerRef.current;
        const content = contentRef.current;

        const availableHeight = container.clientHeight - TEXT_INNER_PADDING * 2 - 1;
        const availableWidth = container.clientWidth - TEXT_INNER_PADDING * 2;

        if (availableHeight <= 0 || availableWidth <= 0) return;

        setIsReady(false);
        setIsOverflowing(false);

        const prevMaxWidth = content.style.maxWidth;
        const prevOverflow = container.style.overflow;
        content.style.maxWidth = `${availableWidth}px`;
        container.style.overflow = 'visible';

        let lo = 0.8; // Minimum font size as requested
        let hi = 40;  // Matches VerseDisplay.tsx
        const PRECISION = 0.05;

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

        // Check if even the minimum size fits
        content.style.fontSize = `0.8rem`;
        const rectAtMin = content.getBoundingClientRect();
        if (rectAtMin.height > availableHeight || rectAtMin.width > availableWidth) {
            setIsOverflowing(true);
        }

        // Restore original styles
        content.style.maxWidth = prevMaxWidth;
        container.style.overflow = prevOverflow;

        setComputedFontSize(lo);
        setIsReady(true);
    }, [autoFit, showReference, settings.reference.position, settings.display.referenceGap]); // Added dependencies for reference height calculation

    useLayoutEffect(() => {
        if (autoFit) calculateFit();
    }, [verses, autoFit, calculateFit, settings.font, settings.reference]);

    useEffect(() => {
        if (!autoFit || !containerRef.current) return;
        const ro = new ResizeObserver(() => calculateFit());
        ro.observe(containerRef.current);
        if (referenceRef.current) ro.observe(referenceRef.current);
        return () => ro.disconnect();
    }, [autoFit, calculateFit]);

    const referenceStyle = {
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
                settings.reference.style === 'classic' ? 'w-full justify-between gap-[1em]' : 'w-auto gap-[0.5em]'
            )}
            style={{ visibility: showReference ? 'visible' : 'hidden' }}
        >
            {settings.reference.style === 'classic' && (
                <div className="h-px flex-1 opacity-50" style={{ background: `linear-gradient(to right, transparent, ${referenceStyle.color || 'currentColor'})` }} />
            )}
            <span className="whitespace-nowrap font-bold uppercase tracking-widest" style={referenceStyle}>
                {getReferenceText()}
            </span>
            {settings.reference.style === 'classic' && (
                <div className="h-px flex-1 opacity-50" style={{ background: `linear-gradient(to right, ${referenceStyle.color || 'currentColor'}, transparent)` }} />
            )}
        </div>
    );

    return (
        <div className={cn('w-full h-full relative overflow-hidden', className)}>
            <SlideBackground settings={settings} />

            <div
                className="relative z-10 w-full h-full flex flex-col"
                style={{
                    paddingTop: `${Math.max(24, settings.display.padding?.top ?? 48)}px`,
                    paddingBottom: `${Math.max(24, settings.display.padding?.bottom ?? 48)}px`,
                    paddingLeft: `${Math.max(32, settings.display.padding?.left ?? 64)}px`,
                    paddingRight: `${Math.max(32, settings.display.padding?.right ?? 64)}px`,
                    gap: `${settings.display.referenceGap ?? 16}px`,
                }}
            >
                {settings.reference.position === 'top' && renderReference()}

                <div ref={containerRef} className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden relative">
                    <div
                        ref={contentRef}
                        className="max-w-full"
                        style={{
                            fontSize: `${computedFontSize}rem`,
                            opacity: isReady ? 1 : 0,
                            fontFamily: settings.font.family,
                            fontWeight: settings.font.weight,
                            color: settings.font.color,
                        }}
                    >
                        <div className="space-y-[0.5em] text-center">
                            {verses.map((verse, index) => {
                                return (
                                    <div key={verse.id || index} className="relative leading-tight text-center">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => (
                                                    <span className="inline-block text-center">
                                                        <sup className="text-accent/60 font-bold text-[0.45em] mr-[0.3em] align-top relative top-[0.4em]">
                                                            {verse.verseNumber}
                                                        </sup>
                                                        {processChildren(children, true)}
                                                    </span>
                                                ),
                                                strong: ({ children }) => (
                                                    <span className="text-accent/80 font-semibold">
                                                        {processChildren(children, true)}
                                                    </span>
                                                ),
                                                em: ({ children }) => (
                                                    <span className="opacity-80 italic">
                                                        {processChildren(children, true)}
                                                    </span>
                                                ),
                                            }}
                                        >
                                            {verse.text}
                                        </ReactMarkdown>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isOverflowing && (
                        <div className="absolute bottom-0 right-0 p-2 text-red-500 animate-pulse">
                            <span className="text-xs font-bold uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Content Overflow</span>
                        </div>
                    )}
                </div>

                {settings.reference.position === 'bottom' && renderReference()}
            </div>
        </div>
    );
};
