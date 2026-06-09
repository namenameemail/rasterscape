import {handleActions} from 'redux-actions';
import {ProjectsState} from './types';
import {EProjectsAction} from './consts';

export const projectsReducer = handleActions<ProjectsState>({
    [EProjectsAction.SET_LIST]: (state, action: any) => ({
        ...state,
        list: action.list,
    }),
    [EProjectsAction.SET_CURRENT]: (state, action: any) => ({
        ...state,
        currentProjectId: action.projectId,
    }),
    [EProjectsAction.SET_PANEL_OPEN]: (state, action: any) => ({
        ...state,
        isPanelOpen: action.open,
    }),
    [EProjectsAction.SET_SAVING]: (state, action: any) => ({
        ...state,
        isSaving: action.saving,
    }),
    [EProjectsAction.SET_LOADING]: (state, action: any) => ({
        ...state,
        isLoading: action.loading,
        loadingMessageKey: action.loading ? (action.messageKey ?? 'projects.loading') : 'projects.loading',
    }),
    [EProjectsAction.SET_DIRTY]: (state, action: any) => ({
        ...state,
        isDirty: action.dirty,
    }),
    [EProjectsAction.SET_LAST_SAVED]: (state, action: any) => ({
        ...state,
        lastSavedAt: action.lastSavedAt,
    }),
}, {
    currentProjectId: null,
    list: [],
    isPanelOpen: false,
    isSaving: false,
    isLoading: false,
    loadingMessageKey: 'projects.loading',
    isDirty: false,
    lastSavedAt: null,
    initialized: false,
});
