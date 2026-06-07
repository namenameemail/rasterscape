import * as React from 'react'
import {performanceSettings} from '../../../config/performanceSettings'
import {
    coordHelper,
    coordHelper2,
    coordHelper3,
    coordHelper4,
    coordHelper5,
    TextHelper,
} from '../canvasPosition.servise'
import {profileLogger, ProfileSummary} from '../../../utils/profiling/ProfileLogger'
import './debugOverlay.scss'

const frameHelpers: {helper: TextHelper; label: string}[] = [
    {helper: coordHelper, label: '1'},
    {helper: coordHelper2, label: '2'},
    {helper: coordHelper3, label: '3'},
    {helper: coordHelper4, label: '4'},
    {helper: coordHelper5, label: '5'},
]

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
    const rowRefs = React.useRef<(HTMLDivElement | null)[]>([])

    React.useEffect(() => {
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

    if (!performanceSettings.debugOverlay) {
        return null
    }

    return (
        <div className="debug-overlay">
            <div className="debug-overlay__title">Debug</div>

            {frameHelpers.map(({label}, index) => (
                <div
                    key={label}
                    className="debug-overlay__row"
                    ref={element => {
                        rowRefs.current[index] = element
                    }}
                >
                    <span className="debug-overlay__label">{label}:</span>
                    <div className="debug-overlay__value"/>
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
    )
}
