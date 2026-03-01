import { scan } from 'react-scan';
import { useEffect } from 'react';

/**
 * PerformanceMonitor Component
 * Integrates react-scan for visual render tracking.
 * Only initializes in development or if explicitly enabled.
 */
export const PerformanceMonitor = () => {
    useEffect(() => {
        if (import.meta.env.DEV) {
            scan({
                enabled: false, // Turn off outlines by default
                showToolbar: true, // Keep the widget available
                showFPS: true, // Show FPS in the toolbar
                log: true, // Log renders to console
            });
        }
    }, []);

    return null;
};
