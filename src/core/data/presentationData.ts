import { IBlock, ISection, IWorkflow, IWorkflowFolder, ITemplate } from '../types';

/**
 * Default slide blocks available in the library
 */
export const DEFAULT_BLOCKS: IBlock[] = [
    {
        id: 'default',
        name: 'Default',
        nameRu: 'По умолчанию',
        icon: 'Square',
        color: '#94A3B8',
        description: 'Empty blank slide',
        defaultSlides: 1
    },
    {
        id: 'idle',
        name: 'Idle / Welcome',
        nameRu: 'Приветствие / Ожидание',
        icon: 'Monitor',
        color: '#6B7280',
        description: 'Слайд до начала служения',
        defaultSlides: 1
    },
    {
        id: 'worship',
        name: 'Worship',
        nameRu: 'Поклонение',
        icon: 'Music',
        color: '#8B5CF6',
        description: 'Блок прославления',
        defaultSlides: 1
    },
    {
        id: 'offerings',
        name: 'Offerings & Tenth',
        nameRu: 'Пожертвования и десятина',
        icon: 'Coins',
        color: '#10B981',
        description: 'Информация о пожертвованиях',
        defaultSlides: 1
    },
    {
        id: 'sabbath-school',
        name: 'Sabbath School',
        nameRu: 'Субботняя школа',
        icon: 'BookOpen',
        color: '#F59E0B',
        description: 'Урок субботней школы',
        defaultSlides: 1
    },
    {
        id: 'kids-story',
        name: 'Kids Story',
        nameRu: 'Детская история',
        icon: 'Baby',
        color: '#EC4899',
        description: 'История для детей',
        defaultSlides: 1
    },
    {
        id: 'sermon',
        name: 'Sermon',
        nameRu: 'Проповедь',
        icon: 'Mic2',
        color: '#3B82F6',
        description: 'Основная проповедь',
        defaultSlides: 1
    },
    {
        id: 'announcement',
        name: 'Announcements',
        nameRu: 'Объявления',
        icon: 'Megaphone',
        color: '#EF4444',
        description: 'Церковные объявления',
        defaultSlides: 1
    },
    {
        id: 'bible',
        name: 'Bible',
        nameRu: 'Библия',
        icon: 'BookOpen',
        color: '#F59E0B',
        description: 'Стих из Библии',
        defaultSlides: 0 // Will open modal
    },
    {
        id: 'master-presentation',
        name: 'Master Presentation',
        nameRu: 'Мастер-презентация',
        icon: 'Layers',
        color: '#F97316',
        description: 'Вложенная презентация',
        defaultSlides: 0
    }
];


/**
 * Default sections (groups of blocks)
 */
export const PRESET_SECTIONS: ISection[] = [
    {
        id: 'section-worship',
        name: 'Worship Service',
        nameRu: 'Служение поклонения',
        blockIds: ['idle', 'worship', 'announcement']
    },
    {
        id: 'section-sabbath-school',
        name: 'Sabbath School',
        nameRu: 'Субботняя школа',
        blockIds: ['sabbath-school', 'kids-story']
    }
];

/**
 * Default folders for organizing workflows
 */
export const DEFAULT_FOLDERS: IWorkflowFolder[] = [
    {
        id: 'folder-sabbath',
        name: 'Sabbath Services',
        nameRu: 'Субботние служения'
    }
];

/**
 * Default workflows
 */
export const DEFAULT_WORKFLOWS: IWorkflow[] = [
    {
        id: 'workflow-standard',
        name: 'Standard Worship',
        nameRu: 'Стандартное поклонение',
        description: 'Standard service structure with worship and sermon',
        sectionIds: ['section-worship'],
        folderId: 'folder-sabbath'
    }
];

/**
 * Default slide templates per block category
 */
export const DEFAULT_TEMPLATES: ITemplate[] = [
    {
        id: 'blank-dark',
        name: 'Blank Slide',
        nameRu: 'Пустой слайд',
        category: 'idle',
        background: [{ id: 'blank-dark-bg', type: 'color', visible: true, opacity: 1, blendMode: 'normal', color: '#000000' }],
        assets: [],
        structure: { layout: 'blank' },
        isUserCreated: false,
    },
    {
        id: 'empty-slide',
        name: 'Empty Slide',
        nameRu: 'Пустой слайд',
        category: 'default',
        background: [{ id: 'empty-slide-bg', type: 'color', visible: true, opacity: 1, blendMode: 'normal', color: '#000000' }],
        assets: [],
        structure: { layout: 'blank' },
        canvasItems: [],
        isUserCreated: false,
    },
    {
        id: 'bible-default',
        name: 'Bible Default',
        nameRu: 'Библия по умолчанию',
        category: 'bible',
        background: [{ id: 'bible-default-bg', type: 'color', visible: true, opacity: 1, blendMode: 'normal', color: '#000000' }],
        assets: [],
        structure: { layout: 'center' }, // Center layout uses title/subtitle/content
        textStyle: {
            fontFamily: 'Inter',
            color: '#FFFFFF',
            contentColor: '#A8A29E',
            titleTransform: 'uppercase',
            titleWeight: '900',
        },
        canvasItems: [],
        isUserCreated: false,
    }
];
