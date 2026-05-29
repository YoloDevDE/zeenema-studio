export {}

declare global {
    interface Window {
        zeenema?: {
            // Legacy auto-save
            loadData: () => Promise<AppData | null>
            saveData: (data: AppData) => Promise<void>
            // Project file operations
            newProject: () => Promise<null>
            openProject: () => Promise<unknown | null>
            saveProject: (data: unknown) => Promise<boolean>
            saveProjectAs: (data: unknown) => Promise<boolean>
            chooseDirectory: () => Promise<string | null>
            getDefaultProjectsDir: () => Promise<string>
            saveProjectToDir: (data: unknown, dirPath: string, fileName: string) => Promise<string | null>
        }
    }
}

export interface AppData {
    shots: unknown[]
    keyframes: Record<string, unknown[]>
}
