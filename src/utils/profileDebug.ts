import {profileLogger} from './profiling/ProfileLogger';

type ProfileMeta = Record<string, unknown>;

export function isProfileDebugEnabled(): boolean {
    try {
        return localStorage.getItem('rs:profile') === '1';
    } catch {
        return false;
    }
}

export function profileDebug(scope: string, label: string, meta?: ProfileMeta): void {
    if (!profileLogger.isRecording) {
        return;
    }

    profileLogger.log(`${scope}.${label}`, meta);
    profileLogger.flushLatest(scope);
}
