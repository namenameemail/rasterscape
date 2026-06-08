import * as React from 'react'
import { performanceSettings } from '../../../config/performanceSettings'
import {
    coordHelper,
    coordHelper2,
    coordHelper3,
    coordHelper4,
    coordHelper5,
    TextHelper,
} from '../canvasPosition.servise'
import { profileLogger, ProfileSummary } from '../../../utils/profiling/ProfileLogger'
import './debugOverlay.scss'

const frameHelpers: { helper: TextHelper; label: string }[] = [
    { helper: coordHelper, label: '1' },
    { helper: coordHelper2, label: '2' },
    { helper: coordHelper3, label: '3' },
    { helper: coordHelper4, label: '4' },
    { helper: coordHelper5, label: '5' },
]

type DebugOverlayPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

type DebugOverlayPreferences = {
    position: DebugOverlayPosition
    isCollapsed: boolean
}

const STORAGE_KEY = 'debug-overlay'

const POSITION_ORDER: DebugOverlayPosition[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']

const DEFAULT_PREFERENCES: DebugOverlayPreferences = {
    position: 'bottom-right',
    isCollapsed: false,
}

const isDebugOverlayPosition = (value: unknown): value is DebugOverlayPosition => (
    typeof value === 'string' && POSITION_ORDER.includes(value as DebugOverlayPosition)
)

const readStoredPreferences = (): DebugOverlayPreferences => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)

        if (!raw) {
            return DEFAULT_PREFERENCES
        }

        const parsed = JSON.parse(raw) as Partial<DebugOverlayPreferences>

        return {
            position: isDebugOverlayPosition(parsed.position) ? parsed.position : DEFAULT_PREFERENCES.position,
            isCollapsed: typeof parsed.isCollapsed === 'boolean' ? parsed.isCollapsed : DEFAULT_PREFERENCES.isCollapsed,
        }
    } catch {
        return DEFAULT_PREFERENCES
    }
}

const writeStoredPreferences = (preferences: DebugOverlayPreferences) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
        // ignore quota / private mode errors
    }
}

const POSITION_LABELS: Record<DebugOverlayPosition, string> = {
    'bottom-right': '↘',
    'bottom-left': '↙',
    'top-left': '↖',
    'top-right': '↗',
}

const formatSummary = (summary: ProfileSummary | null): string => {
    if (!summary) {
        return ''
    }

    const spanLines = Object.entries(summary.spans)
        .slice(0, 5)
        .map(([name, stats]) => `${name}: avg ${stats.avgMs.toFixed(1)}ms, max ${stats.maxMs.toFixed(1)}ms`)

    return [
        `entries: ${summary.entryCount}`,
        ...spanLines,
    ].join('\n')
}

export const DebugOverlay: React.FC = () => {
    const [isRecording, setIsRecording] = React.useState(profileLogger.isRecording)
    const [status, setStatus] = React.useState('idle')
    const [summaryText, setSummaryText] = React.useState('')
    const [isCollapsed, setIsCollapsed] = React.useState(() => readStoredPreferences().isCollapsed)
    const [position, setPosition] = React.useState<DebugOverlayPosition>(() => readStoredPreferences().position)
    const rowRefs = React.useRef<(HTMLDivElement | null)[]>([])

    React.useEffect(() => {
        writeStoredPreferences({ position, isCollapsed })
    }, [position, isCollapsed])

    React.useLayoutEffect(() => {
        rowRefs.current.forEach((row, index) => {
            const helper = frameHelpers[index]?.helper
            const slot = row?.querySelector('.debug-overlay__value')

            if (slot && helper) {
                helper.attachToPanel(slot as HTMLElement)
            }
        })
    }, [])

    React.useEffect(() => profileLogger.subscribe(() => {
        setIsRecording(profileLogger.isRecording)
    }), [])

    const handleStart = () => {
        profileLogger.startRecording()
        setStatus('recording')
        setSummaryText('')
    }

    const handleStop = () => {
        const summary = profileLogger.stopRecording()
        setStatus('stopped')
        setSummaryText(formatSummary(summary))
    }

    const handleSave = async () => {
        setStatus('saving...')

        try {
            const result = await profileLogger.saveToProject()
            setStatus(`saved → ${result.path}`)
        } catch (error) {
            setStatus(`save error: ${String(error)}`)
        }
    }

    const handleTogglePosition = () => {
        const currentIndex = POSITION_ORDER.indexOf(position)
        const nextIndex = (currentIndex + 1) % POSITION_ORDER.length
        setPosition(POSITION_ORDER[nextIndex])
    }

    if (!performanceSettings.debugOverlay) {
        return null
    }

    const overlayClassName = [
        'debug-overlay',
        `debug-overlay--${position}`,
        isCollapsed ? 'debug-overlay--collapsed' : '',
    ].filter(Boolean).join(' ')

    return (
        <div className={overlayClassName}>
            <div className="debug-overlay__header">
                <div className="debug-overlay__title">
                    Debug
                    {isCollapsed && isRecording ? <span className="debug-overlay__recording-dot"> ●</span> : null}
                </div>
                <div className="debug-overlay__header-actions">
                    <button
                        type="button"
                        className="debug-overlay__icon-button"
                        title="Переключить позицию"
                        onClick={handleTogglePosition}
                    >
                        {POSITION_LABELS[position]}
                    </button>
                    <button
                        type="button"
                        className="debug-overlay__icon-button"
                        title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                        onClick={() => setIsCollapsed(value => !value)}
                    >
                        {isCollapsed ? '▸' : '▾'}
                    </button>
                </div>
            </div>

            <div className="debug-overlay__body">
                {frameHelpers.map(({ label }, index) => (
                    <div
                        key={label}
                        className="debug-overlay__row"
                        ref={element => {
                            rowRefs.current[index] = element
                        }}
                    >
                        <span className="debug-overlay__label">{label}:</span>
                        <div className="debug-overlay__value" />
                    </div>
                ))}

                <div className="debug-overlay__controls">
                    <button
                        type="button"
                        className={`debug-overlay__button${isRecording ? ' debug-overlay__button--active' : ''}`}
                        disabled={isRecording}
                        onClick={handleStart}
                    >
                        Rec
                    </button>
                    <button
                        type="button"
                        className="debug-overlay__button"
                        disabled={!isRecording}
                        onClick={handleStop}
                    >
                        Stop
                    </button>
                    <button
                        type="button"
                        className="debug-overlay__button"
                        disabled={isRecording}
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>

                <div className="debug-overlay__status">
                    {isRecording ? '● recording' : `○ ${status}`}
                    {summaryText ? `\n${summaryText}` : ''}
                </div>
            </div>
        </div>
    )
}
