import { IBlock, ISection, IWorkflow, IWorkflowFolder } from '../types';

/**
 * Default slide blocks available in the library
 */
export const DEFAULT_BLOCKS: IBlock[] = [
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
        id: 'custom',
        name: 'Custom',
        nameRu: 'Произвольный блок',
        icon: 'Plus',
        color: '#6366F1',
        description: 'Создать свой блок',
        defaultSlides: 1
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
