import * as React from 'react'
import { connect, MapDispatchToProps, MapStateToProps } from 'react-redux'
import { AppState, patternsService } from '../../../../store'
import { setVideoFileLoopRange } from '../../../../store/patterns/video/actions'
import { getVideoState } from '../../../../store/patterns/video/helpers'
import './styles.scss'

export type VideoTimelineOwnProps = {
    patternId: string
    disabled?: boolean
}

type VideoTimelineStateProps = {
    loopIn: number
    loopOut: number
}

type VideoTimelineDispatchProps = {
    setLoopRange: (id: string, loopIn: number, loopOut: number) => void
}

type VideoTimelineProps = VideoTimelineOwnProps & VideoTimelineStateProps & VideoTimelineDispatchProps

type DragKind = 'playhead' | 'in' | 'out'

const formatTime = (sec: number): string => {
    if (!Number.isFinite(sec) || sec < 0) {
        return '0:00'
    }
    const s = Math.floor(sec)
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r < 10 ? '0' : ''}${r}`
}

const timeFromClientX = (el: HTMLElement, clientX: number, duration: number): number => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || duration <= 0) {
        return 0
    }
    const t = ((clientX - rect.left) / rect.width) * duration
    return Math.max(0, Math.min(duration, t))
}

const normFromClientX = (el: HTMLElement, clientX: number): number => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) {
        return 0
    }
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

const VideoTimelineComponent: React.FC<VideoTimelineProps> = ({
    patternId,
    disabled,
    loopIn,
    loopOut,
    setLoopRange,
}) => {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const drag = React.useRef<DragKind | null>(null)
    const pendingSeek = React.useRef<number | null>(null)
    const seekRaf = React.useRef(0)
    const [currentTime, setCurrentTime] = React.useState(0)
    const [duration, setDuration] = React.useState(0)
    const [localIn, setLocalIn] = React.useState<number | null>(null)
    const [localOut, setLocalOut] = React.useState<number | null>(null)

    const videoService = () => patternsService.pattern[patternId]?.videoService

    const viewIn = localIn ?? loopIn
    const viewOut = localOut ?? loopOut

    const flushSeek = React.useCallback(() => {
        seekRaf.current = 0
        const t = pendingSeek.current
        if (t == null) {
            return
        }
        pendingSeek.current = null
        videoService()?.setSourceFileCurrentTime(t)
    }, [patternId])

    const queueSeek = React.useCallback((time: number) => {
        pendingSeek.current = time
        setCurrentTime(time)
        if (!seekRaf.current) {
            seekRaf.current = requestAnimationFrame(flushSeek)
        }
    }, [flushSeek])

    const sync = React.useCallback(() => {
        const vs = videoService()
        if (!vs) {
            return
        }
        if (!drag.current) {
            setCurrentTime(vs.getSourceFileCurrentTime())
        }
        setDuration(vs.getSourceFileDuration())
    }, [patternId])

    React.useEffect(() => {
        let raf = 0
        const tick = () => {
            sync()
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(raf)
            if (seekRaf.current) {
                cancelAnimationFrame(seekRaf.current)
            }
        }
    }, [sync])

    React.useEffect(() => {
        if (drag.current === 'in' || drag.current === 'out') {
            return
        }
        videoService()?.setSourceFileLoopRange(loopIn, loopOut)
    }, [patternId, loopIn, loopOut])

    const onPointerDownTrack = (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || !trackRef.current || duration <= 0) {
            return
        }
        if ((e.target as HTMLElement).dataset.handle) {
            return
        }
        drag.current = 'playhead'
        trackRef.current.setPointerCapture(e.pointerId)
        queueSeek(timeFromClientX(trackRef.current, e.clientX, duration))
    }

    const onPointerDownHandle = (kind: 'in' | 'out') => (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || !trackRef.current) {
            return
        }
        e.stopPropagation()
        drag.current = kind
        setLocalIn(loopIn)
        setLocalOut(loopOut)
        trackRef.current.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current || !trackRef.current) {
            return
        }
        if (drag.current === 'playhead') {
            queueSeek(timeFromClientX(trackRef.current, e.clientX, duration))
            return
        }
        const n = normFromClientX(trackRef.current, e.clientX)
        if (drag.current === 'in') {
            const next = Math.min(n, viewOut - 0.01)
            setLocalIn(next)
            videoService()?.setSourceFileLoopRange(next, viewOut)
        } else {
            const next = Math.max(n, viewIn + 0.01)
            setLocalOut(next)
            videoService()?.setSourceFileLoopRange(viewIn, next)
        }
    }

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current) {
            return
        }
        const kind = drag.current
        drag.current = null
        if (trackRef.current?.hasPointerCapture(e.pointerId)) {
            trackRef.current.releasePointerCapture(e.pointerId)
        }
        if (kind === 'playhead') {
            flushSeek()
            return
        }
        const inN = localIn ?? loopIn
        const outN = localOut ?? loopOut
        setLocalIn(null)
        setLocalOut(null)
        setLoopRange(patternId, inN, outN)
    }

    const pct = duration > 0 ? (currentTime / duration) * 100 : 0
    const inPct = viewIn * 100
    const outPct = viewOut * 100

    return (
        <div className={`video-timeline${disabled ? ' video-timeline--disabled' : ''}`}>
            <span className="video-timeline-time">{formatTime(currentTime)}</span>
            <div
                ref={trackRef}
                className="video-timeline-track"
                onPointerDown={onPointerDownTrack}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div
                    className="video-timeline-range"
                    style={{ left: `${inPct}%`, width: `${Math.max(0, outPct - inPct)}%` }}
                />
                <div className="video-timeline-fill" style={{ width: `${pct}%` }} />
                <div
                    className="video-timeline-handle video-timeline-handle--in"
                    data-handle="in"
                    style={{ left: `${inPct}%` }}
                    onPointerDown={onPointerDownHandle('in')}
                >
                    {'{'}
                </div>
                <div
                    className="video-timeline-handle video-timeline-handle--out"
                    data-handle="out"
                    style={{ left: `${outPct}%` }}
                    onPointerDown={onPointerDownHandle('out')}
                >
                    {'}'}
                </div>
                <div className="video-timeline-thumb" style={{ left: `${pct}%` }} />
            </div>
            <span className="video-timeline-time">{formatTime(duration)}</span>
        </div>
    )
}

const mapStateToProps: MapStateToProps<VideoTimelineStateProps, VideoTimelineOwnProps, AppState> = (
    state,
    { patternId },
) => {
    const defaults = getVideoState().params
    const params = state.patterns[patternId]?.video?.params
    return {
        loopIn: typeof params?.fileLoopIn === 'number' ? params.fileLoopIn : defaults.fileLoopIn,
        loopOut: typeof params?.fileLoopOut === 'number' ? params.fileLoopOut : defaults.fileLoopOut,
    }
}

const mapDispatchToProps: MapDispatchToProps<VideoTimelineDispatchProps, VideoTimelineOwnProps> = {
    setLoopRange: setVideoFileLoopRange,
}

export const VideoTimeline = connect(mapStateToProps, mapDispatchToProps)(VideoTimelineComponent)
