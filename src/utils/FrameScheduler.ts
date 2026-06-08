import { coordHelper, coordHelper2, coordHelper3 } from '../components/Area/canvasPosition.servise'
import { profileLogger } from './profiling/ProfileLogger'

export enum FramePriority {
    Video = 0,
    Draw = 1,
    Changing = 2,
}

type FrameSubscriber = {
    callback: (time: number) => void
    priority: FramePriority
}

class FrameScheduler {
    private subscribers = new Map<string, FrameSubscriber>()
    private sortedSubscribers: FrameSubscriber[] | null = null
    private rafId: number | null = null
    private prevTime = 0
    private minTime = 1000
    private maxTime = 0

    subscribe = (
        id: string,
        callback: (time: number) => void,
        priority: FramePriority,
    ): (() => void) => {
        this.subscribers.set(id, { callback, priority })
        this.sortedSubscribers = null
        this.ensureRunning()
        return () => this.unsubscribe(id)
    }

    unsubscribe = (id: string): void => {
        this.subscribers.delete(id)
        this.sortedSubscribers = null

        if (this.subscribers.size === 0) {
            this.stopLoop()
        }
    }

    private ensureRunning = (): void => {
        if (this.rafId != null || this.subscribers.size === 0) {
            return
        }

        this.prevTime = 0
        this.minTime = 1000
        this.maxTime = 0
        this.rafId = requestAnimationFrame(this.tick)
    }

    private stopLoop = (): void => {
        if (this.rafId != null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
    }

    private getSortedSubscribers = (): FrameSubscriber[] => {
        if (this.sortedSubscribers) {
            return this.sortedSubscribers
        }

        this.sortedSubscribers = [...this.subscribers.entries()]
            .sort(([idA, a], [idB, b]) => a.priority - b.priority || idA.localeCompare(idB))
            .map(([, subscriber]) => subscriber)

        return this.sortedSubscribers
    }

    private tick = (time: number): void => {
        const interval = time - this.prevTime
        this.minTime = Math.min(this.minTime, interval)

        if (this.prevTime) {
            this.maxTime = Math.max(this.maxTime, interval)
            profileLogger.value('frame.interval', interval)
        }

        coordHelper.setText(interval.toFixed(1))
        coordHelper2.setText(this.minTime.toFixed(1))
        coordHelper3.setText(this.maxTime.toFixed(1))
        this.prevTime = time

        profileLogger.beginFrame()

        for (const subscriber of this.getSortedSubscribers()) {
            subscriber.callback(time)
        }

        if (this.subscribers.size > 0) {
            this.rafId = requestAnimationFrame(this.tick)
        } else {
            this.rafId = null
        }
    }
}

export const frameScheduler = new FrameScheduler()
