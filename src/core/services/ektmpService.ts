import JSZip from 'jszip';
import { db } from '../db';
import { ITemplate, IStyleLayer, ICanvasItemText, ICanvasItemShape, ICanvasItemStroke, ICanvasItemEffect, IBackgroundEntry, ILogoEntry } from '../types';
import { ThumbnailService } from './ThumbnailService';
import { APP_VERSION, EKT_SCHEMA_VERSION } from '../constants';

/**
 * Helper to traverse all IStyleLayers in a template.
 * This looks through the main background, and any layout slides (backgroundOverride + canvasItem fills/strokes).
 */
const traverseTemplateLayers = (template: ITemplate, callback: (layer: IStyleLayer) => void) => {
    // 1. Main template background
    template.background.forEach(callback);

    // 2. Base template canvas items
    if (template.canvasItems) {
        template.canvasItems.forEach(item => {
            if (item.fills) item.fills.forEach(callback);
            if (item.strokes) item.strokes.forEach(callback);
            if (item.text && item.text.textFills) item.text.textFills.forEach(callback);
            if (item.text && item.text.textStrokes) item.text.textStrokes.forEach(callback);
        });
    }

    // 3. Template slide layouts
    if (template.templateSlides) {
        template.templateSlides.forEach(slide => {
            if (slide.backgroundOverride) {
                slide.backgroundOverride.forEach(callback);
            }
            if (slide.canvasItems) {
                slide.canvasItems.forEach(item => {
                    if (item.fills) item.fills.forEach(callback);
                    if (item.strokes) item.strokes.forEach(callback);
                    if (item.text && item.text.textFills) item.text.textFills.forEach(callback);
                    if (item.text && item.text.textStrokes) item.text.textStrokes.forEach(callback);
                });
            }
        });
    }
};

/**
 * Service for handling Ekklesia Template (.ektmp) files.
 * These are ZIP-compressed containers for a single Template and its embedded media.
 */
