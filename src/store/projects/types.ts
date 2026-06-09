import {Action} from 'redux';
import {ProjectMeta} from '../../storage/projectTypes';
import {EProjectsAction} from './consts';

export interface ProjectsState {
    currentProjectId: string | null
    list: ProjectMeta[]
    isPanelOpen: boolean
    isSaving: boolean
    isLoading: boolean
    loadingMessageKey: string
    isDirty: boolean
    lastSavedAt: number | null
    initialized: boolean
}

export interface SetProjectsListAction extends Action {
    type: EProjectsAction.SET_LIST
    list: ProjectMeta[]
}

export interface SetCurrentProjectAction extends Action {
    type: EProjectsAction.SET_CURRENT
    projectId: string | null
}

export interface SetProjectsPanelOpenAction extends Action {
    type: EProjectsAction.SET_PANEL_OPEN
    open: boolean
}

export interface SetProjectsSavingAction extends Action {
    type: EProjectsAction.SET_SAVING
    saving: boolean
}

export interface SetProjectsLastSavedAction extends Action {
    type: EProjectsAction.SET_LAST_SAVED
    lastSavedAt: number
}

export interface RestoreSliceAction<T> extends Action {
    state: T
}
