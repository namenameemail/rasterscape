import {Middleware} from 'redux';
import {AppState} from '../store';
import {saveCurrentProject, setProjectDirty} from '../store/projects/actions';
import {EVideoAction} from '../store/patterns/video/consts';
import {profileAutosave} from '../utils/projectProfile';

const AUTOSAVE_DELAY_MS = 1500;
const AUTOSAVE_RETRY_DELAY_MS = 3000;

const ignoredExact = new Set([
    'change',
    'changing/start',
]);

const ignoredPrefixes = [
    'projects/',
    '@@redux',
    'position/',
    'hotkeys/',
    'language/',
    'fullScreen/',
    'tutorial/',
    'optimization/',
    'rooms/',
    'active-pattern/delete-hold',
    'patterns/replace-all',
];

let debounceTimer: number | null = null;
let retryTimer: number | null = null;
let autosaveEnabled = false;
let autosavePaused = false;
let readAppState: (() => AppState) | null = null;
let dirtyGeneration = 0;

export function getDirtyGeneration(): number {
    return dirtyGeneration;
}

export function resetDirtyGeneration(): void {
    dirtyGeneration = 0;
}

function shouldIgnoreAction(type: string): boolean {
    if (ignoredExact.has(type)) {
        return true;
    }

    return ignoredPrefixes.some(prefix => type.startsWith(prefix));
}

function isAnyVideoUpdating(state: AppState | null | undefined): boolean {
    if (!state?.patterns) {
        return false;
    }

    return Object.values(state.patterns).some(pattern => pattern?.video?.params?.updatingOn);
}

function autosaveSnapshot(state: AppState | null | undefined) {
    if (!state) {
        return {};
    }

    return {
        currentProjectId: state.projects.currentProjectId,
        isDirty: state.projects.isDirty,
        isSaving: state.projects.isSaving,
        isPaused: autosavePaused,
        enabled: autosaveEnabled,
        debouncePending: debounceTimer !== null,
        retryPending: retryTimer !== null,
        videoUpdating: isAnyVideoUpdating(state),
    };
}

export function cancelScheduledProjectAutosave(): void {
    if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
        profileAutosave('debounce cancelled');
    }

    if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
        profileAutosave('retry cancelled');
    }
}

export function pauseProjectAutosave(): void {
    autosavePaused = true;
    cancelScheduledProjectAutosave();
    profileAutosave('paused', autosaveSnapshot(readAppState?.()));
}

export function resumeProjectAutosave(): void {
    autosavePaused = false;
    profileAutosave('resumed', autosaveSnapshot(readAppState?.()));
}

function runAutosaveDispatch(dispatch, source: 'debounce' | 'retry') {
    const state = readAppState?.();

    if (isAnyVideoUpdating(state)) {
        profileAutosave(`${source} deferred video`, autosaveSnapshot(state));
        return;
    }

    profileAutosave(`${source} fired`, autosaveSnapshot(state));

    Promise.resolve(dispatch(saveCurrentProject()))
        .then(() => {
            profileAutosave(`${source} settled`, autosaveSnapshot(readAppState?.()));
        })
        .catch((error: unknown) => {
            profileAutosave(`${source} rejected`, {
                ...autosaveSnapshot(readAppState?.()),
                error: error instanceof Error ? error.message : String(error),
            });
            scheduleAutosaveRetry(dispatch);
        });
}

function scheduleAutosave(dispatch) {
    if (!autosaveEnabled || autosavePaused) {
        profileAutosave('debounce skipped', {
            enabled: autosaveEnabled,
            paused: autosavePaused,
        });
        return;
    }

    if (isAnyVideoUpdating(readAppState?.())) {
        cancelScheduledProjectAutosave();
        profileAutosave('debounce deferred video', autosaveSnapshot(readAppState?.()));
        return;
    }

    if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        runAutosaveDispatch(dispatch, 'debounce');
    }, AUTOSAVE_DELAY_MS);

    profileAutosave('debounce scheduled', {
        delayMs: AUTOSAVE_DELAY_MS,
        ...autosaveSnapshot(readAppState?.()),
    });
}

export function scheduleAutosaveRetry(dispatch): void {
    if (!autosaveEnabled || autosavePaused) {
        return;
    }

    const state = readAppState?.();
    if (!state?.projects.isDirty) {
        profileAutosave('retry skipped', {reason: 'clean'});
        return;
    }

    if (isAnyVideoUpdating(state)) {
        profileAutosave('retry deferred video', autosaveSnapshot(state));
        return;
    }

    if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
    }

    retryTimer = window.setTimeout(() => {
        retryTimer = null;
        runAutosaveDispatch(dispatch, 'retry');
    }, AUTOSAVE_RETRY_DELAY_MS);

    profileAutosave('retry scheduled', {
        delayMs: AUTOSAVE_RETRY_DELAY_MS,
        ...autosaveSnapshot(state),
    });
}

export const projectAutosaveMiddleware: Middleware = (store) => {
    readAppState = () => store.getState() as AppState;

    return (next) => (action) => {
        const result = next(action);

        if (
            !autosaveEnabled
            || autosavePaused
            || !action?.type
            || shouldIgnoreAction(action.type)
        ) {
            return result;
        }

        const state = store.getState() as AppState;
        const wasDirty = state.projects.isDirty;

        dirtyGeneration += 1;

        if (!wasDirty) {
            store.dispatch(setProjectDirty(true));
            profileAutosave('marked dirty', {
                action: action.type,
                dirtyGeneration,
                ...autosaveSnapshot(store.getState() as AppState),
            });
        } else {
            profileAutosave('still dirty', {action: action.type, dirtyGeneration});
        }

        if (action.type === EVideoAction.START_UPDATING || isAnyVideoUpdating(state)) {
            cancelScheduledProjectAutosave();
            profileAutosave('deferred while video', {
                action: action.type,
                dirtyGeneration,
                ...autosaveSnapshot(store.getState() as AppState),
            });
            return result;
        }

        scheduleAutosave(store.dispatch);
        return result;
    };
};

export function enableProjectAutosave(dispatch): void {
    autosaveEnabled = true;
    profileAutosave('enabled', autosaveSnapshot(readAppState?.()));

    window.addEventListener('beforeunload', () => {
        profileAutosave('beforeunload save');
        dispatch(saveCurrentProject());
    });
}

export function disableProjectAutosave(): void {
    autosaveEnabled = false;
    cancelScheduledProjectAutosave();
    profileAutosave('disabled');
}
