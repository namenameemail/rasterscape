import {profileDebug, isProfileDebugEnabled} from './profileDebug';
import {profileLogger} from './profiling/ProfileLogger';

type ProfileMeta = Record<string, unknown>;

export function isProjectProfileEnabled(): boolean {
    return isProfileDebugEnabled();
}

function ensureProjectProfiling(): boolean {
    return isProfileDebugEnabled() && profileLogger.isRecording;
}

function spanName(label: string): string {
    return `projects.${label}`;
}

function logMeta(label: string, meta?: ProfileMeta): void {
    if (meta) {
        profileLogger.log(`${spanName(label)}.meta`, meta);
    }
}

function flush(): void {
    profileLogger.flushLatest('projects');
}

export function profileAutosave(label: string, meta?: ProfileMeta): void {
    profileMark(`autosave.${label}`, meta);
}

export function profileAutosaveSync<T>(label: string, fn: () => T, meta?: ProfileMeta): T {
    return profileSync(`autosave.${label}`, fn, meta);
}

export async function profileAutosaveAsync<T>(
    label: string,
    fn: () => Promise<T>,
    meta?: ProfileMeta,
): Promise<T> {
    return profileAsync(`autosave.${label}`, fn, meta);
}

export function profileMark(label: string, meta?: ProfileMeta): void {
    profileDebug('projects', label, meta);
}

export function profileSync<T>(label: string, fn: () => T, meta?: ProfileMeta): T {
    if (!ensureProjectProfiling()) {
        return fn();
    }

    const result = profileLogger.time(spanName(label), fn);
    logMeta(label, meta);
    flush();
    return result;
}

export async function profileAsync<T>(
    label: string,
    fn: () => Promise<T>,
    meta?: ProfileMeta,
): Promise<T> {
    if (!ensureProjectProfiling()) {
        return fn();
    }

    const result = await profileLogger.timeAsync(spanName(label), fn);
    logMeta(label, meta);
    flush();
    return result;
}
