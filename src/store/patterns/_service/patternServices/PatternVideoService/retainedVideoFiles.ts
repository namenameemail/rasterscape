const retained = new Map<string, File>()

export const retainVideoFile = (patternId: string, file: File | null): void => {
    if (!file) {
        retained.delete(patternId)
        return
    }
    retained.set(patternId, file)
}

export const getRetainedVideoFile = (patternId: string): File | null =>
    retained.get(patternId) ?? null
