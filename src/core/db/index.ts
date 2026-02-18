import Dexie, { type EntityTable } from 'dexie';
import { Verse, Book, Translation, IBlock, ISection, IWorkflow, IWorkflowFolder, IPresentationFile, ITemplate } from '../types';
import { INITIAL_DATA } from '../data/bibleData';
import { DEFAULT_BLOCKS, PRESET_SECTIONS, DEFAULT_FOLDERS, DEFAULT_WORKFLOWS } from '../data/presentationData';

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
    templates!: EntityTable<ITemplate, 'id'>;

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

        this.on('populate', () => {
            this.seed();
        });
    }

    async seed() {
        const count = await this.translations.count();
        if (count === 0) {
            await this.transaction('rw', [this.verses, this.books, this.translations, this.blocks, this.sections, this.workflows, this.workflowFolders], async () => {
                await this.translations.add(INITIAL_DATA.translation);
                await this.books.bulkAdd(INITIAL_DATA.books);
                await this.verses.bulkAdd(INITIAL_DATA.verses);

                // Initialize presentation data
                await this.blocks.bulkAdd(DEFAULT_BLOCKS);
                await this.sections.bulkAdd(PRESET_SECTIONS);
                await this.workflowFolders.bulkAdd(DEFAULT_FOLDERS);
                await this.workflows.bulkAdd(DEFAULT_WORKFLOWS);
            });
            console.log("Database seeded with initial data including presentation presets");
        }
    }
}

export const db = new ScriptureDatabase();
