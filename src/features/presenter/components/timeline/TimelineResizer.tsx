import React, { useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { timelineHeightAtom } from '@/core/store/uiAtoms';
import { GripHorizontal } from 'lucide-react';

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 500;

const TimelineResizer: React.FC = () => {
    const [, setHeight] = useAtom(timelineHeightAtom);
    const startY = useRef(0);
    const startH = useRef(0);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);

        const container = e.currentTarget.closest('[data-timeline-root]');
        startH.current = container ? container.getBoundingClientRect().height : 160;
        startY.current = e.clientY;

        const onPointerMove = (ev: PointerEvent) => {
            const delta = startY.current - ev.clientY; // dragging up = positive delta = taller
            const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH.current + delta));
            setHeight(newH);
        };

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }, [setHeight]);

    return (
        <div
            onPointerDown={onPointerDown}
            className="absolute -top-2 left-0 right-0 h-4 z-50 cursor-ns-resize flex items-center justify-center group touch-none"
        >
            {/* Visible grip handle */}
            <div className="w-12 h-1 rounded-full bg-white/10 group-hover:bg-accent/40 group-active:bg-accent/60 transition-colors flex items-center justify-center">
                <GripHorizontal className="w-3 h-3 text-white/20 group-hover:text-accent/60 transition-colors" />
            </div>
        </div>
    );
};

export default React.memo(TimelineResizer);
