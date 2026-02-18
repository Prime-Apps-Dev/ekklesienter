import JSZip from 'jszip';
import { db } from '../db';
import { IPresentationFile } from '../types';

/**
 * Service for handling Ekklesienter (.ekt) bundle files.
 * These are ZIP-compressed containers for presentation data and resources.
 */
export const EktService = {
    /**
     * Packs a local presentation from IndexedDB into a .ekt Blob.
     */
    async pack(presentationId: string): Promise<Blob> {
        const presentation = await db.presentationFiles.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation ${presentationId} not found`);
        }

        const zip = new JSZip();

        // 1. Add presentation structure
        zip.file('document.json', JSON.stringify(presentation, null, 2));

        // 2. Add media folder (placeholders for now, until we implement local media uploads)
        const mediaFolder = zip.folder('media');

        // 3. Add theme markers (placeholder for theme export)
        // zip.file('theme.json', JSON.stringify(currentThemeData, null, 2));

        // Generate blob
        return await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
    },

    /**
     * Unpacks a .ekt Blob and returns the presentation data.
     */
    async unpack(blob: Blob): Promise<Partial<IPresentationFile>> {
        const zip = await JSZip.loadAsync(blob);

        const docFile = zip.file('document.json');
        if (!docFile) {
            throw new Error('Invalid .ekt file: missing document.json');
        }

        const docContent = await docFile.async('string');
        const presentation = JSON.parse(docContent) as IPresentationFile;

        // TODO: Process media folder if exists
        // const mediaFolder = zip.folder('media');

        // Clean up data for import (generate new ID to avoid conflicts if needed, 
        // or return as is for overwrite/cloning)
        return {
            ...presentation,
            updatedAt: new Date()
        };
    },

    /**
     * Trigger browser download of a .ekt file
     */
    download(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.ekt') ? filename : `${filename}.ekt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
