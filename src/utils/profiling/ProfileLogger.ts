import {getProfileSet, matchesProfileSet, type ProfileSetId} from './profileSets'

export type ProfileSpanEntry = {
    type: 'span'
    name: string
    durationMs: number
    frame?: number
    ts: number
}

export type ProfileValueEntry = {
    type: 'value'
    name: string
    value: number
    frame?: number
    ts: number
}

export type ProfileLogEntry = {
    type: 'log'
    message: string
    data?: unknown
    ts: number
}

export type ProfileEntry = ProfileSpanEntry | ProfileValueEntry | ProfileLogEntry

export type ProfileSpanSummary = {
    count: number
    avgMs: number
    maxMs: number
    minMs: number
}

export type ProfileValueSummary = {
    count: number
    avg: number
    max: number
    min: number
}

export type ProfileSummary = {
    spans: Record<string, ProfileSpanSummary>
    values: Record<string, ProfileValueSummary>
    logCount: number
    entryCount: number
}

export type ProfileSession = {
    label: string
    startedAt: string
    stoppedAt: string
    entries: ProfileEntry[]
    summary: ProfileSummary
}

type ProfileLoggerListener = () => void

class ProfileLogger {
    isRecording = false

    private entries: ProfileEntry[] = []
    private startedAt: string | null = null
    private stoppedAt: string | null = null
    private sessionLabel: string | null = null
    private lastSummary: ProfileSummary | null = null
    private currentFrame = 0
    private listeners = new Set<ProfileLoggerListener>()
    private activeSet: ProfileSetId = getProfileSet()

    subscribe = (listener: ProfileLoggerListener): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getLastSummary = (): ProfileSummary | null => this.lastSummary

    getActiveSet = (): ProfileSetId => this.activeSet

    setActiveSet = (setId: ProfileSetId): void => {
        this.activeSet = setId
        this.notify()
    }

    startRecording = (label?: string): void => {
        this.activeSet = getProfileSet()
        this.entries = []
        this.startedAt = new Date().toISOString()
        this.stoppedAt = null
        this.sessionLabel = label ?? null
        this.lastSummary = null
        this.currentFrame = 0
        this.isRecording = true
        this.notify()
    }

    stopRecording = (): ProfileSummary => {
        this.isRecording = false
        this.stoppedAt = new Date().toISOString()
        this.lastSummary = this.buildSummary(this.entries)
        this.notify()
        return this.lastSummary
    }

    beginFrame = (): void => {
        if (!this.isRecording) {
            return
        }
        this.currentFrame += 1
    }

    getEntries = (): ProfileEntry[] => [...this.entries]

    private allows = (name: string): boolean => matchesProfileSet(name, this.activeSet)

    time = <T>(name: string, fn: () => T): T => {
        if (!this.isRecording || !this.allows(name)) {
            return fn()
        }

        const start = performance.now()
        try {
            return fn()
        } finally {
            this.pushSpan(name, performance.now() - start)
        }
    }

    timeAsync = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
        if (!this.isRecording || !this.allows(name)) {
            return fn()
        }

        const start = performance.now()
        try {
            return await fn()
        } finally {
            this.pushSpan(name, performance.now() - start)
        }
    }

    value = (name: string, value: number): void => {
        if (!this.isRecording || !this.allows(name)) {
            return
        }

        this.entries.push({
            type: 'value',
            name,
            value,
            frame: this.currentFrame || undefined,
            ts: performance.now(),
        })
    }

    log = (message: string, data?: unknown): void => {
        if (!this.isRecording || !this.allows(message)) {
            return
        }

        this.entries.push({
            type: 'log',
            message,
            data,
            ts: performance.now(),
        })
    }

    exportSession = (label?: string): ProfileSession => {
        const entries = this.getEntries()

        return {
            label: label ?? this.sessionLabel ?? 'session',
            startedAt: this.startedAt ?? new Date().toISOString(),
            stoppedAt: this.stoppedAt ?? new Date().toISOString(),
            entries,
            summary: this.buildSummary(entries),
        }
    }

    saveToProject = async (label?: string): Promise<{ path: string; sessionPath?: string }> => {
        const session = this.exportSession(label)

        if (import.meta.env.DEV) {
            return this.persistSession(label ?? this.sessionLabel ?? 'session', session)
        }

        this.downloadSession(session)
        return {path: `profile-${Date.now()}.json`}
    }

    /** Debounced write to profiling/latest.json while recording continues. */
    flushLatest = (label = 'live'): void => {
        if (!import.meta.env.DEV) {
            return
        }

        if (this.flushTimer !== null) {
            window.clearTimeout(this.flushTimer)
        }

        this.flushTimer = window.setTimeout(() => {
            this.flushTimer = null
            const session = this.exportSession(label)
            this.persistSession(label, session).catch(error => {
                console.warn('[profile] flushLatest failed', error)
            })
        }, 300)
    }

    private flushTimer: number | null = null

    private persistSession = async (
        label: string,
        session: ProfileSession,
    ): Promise<{ path: string; sessionPath?: string }> => {
        const response = await fetch('/__profiling/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({label, session}),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(text || `Save failed: ${response.status}`)
        }

        return response.json()
    }

    private pushSpan = (name: string, durationMs: number): void => {
        this.entries.push({
            type: 'span',
            name,
            durationMs,
            frame: this.currentFrame || undefined,
            ts: performance.now(),
        })
    }

    private buildSummary = (entries: ProfileEntry[]): ProfileSummary => {
        const spans: Record<string, ProfileSpanSummary> = {}
        const values: Record<string, ProfileValueSummary> = {}
        let logCount = 0

        for (const entry of entries) {
            if (entry.type === 'log') {
                logCount += 1
                continue
            }

            if (entry.type === 'span') {
                const current = spans[entry.name]

                if (!current) {
                    spans[entry.name] = {
                        count: 1,
                        avgMs: entry.durationMs,
                        maxMs: entry.durationMs,
                        minMs: entry.durationMs,
                    }
                    continue
                }

                const count = current.count + 1
                spans[entry.name] = {
                    count,
                    avgMs: current.avgMs + (entry.durationMs - current.avgMs) / count,
                    maxMs: Math.max(current.maxMs, entry.durationMs),
                    minMs: Math.min(current.minMs, entry.durationMs),
                }
                continue
            }

            const current = values[entry.name]

            if (!current) {
                values[entry.name] = {
                    count: 1,
                    avg: entry.value,
                    max: entry.value,
                    min: entry.value,
                }
                continue
            }

            const count = current.count + 1
            values[entry.name] = {
                count,
                avg: current.avg + (entry.value - current.avg) / count,
                max: Math.max(current.max, entry.value),
                min: Math.min(current.min, entry.value),
            }
        }

        return {
            spans,
            values,
            logCount,
            entryCount: entries.length,
        }
    }

    private downloadSession = (session: ProfileSession): void => {
        const blob = new Blob([JSON.stringify(session, null, 2)], {type: 'application/json'})
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `profile-${Date.now()}.json`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    private notify = (): void => {
        this.listeners.forEach(listener => listener())
    }
}

export const profileLogger = new ProfileLogger()