export const EktmpService = {
    /**
     * Packs a local template from IndexedDB into a .ektmp Blob.
     */
    async pack(templateId: string): Promise<Blob> {
        const template = await db.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        const zip = new JSZip();

        // Generate and add thumbnail
        const thumbBlob = await ThumbnailService.generateFromTemplate(templateId);
        if (thumbBlob) {
            zip.file('preview.png', thumbBlob);
        }

        const mediaFolder = zip.folder('media');

        // Deep clone template so we can mutate media URLs for the JSON payload
        const exportTemplate = JSON.parse(JSON.stringify(template)) as ITemplate;

        // Add versioning info
        (exportTemplate as any).version = EKT_SCHEMA_VERSION;
        (exportTemplate as any).engineVersion = APP_VERSION;

        // Collect all unique DB media IDs
        const mediaIdsToFetch = new Set<string>();

        traverseTemplateLayers(exportTemplate, (layer) => {
            if (layer.image?.isFromDb && layer.image.id) {
                mediaIdsToFetch.add(layer.image.id);
                // Update URL to point to internal ZIP path
                layer.image.url = `media/${layer.image.id}`;
            }
            if (layer.video?.isFromDb && layer.video.id) {
                mediaIdsToFetch.add(layer.video.id);
                // Update URL to point to internal ZIP path
                layer.video.url = `media/${layer.video.id}`;
            }
        });

        // Fetch Blobs for each ID and add to zip
        for (const mediaId of mediaIdsToFetch) {
            // It could be a background or a logo. We'll check both.
            let mediaObj: IBackgroundEntry | ILogoEntry | undefined = await db.backgrounds.get(mediaId);
            if (!mediaObj) {
                mediaObj = await db.logos.get(mediaId);
            }

            if (mediaObj && mediaFolder) {
                // Determine extension based on mimeType (rough mapping)
                let ext = 'bin';
                if (mediaObj.mimeType.includes('png')) ext = 'png';
                else if (mediaObj.mimeType.includes('jpeg') || mediaObj.mimeType.includes('jpg')) ext = 'jpg';
                else if (mediaObj.mimeType.includes('webp')) ext = 'webp';
                else if (mediaObj.mimeType.includes('mp4')) ext = 'mp4';
                else if (mediaObj.mimeType.includes('webm')) ext = 'webm';
                else if (mediaObj.mimeType.includes('svg')) ext = 'svg';

                // Save as id + ext
                const filename = `${mediaId}.${ext}`;
                mediaFolder.file(filename, mediaObj.data);

                // Now we need to update the references in exportTemplate 
                // to include this explicit extension
                traverseTemplateLayers(exportTemplate, (layer) => {
                    if (layer.image?.url === `media/${mediaId}`) {
                        layer.image.url = `media/${filename}`;
                    }
                    if (layer.video?.url === `media/${mediaId}`) {
                        layer.video.url = `media/${filename}`;
                    }
                });
            }
        }

        // 1. Add template JSON structure
        zip.file('manifest.json', JSON.stringify(exportTemplate, null, 2));

        // Generate blob
        return await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
    },

    /**
     * Unpacks a .ektmp Blob, inserts embedded media into DB, 
     * and returns the imported template data.
     */
    async unpack(blob: Blob, options?: { preserveId?: boolean; isUserCreated?: boolean }): Promise<ITemplate> {
        let zip;
        try {
            zip = await JSZip.loadAsync(blob);
        } catch (e) {
            throw new Error('Failed to read template: Not a valid ZIP archive');
        }

        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            throw new Error('Invalid .ektmp file: missing manifest.json');
        }

        let template: ITemplate;
        try {
            const manifestContent = await manifestFile.async('string');
            template = JSON.parse(manifestContent) as ITemplate;
        } catch (e) {
            throw new Error('Invalid .ektmp file: manifest.json is corrupt');
        }

        if (!template.id || !template.name || !Array.isArray(template.background)) {
            throw new Error('Invalid .ektmp file: missing core template data');
        }

        const mediaFolder = zip.folder('media');

        if (mediaFolder) {
            // Find all media files in the zip
            const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('media/') && name !== 'media/');

            for (const mediaPath of mediaFiles) {
                const fileObj = zip.file(mediaPath);
                if (!fileObj) continue;

                const mediaBlob = await fileObj.async('blob');
                const filename = mediaPath.split('/').pop() || 'unknown';

                // Determine mime type
                let mimeType = 'application/octet-stream';
                if (filename.endsWith('.png')) mimeType = 'image/png';
                else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (filename.endsWith('.webp')) mimeType = 'image/webp';
                else if (filename.endsWith('.mp4')) mimeType = 'video/mp4';
                else if (filename.endsWith('.webm')) mimeType = 'video/webm';
                else if (filename.endsWith('.svg')) mimeType = 'image/svg+xml';

                // Generate new ID so we don't clobber existing local media
                const newMediaId = `bg-${crypto.randomUUID()}`;

                await db.backgrounds.add({
                    id: newMediaId,
                    name: `Imported with ${template.name}`,
                    data: mediaBlob,
                    mimeType: mimeType
                });

                // Update references in the template
                traverseTemplateLayers(template, (layer) => {
                    if (layer.image?.url === mediaPath) {
                        layer.image.id = newMediaId;
                        layer.image.url = URL.createObjectURL(mediaBlob);
                        layer.image.isFromDb = true;
                        layer.image.source = 'local';
                    }
                    if (layer.video?.url === mediaPath) {
                        layer.video.id = newMediaId;
                        layer.video.url = URL.createObjectURL(mediaBlob);
                        layer.video.isFromDb = true;
                        layer.video.source = 'local';
                    }
                });
            }
        }

        // Clean up data for import
        return {
            ...template,
            id: options?.preserveId ? template.id : `imported-${crypto.randomUUID()}`,
            isUserCreated: options?.isUserCreated ?? true,
        };
    },

    /**
     * Synchronizes the templates in the filesystem with IndexedDB.
     */
    async syncFileSystemTemplates() {
        if (!window.electron?.templates) return;

        try {
            const files = await window.electron.templates.list();
            const existingTemplates = await db.templates.toArray();
            const existingIds = new Set(existingTemplates.map(t => t.id));

            for (const filename of files) {
                const buffer = await window.electron.templates.read(filename);
                if (!buffer) continue;

                const blob = new Blob([buffer as any], { type: 'application/octet-stream' });
                const templateData = await this.unpack(blob, { preserveId: true, isUserCreated: false });

                if (!existingIds.has(templateData.id)) {
                    await db.templates.add(templateData);
                    console.log(`Synced template from file: ${filename}`);
                }
            }
        } catch (error) {
            console.error('Failed to sync templates from filesystem:', error);
        }
    },

    /**
     * Saves a local template to the filesystem as an .ektmp file.
     */
    async saveAsEktmpFile(templateId: string) {
        if (!window.electron?.templates) return;

        try {
            const template = await db.templates.get(templateId);
            if (!template) return;

            const blob = await this.pack(templateId);
            const arrayBuffer = await blob.arrayBuffer();
            const filename = `${template.id}.ektmp`;

            await window.electron.templates.write(filename, new Uint8Array(arrayBuffer));
            console.log(`Saved template to filesystem: ${filename}`);
        } catch (error) {
            console.error('Failed to save template to filesystem:', error);
        }
    },

    /**
     * Deletes a template from the filesystem.
     */
    async deleteFromFilesystem(templateId: string) {
        if (!window.electron?.templates) return;

        try {
            const filename = `${templateId}.ektmp`;
            await window.electron.templates.delete(filename);
            console.log(`Deleted template from filesystem: ${filename}`);
        } catch (error) {
            console.error('Failed to delete template from filesystem:', error);
        }
    },

    /**
     * Deploys default templates to the filesystem if the folder is empty.
     */
    async bootstrapDefaults(defaultTemplates: ITemplate[]) {
        if (!window.electron?.templates) return;

        try {
            const files = await window.electron.templates.list();
            if (files.length === 0) {
                console.log('Templates directory is empty. Bootstrapping defaults...');
                for (const template of defaultTemplates) {
                    // We need to ensure the template is in DB first to 'pack' it,
                    // or we implement a 'packFromData' method.
                    // For now, assuming they might already be in DB or we just save them.
                    const existing = await db.templates.get(template.id);
                    if (!existing) {
                        await db.templates.add(template);
                    }
                    await this.saveAsEktmpFile(template.id);
                }
            }
        } catch (error) {
            console.error('Failed to bootstrap default templates:', error);
        }
    },

    /**
     * Trigger browser download of a .ektmp file
     */
    download(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.ektmp') ? filename : `${filename}.ektmp`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
