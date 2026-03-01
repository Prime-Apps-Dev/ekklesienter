import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/core/utils/cn';

interface TrackContainerProps {
    children: React.ReactNode;
    className?: string;
}

export interface TrackContainerHandle {
    scrollToSlide: (slideId: string) => void;
    getScrollElement: () => HTMLDivElement | null;
}

/**
 * Synchronized horizontal scroll container for timeline tracks.
 * All tracks (slides, audio) share this container for aligned scrolling.
 */
const TrackContainer = forwardRef<TrackContainerHandle, TrackContainerProps>(
    ({ children, className }, ref) => {
        const scrollRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            scrollToSlide: (slideId: string) => {
                if (!scrollRef.current) return;
                const el = scrollRef.current.querySelector(`[data-slide-id="${slideId}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            },
            getScrollElement: () => scrollRef.current,
        }));

        return (
            <div
                ref={scrollRef}
                className={cn(
                    'flex-1 overflow-x-auto overflow-y-hidden no-scrollbar flex flex-col items-start relative',
                    className
                )}
            >
                {children}
            </div>
        );
    }
);

TrackContainer.displayName = 'TrackContainer';

export default React.memo(TrackContainer);
