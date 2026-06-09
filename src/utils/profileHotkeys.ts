import {profileDebug} from './profileDebug';

type ProfileMeta = Record<string, unknown>;

export function profileHotkeyAltP(label: string, meta?: ProfileMeta): void {
    profileDebug('hotkeys', `alt+p.${label}`, meta);
}
