import JSZip from 'jszip';
import { db } from '../db';
import { IPresentationFile, ISlide, IStyleLayer } from '../types';
import { ThumbnailService } from './ThumbnailService';
import { APP_VERSION, EKT_SCHEMA_VERSION } from '../constants';

/**
 * Service for handling Presentation Bundle (.ektp) files with media support.
 */
export const EktpService = {
    /**
     * Collects all media IDs referenced in a presentation.
     */
    async getMediaIds(presentation: IPresentationFile): Promise<Set<string>> {
        const ids = new Set<string>();

        const collectFromLayers = (layers: IStyleLayer[]) => {
            for (const layer of layers) {
                if (layer.image?.id && layer.image.isFromDb) {
                    ids.add(layer.image.id);
                }
                if (layer.video?.id && layer.video.isFromDb) {
                    ids.add(layer.video.id);
                }
            }
        };

        for (const slide of presentation.slides) {
            // Background overrides
            if (slide.backgroundOverride) {
                collectFromLayers(slide.backgroundOverride);
            }

            // Canvas items (fills and strokes)
            if (slide.content.canvasItems) {
                for (const item of slide.content.canvasItems) {
                    if (item.fills) collectFromLayers(item.fills);
                    if (item.strokes) collectFromLayers(item.strokes);
                }
            }

            // Audio scopes
            if (slide.audioScopes) {
                for (const scope of slide.audioScopes) {
                    if (scope.fileId) ids.add(scope.fileId);
                }
            }

            // Timer playlist
            if (slide.timerSettings?.playlist) {
                for (const mid of slide.timerSettings.playlist) {
                    ids.add(mid);
                }
            }
        }

        return ids;
    },

    async pack(presentationId: string): Promise<Blob> {
        const presentation = await db.presentationFiles.get(presentationId);
        if (!presentation) {
            throw new Error(`Presentation ${presentationId} not found`);
        }

        const zip = new JSZip();

        // Generate and add thumbnail
        const thumbnailBlob = await ThumbnailService.generate(presentationId);
        if (thumbnailBlob) {
            zip.file('preview.png', thumbnailBlob);
            presentation.hasPreview = true;
        }

        // Add versioning info
        presentation.version = EKT_SCHEMA_VERSION;
        presentation.engineVersion = APP_VERSION;

        // Remove fileHandle and thumbnailUrl before saving to ZIP
        const { fileHandle, thumbnailUrl, ...manifest } = presentation;
        zip.file('presentation.json', JSON.stringify(manifest, null, 2));

        const mediaFolder = zip.folder('media');
        if (mediaFolder) {
            const mediaIds = await this.getMediaIds(presentation);
            for (const id of mediaIds) {
                // Check backgrounds, logos, and mediaPool
                const bg = await db.backgrounds.get(id);
                if (bg) {
                    mediaFolder.file(id, bg.data, { compression: 'STORE' });
                    continue;
                }

                const logo = await db.logos.get(id);
                if (logo) {
                    mediaFolder.file(id, logo.data, { compression: 'STORE' });
                    continue;
                }

                // If it's in mediaPool, we might need to handle it differently depending on how it's stored
                // For now, these are the primary blob stores.
            }
        }

        return await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
    },

    async save(presentationId: string): Promise<void> {
        const presentation = await db.presentationFiles.get(presentationId);
        if (!presentation || !presentation.fileHandle) return;

        try {
            const options = { mode: 'readwrite' };
            if (await (presentation.fileHandle as any).queryPermission(options) !== 'granted') {
                if (await (presentation.fileHandle as any).requestPermission(options) !== 'granted') {
                    throw new Error('Permission to write to file denied');
                }
            }

            const blob = await this.pack(presentationId);
            const writable = await (presentation.fileHandle as any).createWritable();
            await writable.write(blob);
            await writable.close();

            // Also update the thumbnailUrl in DB for immediate UI feedback
            const thumbnailBlob = await ThumbnailService.generate(presentationId);
            let thumbnailUrl = presentation.thumbnailUrl;
            if (thumbnailBlob) {
                const reader = new FileReader();
                thumbnailUrl = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(thumbnailBlob);
                });
            }

            await db.presentationFiles.update(presentationId, {
                updatedAt: new Date(),
                thumbnailUrl
            });
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    },

    async unpack(blob: Blob | File): Promise<IPresentationFile> {
        let zip;
        try {
            zip = await JSZip.loadAsync(blob);
        } catch (e) {
            throw new Error('Failed to read file: Not a valid ZIP archive');
        }

        const docFile = zip.file('presentation.json') || zip.file('document.json');
        if (!docFile) {
            throw new Error('Invalid .ektp file: missing presentation.json');
        }

        let presentation: IPresentationFile;
        try {
            const content = await docFile.async('string');
            presentation = JSON.parse(content) as IPresentationFile;
        } catch (e) {
            throw new Error('Invalid .ektp file: presentation.json is corrupt');
        }

        if (!presentation.id || !Array.isArray(presentation.slides)) {
            throw new Error('Invalid .ektp file: missing core presentation data');
        }

        if ('name' in blob && (blob as any).handle) {
            presentation.fileHandle = (blob as any).handle;
        }

        // Restore preview if exists
        const previewFile = zip.file('preview.png');
        if (previewFile) {
            const previewBlob = await previewFile.async('blob');
            // Convert to base64 for storage in IDB
            const reader = new FileReader();
            presentation.thumbnailUrl = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(previewBlob);
            });
            presentation.hasPreview = true;
        }

        // Restore media
        const mediaFolder = zip.folder('media');
        if (mediaFolder) {
            const mediaFiles = Object.keys(zip.files).filter(path => path.startsWith('media/') && !zip.files[path].dir);
            for (const path of mediaFiles) {
                const id = path.split('/').pop()!;
                const data = await zip.file(path)!.async('blob');

                // Determine if it was a background or logo (simplistic check for now)
                // We'll restore to backgrounds as a safe default for now
                const exists = await db.backgrounds.get(id) || await db.logos.get(id);
                if (!exists) {
                    await db.backgrounds.add({
                        id,
                        name: `Imported Media (${id})`,
                        data,
                        mimeType: data.type
                    });
                }
            }
        }

        return presentation;
    },

    download(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.ektp') ? filename : `${filename}.ektp`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
