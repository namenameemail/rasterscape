export type ProfileSetId = 'frame' | 'save' | 'all'

const STORAGE_KEY = 'rs:profile:set'

const FRAME_PREFIXES = [
    'video.',
    'canvas.',
    'draw.',
    'values.',
    'platformer.',
    'frame.',
]

const SAVE_PREFIXES = [
    'projects.',
]

const SAVE_EXACT = new Set([
    'canvas.downloadGpu',
])

export const PROFILE_SET_IDS: ProfileSetId[] = ['frame', 'save', 'all']

export const PROFILE_SET_LABELS: Record<ProfileSetId, string> = {
    frame: 'Frame',
    save: 'Save',
    all: 'All',
}

const isProfileSetId = (value: string | null): value is ProfileSetId =>
    value === 'frame' || value === 'save' || value === 'all'

export function getProfileSet(): ProfileSetId {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (isProfileSetId(raw)) {
            return raw
        }
    } catch {
        // ignore
    }

    return 'save'
}

export function setProfileSet(setId: ProfileSetId): void {
    try {
        localStorage.setItem(STORAGE_KEY, setId)
    } catch {
        // ignore
    }
}

export function matchesProfileSet(name: string, setId: ProfileSetId = getProfileSet()): boolean {
    if (setId === 'all') {
        return true
    }

    if (setId === 'save') {
        return SAVE_EXACT.has(name) || SAVE_PREFIXES.some(prefix => name.startsWith(prefix))
    }

    return FRAME_PREFIXES.some(prefix => name.startsWith(prefix))
}
