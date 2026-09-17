import { create } from 'zustand';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
}

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
}

interface DialogState {
  queue: DialogRequest[];
  enqueue: (dialog: Omit<DialogRequest, 'id'>) => number;
  dismiss: (id: number) => void;
  reset: () => void;
}

let nextDialogId = 0;

/**
 * Queue of in-app dialogs rendered by `components/DialogHost`. Only the web build
 * fills it: native platforms keep using the OS alert. See `lib/dialog.ts`.
 */
export const useDialogStore = create<DialogState>((set) => ({
  queue: [],

  enqueue: (dialog) => {
    const id = ++nextDialogId;
    set((state) => ({ queue: [...state.queue, { ...dialog, id }] }));
    return id;
  },

  dismiss: (id) => set((state) => ({ queue: state.queue.filter((dialog) => dialog.id !== id) })),

  reset: () => set({ queue: [] }),
}));
