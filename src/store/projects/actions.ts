import {AppState} from '../index';
import {
    createProjectId,
    deleteProject as deleteProjectFromDb,
    duplicateProject as duplicateProjectInDb,
    getProject,
    getProjectPayload,
    getStoredCurrentProjectId,
    listProjects,
    putProject,
    putProjectBuffer,
    setStoredCurrentProjectId,
} from '../../storage/projectsDb';
import {
    createEmptyProjectPayload,
    createExportFile,
    parseProjectExportFile,
} from '../../storage/projectSerializer';
import {serializeProjectToBuffer} from '../../storage/projectSerializeClient';
import {PROJECT_FILE_EXTENSION, ProjectMeta, resolveUniqueProjectName, stripProjectFileExtension} from '../../storage/projectTypes';
import {EProjectsAction} from './consts';
import {hydrateEditor} from './hydrateEditor';
import {
    cancelScheduledProjectAutosave,
    enableProjectAutosave,
    getDirtyGeneration,
    pauseProjectAutosave,
    resetDirtyGeneration,
    resumeProjectAutosave,
    scheduleAutosaveRetry,
} from '../../storage/projectAutosave';
import {profileAutosave, profileAutosaveAsync} from '../../utils/projectProfile';

let saveInFlight: Promise<void> | null = null;

const yieldToUi = () => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

const setProjectLoading = (loading: boolean, messageKey = 'projects.loading') => ({
    type: EProjectsAction.SET_LOADING,
    loading,
    messageKey,
});

const markProjectClean = (dispatch) => {
    resetDirtyGeneration();
    dispatch(setProjectDirty(false));
};

const runWithProjectLoader = (
    work: () => void | Promise<void>,
    messageKey = 'projects.loading',
) => async (dispatch) => {
    dispatch(setProjectLoading(true, messageKey));
    await yieldToUi();

    try {
        await work();
    } finally {
        dispatch(setProjectLoading(false));
    }
};

export const setProjectsList = (list: ProjectMeta[]) => ({
    type: EProjectsAction.SET_LIST,
    list,
});

export const setCurrentProject = (projectId: string | null) => ({
    type: EProjectsAction.SET_CURRENT,
    projectId,
});

export const setProjectDirty = (dirty: boolean) => ({
    type: EProjectsAction.SET_DIRTY,
    dirty,
});

export const setProjectsPanelOpen = (open: boolean) => ({
    type: EProjectsAction.SET_PANEL_OPEN,
    open,
});

export const saveCurrentProject = () => async (dispatch, getState: () => AppState) => {
    if (saveInFlight) {
        profileAutosave('waiting for in-flight save');
        await saveInFlight;
    }

    const {currentProjectId, list, isDirty} = getState().projects;

    if (!currentProjectId) {
        profileAutosave('skipped', {reason: 'no currentProjectId'});
        return;
    }

    if (!isDirty) {
        profileAutosave('skipped', {reason: 'clean', currentProjectId});
        return;
    }

    const meta = list.find(item => item.id === currentProjectId);
    const name = meta?.name || 'Project';
    const dirtyGenerationAtStart = getDirtyGeneration();

    profileAutosave('start', {currentProjectId, name, dirtyGenerationAtStart});
    dispatch({type: EProjectsAction.SET_SAVING, saving: true});

    saveInFlight = (async () => {
        try {
            const buffer = await profileAutosaveAsync('serialize', () => serializeProjectToBuffer(getState()), {
                currentProjectId,
                patternCount: Object.keys(getState().patterns).length,
            });
            const updated = await profileAutosaveAsync('idb put', () =>
                putProjectBuffer(currentProjectId, name, buffer),
            {
                currentProjectId,
                sizeBytes: buffer.byteLength,
            });

            const nextList = getState().projects.list.map(item =>
                item.id === updated.id ? updated : item
            );

            dispatch(setProjectsList(nextList));
            dispatch({type: EProjectsAction.SET_LAST_SAVED, lastSavedAt: updated.updatedAt});

            if (getState().projects.currentProjectId !== currentProjectId) {
                profileAutosave('success ignored', {reason: 'project switched', currentProjectId});
                return;
            }

            if (getDirtyGeneration() !== dirtyGenerationAtStart) {
                profileAutosave('success superseded', {
                    currentProjectId,
                    dirtyGenerationAtStart,
                    dirtyGenerationNow: getDirtyGeneration(),
                });
                scheduleAutosaveRetry(dispatch);
                return;
            }

            markProjectClean(dispatch);
            profileAutosave('success', {
                currentProjectId,
                sizeBytes: buffer.byteLength,
                updatedAt: updated.updatedAt,
                dirtyGenerationAtStart,
            });
        } catch (error) {
            profileAutosave('failed', {
                currentProjectId,
                error: error instanceof Error ? error.message : String(error),
            });
            console.error('[projects] save failed', error);
            scheduleAutosaveRetry(dispatch);
            throw error;
        } finally {
            dispatch({type: EProjectsAction.SET_SAVING, saving: false});
            saveInFlight = null;
        }
    })();

    await saveInFlight;
};

const saveBeforeSwitch = () => async (dispatch, getState: () => AppState) => {
    cancelScheduledProjectAutosave();

    if (!getState().projects.currentProjectId || !getState().projects.isDirty) {
        return;
    }

    try {
        await dispatch(saveCurrentProject());
    } catch (error) {
        console.error('[projects] save before switch failed', error);
    }
};

