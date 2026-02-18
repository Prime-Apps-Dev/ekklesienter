import { create } from 'zustand';

export enum ModalType {
    CUSTOMIZATION = 'CUSTOMIZATION',
}

interface ModalState {
    id: ModalType;
    props?: any;
}

interface ModalStore {
    stack: ModalState[];
    openModal: (id: ModalType, props?: any) => void;
    closeModal: (id?: ModalType) => void;
    isModalOpen: (id: ModalType) => boolean;
}

export const useModalStore = create<ModalStore>((set, get) => ({
    stack: [],

    openModal: (id, props) => {
        set((state) => ({
            stack: [...state.stack, { id, props }]
        }));
    },

    closeModal: (id) => {
        set((state) => {
            if (id) {
                return { stack: state.stack.filter((m) => m.id !== id) };
            }
            return { stack: state.stack.slice(0, -1) };
        });
    },

    isModalOpen: (id) => {
        return get().stack.some((m) => m.id === id);
    }
}));
