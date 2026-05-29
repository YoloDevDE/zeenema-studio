import {create} from 'zustand'

interface BlockPropertyJSON {
    i: number;
    u: string
    p: { x: number; y: number; z: number }
    r: { x: number; y: number; z: number }
    s: { x: number; y: number; z: number }
    d?: Record<string, string>
}

interface LevelState {
    blocks: BlockPropertyJSON[]
    levelName: string | null
    setLevel: (name: string, blocks: BlockPropertyJSON[]) => void
    clearLevel: () => void
}

export const useLevelStore = create<LevelState>((set) => ({
    blocks: [],
    levelName: null,
    setLevel: (name, blocks) => set({levelName: name, blocks}),
    clearLevel: () => set({levelName: null, blocks: []}),
}))
