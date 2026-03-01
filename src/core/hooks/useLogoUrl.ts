import { useState, useEffect } from 'react';
import { ILogo } from '../types';
import { db } from '../db';

/**
 * Hook to manage a logo's display URL, handling both static URLs
 * and Blobs stored in IndexedDB.
 */
export function useLogoUrl(logo: ILogo | null) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        let currentUrl: string | null = null;

        const loadLogo = async () => {
            if (!logo) {
                setLogoUrl(null);
                return;
            }

            if (logo.isFromDb) {
                try {
                    const entry = await db.logos.get(logo.id);
                    if (entry) {
                        const url = URL.createObjectURL(entry.data);
                        currentUrl = url;
                        setLogoUrl(url);
                        return;
                    }
                } catch (err) {
                    console.error('useLogoUrl: Failed to load from DB:', err);
                }
            }

            // Fallback to static URL
            setLogoUrl(logo.url || null);
        };

        loadLogo();

        return () => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [logo?.id, logo?.isFromDb, logo?.url]);

    return logoUrl;
}
