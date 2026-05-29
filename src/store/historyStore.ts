import {create} from 'zustand'

export interface Command {
    execute: () => void
    undo: () => void
    description?: string
}

interface HistoryState {
    past: Command[]
    future: Command[]
    canUndo: boolean
    canRedo: boolean
    execute: (command: Command) => void
    undo: () => void
    redo: () => void
    clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    execute: (command) => {
        command.execute()
        set((s) => {
            const past = [...s.past, command]
            return {past, future: [], canUndo: true, canRedo: false}
        })
    },

    undo: () => {
        const {past} = get()
        if (past.length === 0) return
        const command = past[past.length - 1]
        command.undo()
        set((s) => {
            const past = s.past.slice(0, -1)
            const future = [command, ...s.future]
            return {past, future, canUndo: past.length > 0, canRedo: true}
        })
    },

    redo: () => {
        const {future} = get()
        if (future.length === 0) return
        const command = future[0]
        command.execute()
        set((s) => {
            const future = s.future.slice(1)
            const past = [...s.past, command]
            return {past, future, canUndo: true, canRedo: future.length > 0}
        })
    },

    clear: () => set({past: [], future: [], canUndo: false, canRedo: false}),
}))
