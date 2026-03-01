import JSZip from 'jszip';
import { db } from '../db';
import { IPresentationFile, IServiceFile } from '../types';
import { EktpService } from './ektpService';
import { ThumbnailService } from './ThumbnailService';
import { APP_VERSION, EKT_SCHEMA_VERSION } from '../constants';

/**
 * Service for handling Service Workflow Bundle (.ekt) files with media support.
 */
export const EktService = {
    async pack(serviceId: string): Promise<Blob> {
        const service = await db.serviceFiles.get(serviceId);
        if (!service) throw new Error(`Service ${serviceId} not found`);

        const zip = new JSZip();

        // 1. Service Manifest (Remove fileHandle before saving to ZIP)
        service.version = EKT_SCHEMA_VERSION;
        service.engineVersion = APP_VERSION;
        const { fileHandle, ...serviceManifest } = service;
        zip.file('manifest.json', JSON.stringify(serviceManifest, null, 2));

        // 2. Presentations
        const presFolder = zip.folder('presentations');
        const allMediaIds = new Set<string>();

        if (presFolder) {
            for (const id of service.presentationIds) {
                const pres = await db.presentationFiles.get(id);
                if (pres) {
                    const filename = pres.id === service.masterPresentationId ? 'master.json' : `${pres.id}.json`;

                    // Generate and add thumbnail for each presentation
                    const thumbBlob = await ThumbnailService.generate(pres.id);
                    if (thumbBlob) {
                        zip.file(`previews/${pres.id}.png`, thumbBlob);
                        pres.hasPreview = true;

                        // If it's the master presentation, also set as service preview
                        if (pres.id === service.masterPresentationId) {
                            zip.file('preview.png', thumbBlob);
                        }
                    }

                    // Add versioning info to each presentation
                    pres.version = EKT_SCHEMA_VERSION;
                    pres.engineVersion = APP_VERSION;

                    // Remove fileHandle and thumbnailUrl from presentation manifest
                    const { fileHandle: h, thumbnailUrl: t, ...presManifest } = pres;
                    presFolder.file(filename, JSON.stringify(presManifest, null, 2));

                    // Collect media IDs for shared pool
                    const presMediaIds = await EktpService.getMediaIds(pres);
                    presMediaIds.forEach(mid => allMediaIds.add(mid));
                }
            }
        }

        // 3. Shared Media Pool (Optimized with STORE compression)
        const mediaFolder = zip.folder('media');
        if (mediaFolder) {
            for (const id of allMediaIds) {
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
            }
        }

        return await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 } // Balanced level for non-media files
        });
    },

    async save(serviceId: string): Promise<void> {
        const service = await db.serviceFiles.get(serviceId);
        if (!service || !service.fileHandle) return;

        try {
            // Verify permission
            const options = { mode: 'readwrite' };
            if (await (service.fileHandle as any).queryPermission(options) !== 'granted') {
                if (await (service.fileHandle as any).requestPermission(options) !== 'granted') {
                    throw new Error('Permission to write to file denied');
                }
            }

            const blob = await this.pack(serviceId);
            const writable = await (service.fileHandle as any).createWritable();
            await writable.write(blob);
            await writable.close();

            // Refresh thumbnails for all nested presentations in DB
            for (const id of service.presentationIds) {
                const thumbBlob = await ThumbnailService.generate(id);
                if (thumbBlob) {
                    const reader = new FileReader();
                    const thumbnailUrl = await new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(thumbBlob);
                    });
                    await db.presentationFiles.update(id, { thumbnailUrl });
                }
            }

            // Update last saved time
            await db.serviceFiles.update(serviceId, { updatedAt: new Date() });
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    },

    async unpack(blob: Blob | File): Promise<{ service: IServiceFile, presentations: IPresentationFile[] }> {
        let zip;
        try {
            zip = await JSZip.loadAsync(blob);
        } catch (e) {
            throw new Error('Failed to read file: Not a valid ZIP archive');
        }

        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) throw new Error('Invalid .ekt file: missing manifest.json');

        let service: IServiceFile;
        try {
            const manifestContent = await manifestFile.async('string');
            service = JSON.parse(manifestContent) as IServiceFile;
        } catch (e) {
            throw new Error('Invalid .ekt file: manifest.json is corrupt');
        }

        if (!service.id || !Array.isArray(service.presentationIds)) {
            throw new Error('Invalid .ekt file: missing core service manifest data');
        }

        // If the blob is a File (from input[type=file] or File System API), we might want to store it
        if ('name' in blob && (blob as any).handle) {
            service.fileHandle = (blob as any).handle;
        }

        const presentations: IPresentationFile[] = [];
        const presFolder = zip.folder('presentations');
        if (presFolder) {
            const files = Object.keys(zip.files).filter(path => path.startsWith('presentations/') && path.endsWith('.json'));
            for (const path of files) {
                const content = await zip.file(path)?.async('string');
                if (content) {
                    const pres = JSON.parse(content) as IPresentationFile;

                    // Check for accompanying preview in previews/ folder
                    const previewFile = zip.file(`previews/${pres.id}.png`) || (pres.id === service.masterPresentationId ? zip.file('preview.png') : null);
                    if (previewFile) {
                        const previewBlob = await previewFile.async('blob');
                        const reader = new FileReader();
                        pres.thumbnailUrl = await new Promise((resolve) => {
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(previewBlob);
                        });
                        pres.hasPreview = true;
                    }

                    presentations.push(pres);
                }
            }
        }

        // Restore shared media
        const mediaFolder = zip.folder('media');
        if (mediaFolder) {
            const mediaFiles = Object.keys(zip.files).filter(path => path.startsWith('media/') && !zip.files[path].dir);
            for (const path of mediaFiles) {
                const id = path.split('/').pop()!;
                const data = await zip.file(path)!.async('blob');

                const exists = await db.backgrounds.get(id) || await db.logos.get(id);
                if (!exists) {
                    await db.backgrounds.add({
                        id,
                        name: `Imported Service Media (${id})`,
                        data,
                        mimeType: data.type
                    });
                }
            }
        }

        return { service, presentations };
    },

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
