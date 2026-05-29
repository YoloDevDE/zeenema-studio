import {create} from 'zustand'
import type {Project} from '@/types/protocol'
import {newProject} from '@/store/projectStore'

const STORAGE_KEY = 'zeenema_project_library'

export interface ProjectMeta {
    id: string
    name: string
    savePath?: string
    createdAt: string
    updatedAt: string
}

interface ProjectLibraryState {
    // null = overview screen, string = open project id
    openProjectId: string | null

    projects: ProjectMeta[]

    // Load library from localStorage
    loadLibrary: () => void

    // Save a project to localStorage (full data)
    saveProject: (project: Project) => void

    // Load a full project from localStorage
    loadProject: (id: string) => Project | null

    // Create a new project, save it, open it
    createProject: (name: string, savePath?: string) => Project

    // Open an existing project (just sets openProjectId)
    openProject: (id: string) => void

    // Close editor → back to overview
    closeProject: () => void

    // Delete a project
    deleteProject: (id: string) => void

    // Update meta (called after save)
    updateMeta: (project: Project) => void
}

function loadLibraryFromStorage(): ProjectMeta[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as ProjectMeta[]
    } catch {
        return []
    }
}

function saveLibraryToStorage(projects: ProjectMeta[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

function projectKey(id: string) {
    return `zeenema_project_${id}`
}

export const useProjectLibraryStore = create<ProjectLibraryState>((set, get) => ({
    openProjectId: null,
    projects: [],

    loadLibrary: () => {
        const projects = loadLibraryFromStorage()
        set({projects})
    },

    saveProject: (project) => {
        localStorage.setItem(projectKey(project.id), JSON.stringify(project))
        get().updateMeta(project)
    },

    loadProject: (id) => {
        try {
            const raw = localStorage.getItem(projectKey(id))
            if (!raw) return null
            return JSON.parse(raw) as Project
        } catch {
            return null
        }
    },

    createProject: (name, savePath) => {
        const project = newProject(name)
        localStorage.setItem(projectKey(project.id), JSON.stringify(project))
        const meta: ProjectMeta = {
            id: project.id,
            name: project.name,
            savePath,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        }
        const projects = [meta, ...get().projects]
        saveLibraryToStorage(projects)
        set({projects, openProjectId: project.id})
        return project
    },

    openProject: (id) => {
        set({openProjectId: id})
    },

    closeProject: () => {
        set({openProjectId: null})
    },

    deleteProject: (id) => {
        localStorage.removeItem(projectKey(id))
        const projects = get().projects.filter((p) => p.id !== id)
        saveLibraryToStorage(projects)
        set({projects})
    },

    updateMeta: (project) => {
        const meta: ProjectMeta = {
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        }
        const existing = get().projects
        const idx = existing.findIndex((p) => p.id === project.id)
        let projects: ProjectMeta[]
        if (idx >= 0) {
            projects = existing.map((p) => p.id === project.id ? meta : p)
        } else {
            projects = [meta, ...existing]
        }
        saveLibraryToStorage(projects)
        set({projects})
    },
}))
