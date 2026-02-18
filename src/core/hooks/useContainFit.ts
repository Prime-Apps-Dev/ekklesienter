import { useState, useLayoutEffect, useRef, RefObject } from 'react';

interface ContainFitResult {
    /** Computed width in px, or `undefined` before first measurement */
    width: number | undefined;
    /** Computed height in px, or `undefined` before first measurement */
    height: number | undefined;
    /** Ref to attach to the parent container */
    containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Computes the largest width × height that fits within the parent container
 * while maintaining the given aspect ratio, with fixed pixel margins.
 *
 * Works like `object-fit: contain` but for regular DOM elements.
 * Returns `undefined` dimensions until the first measurement is ready.
 */
export function useContainFit(
    aspectRatio: number,
    margin: number = 24
): ContainFitResult {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number | undefined; height: number | undefined }>({
        width: undefined,
        height: undefined
    });

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const compute = () => {
            const style = window.getComputedStyle(el);
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

            const availW = el.clientWidth - paddingX - margin * 2;
            const availH = el.clientHeight - paddingY - margin * 2;

            if (availW <= 0 || availH <= 0) return;

            let w: number;
            let h: number;

            if (availW / availH > aspectRatio) {
                // Parent is wider than needed — height-constrained
                h = availH;
                w = h * aspectRatio;
            } else {
                // Parent is taller than needed — width-constrained
                w = availW;
                h = w / aspectRatio;
            }

            setDimensions({ width: Math.floor(w), height: Math.floor(h) });
        };

        compute();

        const observer = new ResizeObserver(() => compute());
        observer.observe(el);
        return () => observer.disconnect();
    }, [aspectRatio, margin]);

    return { ...dimensions, containerRef };
}