export const switchProject = (projectId: string) => async (dispatch, getState: () => AppState) => {
    const {currentProjectId} = getState().projects;

    if (currentProjectId === projectId) {
        return;
    }

    await dispatch(runWithProjectLoader(async () => {
        pauseProjectAutosave();

        try {
            await dispatch(saveBeforeSwitch());

            const payload = await getProjectPayload(projectId);
            if (!payload) {
                throw new Error('Project not found');
            }

            dispatch(hydrateEditor(payload));
            dispatch(setCurrentProject(projectId));
            markProjectClean(dispatch);
            setStoredCurrentProjectId(projectId);
            dispatch(setProjectsPanelOpen(false));
        } finally {
            resumeProjectAutosave();
        }
    }));
};

export const createProject = (name?: string) => async (dispatch, getState: () => AppState) => {
    await dispatch(runWithProjectLoader(async () => {
        pauseProjectAutosave();

        try {
            await dispatch(saveBeforeSwitch());

            const id = createProjectId();
            const projectName = name || `Project ${getState().projects.list.length + 1}`;
            const payload = createEmptyProjectPayload(getState());

            const meta = await putProject(id, projectName, payload);
            dispatch(hydrateEditor(payload));
            dispatch(setCurrentProject(id));
            markProjectClean(dispatch);
            setStoredCurrentProjectId(id);
            dispatch(setProjectsList([meta, ...getState().projects.list]));
            dispatch(setProjectsPanelOpen(false));
        } finally {
            resumeProjectAutosave();
        }
    }));
};

export const renameProject = (projectId: string, name: string) => async (dispatch, getState: () => AppState) => {
    const trimmed = name.trim();
    if (!trimmed) {
        return;
    }

    const record = await getProject(projectId);
    if (!record) {
        return;
    }

    const payload = await getProjectPayload(projectId);
    if (!payload) {
        return;
    }

    const meta = await putProject(projectId, trimmed, payload);

    dispatch(setProjectsList(getState().projects.list.map(item =>
        item.id === projectId ? meta : item
    )));
};

export const duplicateProject = (projectId: string) => async (dispatch, getState: () => AppState) => {
    const source = getState().projects.list.find(item => item.id === projectId);
    const newName = `${source?.name || 'Project'} copy`;
    const meta = await duplicateProjectInDb(projectId, newName);
    dispatch(setProjectsList([meta, ...getState().projects.list]));
};

export const deleteProject = (projectId: string) => async (dispatch, getState: () => AppState) => {
    const {currentProjectId, list} = getState().projects;

    await deleteProjectFromDb(projectId);
    const nextList = list.filter(item => item.id !== projectId);
    dispatch(setProjectsList(nextList));

    if (currentProjectId !== projectId) {
        return;
    }

    if (nextList.length) {
        await dispatch(switchProject(nextList[0].id));
    } else {
        await dispatch(createProject('Project 1'));
    }
};

export const exportProject = (projectId: string) => async (dispatch) => {
    await dispatch(runWithProjectLoader(async () => {
        const record = await getProject(projectId);
        if (!record) {
            return;
        }

        const payload = await getProjectPayload(projectId);
        if (!payload) {
            return;
        }

        const exportFile = createExportFile({
            id: record.id,
            name: record.name,
            updatedAt: record.updatedAt,
        }, payload);

        await yieldToUi();

        const blob = new Blob([JSON.stringify(exportFile, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${record.name}.${PROJECT_FILE_EXTENSION}`;
        link.click();
        URL.revokeObjectURL(url);
    }, 'projects.exporting'));
};

export const importProjectFromFile = (file: File) => async (dispatch, getState: () => AppState) => {
    const text = await file.text();
    const parsed = parseProjectExportFile(text);

    await dispatch(runWithProjectLoader(async () => {
        const id = createProjectId();
        const baseName = parsed.name?.trim() || stripProjectFileExtension(file.name) || 'Imported project';
        const importName = resolveUniqueProjectName(
            baseName,
            getState().projects.list.map(item => item.name),
        );
        const meta = await putProject(id, importName, parsed.payload);
        dispatch(setProjectsList([meta, ...getState().projects.list]));
    }));
};

export const initProjects = () => async (dispatch) => {
    const list = await listProjects();

    if (!list.length) {
        await dispatch(createProject('Project 1'));
        enableProjectAutosave(dispatch);
        return;
    }

    dispatch(setProjectLoading(true));
    await yieldToUi();

    try {
        dispatch(setProjectsList(list));

        const storedId = getStoredCurrentProjectId();
        const projectId = storedId && list.some(item => item.id === storedId)
            ? storedId
            : list[0].id;

        const payload = await getProjectPayload(projectId);
        if (payload) {
            dispatch(hydrateEditor(payload));
            dispatch(setCurrentProject(projectId));
            markProjectClean(dispatch);
            setStoredCurrentProjectId(projectId);
        }

        enableProjectAutosave(dispatch);
    } finally {
        dispatch(setProjectLoading(false));
    }
};

export const refreshProjectsList = () => async (dispatch) => {
    dispatch(setProjectsList(await listProjects()));
};
