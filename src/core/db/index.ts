import Dexie, { type EntityTable } from 'dexie';
import { Verse, Book, Translation, IBlock, ISection, IWorkflow, IWorkflowFolder, IPresentationFile, IServiceFile, ITemplate, ILogoEntry, IBackgroundEntry, IMediaItem } from '../types';
import { INITIAL_DATA } from '../data/bibleData';
import { DEFAULT_BLOCKS, PRESET_SECTIONS, DEFAULT_FOLDERS, DEFAULT_WORKFLOWS, DEFAULT_TEMPLATES } from '../data/presentationData';

interface Setting {
    key: string;
    value: unknown;
}

const DB_NAME = 'ScripturePresenterDB';

// NOTE: If you get schema errors, clear IndexedDB in browser DevTools
// Application > Storage > IndexedDB > Delete "ScripturePresenterDB"

export class ScriptureDatabase extends Dexie {
    verses!: EntityTable<Verse, 'id'>;
    books!: EntityTable<Book, 'id'>;
    settings!: EntityTable<Setting, 'key'>;
    translations!: EntityTable<Translation, 'id'>;

    // Presentation tables
    blocks!: EntityTable<IBlock, 'id'>;
    sections!: EntityTable<ISection, 'id'>;
    workflows!: EntityTable<IWorkflow, 'id'>;
    workflowFolders!: EntityTable<IWorkflowFolder, 'id'>;
    presentationFiles!: EntityTable<IPresentationFile, 'id'>;
    serviceFiles!: EntityTable<IServiceFile, 'id'>;
    templates!: EntityTable<ITemplate, 'id'>;
    logos!: EntityTable<ILogoEntry, 'id'>;
    backgrounds!: EntityTable<IBackgroundEntry, 'id'>;
    mediaPool!: EntityTable<IMediaItem, 'id'>;

    constructor() {
        super(DB_NAME);

        // Schema v1: Multi-translation support from the start
        this.version(1).stores({
            verses: '++id, [translationId+bookId+chapter], translationId',
            books: '++id, [translationId+bookId], translationId',
            translations: 'id',
            settings: 'key'
        });

        // Schema v2: Presentation Slide System
        this.version(2).stores({
            blocks: 'id',
            sections: 'id',
            workflows: 'id',
            presentationFiles: 'id, updatedAt',
            templates: 'id, category'
        });

        // Schema v3: Workflow Folders
        this.version(3).stores({
            workflowFolders: 'id, parentId',
            workflows: 'id, folderId'
        });

        // Schema v4: Added workflowId index to presentationFiles
        this.version(4).stores({
            presentationFiles: 'id, updatedAt, workflowId'
        });

        // Schema v5: Added logos table for robust persistence
        this.version(5).stores({
            logos: 'id'
        });

        // Schema v6: Added backgrounds table for custom media persistence
        this.version(6).stores({
            backgrounds: 'id'
        });

        // Schema v7: Add 4 premium prebuilt templates for existing users
        this.version(7).stores({}).upgrade(async tx => {
            const templates = tx.table('templates');
            const PREMIUM_IDS = [
                'prebuilt-royal-aurora',
                'prebuilt-midnight-ember',
                'prebuilt-ocean-breeze',
                'prebuilt-golden-dusk',
            ];
            const premiumTemplates = DEFAULT_TEMPLATES.filter(t => PREMIUM_IDS.includes(t.id));
            for (const tmpl of premiumTemplates) {
                const exists = await templates.get(tmpl.id);
                if (!exists) {
                    await templates.add(tmpl);
                }
            }
        });


        // Schema v9: Re-seed templates with 'blank' layout update
        this.version(9).stores({}).upgrade(async tx => {
            const templates = tx.table('templates');
            await templates.filter(t => t.isUserCreated === false).delete();
            for (const tmpl of DEFAULT_TEMPLATES) {
                await templates.add(tmpl);
            }
        });

        // Schema v10: Add lastOpened index for sorting recents
        this.version(10).stores({
            presentationFiles: 'id, updatedAt, workflowId, lastOpened'
        });

        // Schema v11: Seed 'default' block and 'empty-slide' template
        this.version(11).stores({}).upgrade(async tx => {
            const blocks = tx.table('blocks');
            const templates = tx.table('templates');

            const hasDefaultBlock = await blocks.get('default');
            if (!hasDefaultBlock) {
                const defaultBlock = DEFAULT_BLOCKS.find(b => b.id === 'default');
                if (defaultBlock) await blocks.add(defaultBlock);
            }

            const hasEmptyTemplate = await templates.get('empty-slide');
            if (!hasEmptyTemplate) {
                const emptyTemplate = DEFAULT_TEMPLATES.find(t => t.id === 'empty-slide');
                if (emptyTemplate) await templates.add(emptyTemplate);
            }
        });

        // Schema v12: Media Pool support
        this.version(12).stores({
            mediaPool: 'id, type, createdAt'
        });

        // Schema v13: Added serviceFiles table
        this.version(13).stores({
            serviceFiles: 'id, lastOpened, updatedAt',
            presentationFiles: 'id, updatedAt, workflowId, lastOpened, serviceId'
        });

        // Schema v14: Seed 'bible-default' template
        this.version(14).stores({}).upgrade(async tx => {
            const templates = tx.table('templates');
            const hasBibleTemplate = await templates.get('bible-default');
            if (!hasBibleTemplate) {
                const bibleTemplate = DEFAULT_TEMPLATES.find(t => t.id === 'bible-default');
                if (bibleTemplate) await templates.add(bibleTemplate);
            }
        });

        this.on('populate', () => {
            this.seed();
        });
    }

    async seed() {
        const count = await this.translations.count();
        if (count === 0) {
            await this.transaction('rw', [this.verses, this.books, this.translations, this.blocks, this.sections, this.workflows, this.workflowFolders, this.templates, this.mediaPool], async () => {
                await this.translations.add(INITIAL_DATA.translation);
                await this.books.bulkAdd(INITIAL_DATA.books);
                await this.verses.bulkAdd(INITIAL_DATA.verses);

                // Initialize presentation data
                await this.blocks.bulkAdd(DEFAULT_BLOCKS);
                await this.sections.bulkAdd(PRESET_SECTIONS);
                await this.workflowFolders.bulkAdd(DEFAULT_FOLDERS);
                await this.workflows.bulkAdd(DEFAULT_WORKFLOWS);
                await this.templates.bulkAdd(DEFAULT_TEMPLATES);
            });
            console.log("Database seeded with initial data including presentation presets");
        }
    }
}

export const db = new ScriptureDatabase();
