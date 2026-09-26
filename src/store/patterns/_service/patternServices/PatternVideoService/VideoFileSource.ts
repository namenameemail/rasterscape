import { profileDebug } from '../../../../../utils/profileDebug'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const MIN_LOOP_NORM = 0.01

export class VideoFileSource {
    private video: HTMLVideoElement | null = null
    private objectUrl: string | null = null
    private canvas: HTMLCanvasElement = document.createElement('canvas')
    private ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d')
    private width = 1
    private height = 1
    private loopInN = 0
    private loopOutN = 1
    private onTimeUpdate = () => {
        this.enforceLoop()
    }

    snapshot = () => ({
        ready: this.ready,
        playing: this.playing,
        paused: !!this.video?.paused,
        ended: !!this.video?.ended,
        currentTime: this.currentTime,
        duration: this.duration,
        readyState: this.video?.readyState ?? -1,
        videoWidth: this.video?.videoWidth ?? 0,
        videoHeight: this.video?.videoHeight ?? 0,
        canvasW: this.canvas.width,
        canvasH: this.canvas.height,
        sizeW: this.width,
        sizeH: this.height,
        hasVideo: !!this.video,
        hasUrl: !!this.objectUrl,
        loopIn: this.loopInN,
        loopOut: this.loopOutN,
        error: this.video?.error ? {
            code: this.video.error.code,
            message: this.video.error.message,
        } : null,
    })

    get ready(): boolean {
        return !!this.video
            && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
            && this.video.videoWidth > 0
            && this.video.videoHeight > 0
    }

    get playing(): boolean {
        return !!this.video && !this.video.paused && !this.video.ended
    }

    get currentTime(): number {
        return this.video?.currentTime ?? 0
    }

    get duration(): number {
        const d = this.video?.duration
        return d && Number.isFinite(d) ? d : 0
    }

    get loopIn(): number {
        return this.loopInN
    }

    get loopOut(): number {
        return this.loopOutN
    }

    setSize = (width: number, height: number): void => {
        if (width <= 0 || height <= 0) {
            profileDebug('video', 'file.setSize.skip', { width, height })
            return
        }
        this.width = width
        this.height = height
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width
            this.canvas.height = height
        }
        profileDebug('video', 'file.setSize', this.snapshot())
    }

    setLoopRange = (loopIn: number, loopOut: number): void => {
        let a = clamp01(loopIn)
        let b = clamp01(loopOut)
        if (b - a < MIN_LOOP_NORM) {
            if (a > 1 - MIN_LOOP_NORM) {
                a = 1 - MIN_LOOP_NORM
                b = 1
            } else {
                b = Math.min(1, a + MIN_LOOP_NORM)
            }
        }
        this.loopInN = a
        this.loopOutN = b
        if (this.video && this.duration > 0) {
            const t = this.video.currentTime
            const start = a * this.duration
            const end = b * this.duration
            if (t < start || t > end) {
                this.video.currentTime = start
            }
        }
    }

    setCurrentTime = (time: number): void => {
        if (!this.video || !Number.isFinite(time)) {
            return
        }
        const next = Math.max(0, Math.min(time, this.duration || time))
        if (Math.abs(this.video.currentTime - next) < 0.001) {
            return
        }
        this.video.currentTime = next
    }

    enforceLoop = (): void => {
        if (!this.video || this.video.paused || this.duration <= 0) {
            return
        }
        const start = this.loopInN * this.duration
        const end = this.loopOutN * this.duration
        if (end - start < 0.05) {
            return
        }
        if (this.video.currentTime >= end - 0.03 || this.video.currentTime < start) {
            this.video.currentTime = start
        }
    }

    receiveImage = (): HTMLCanvasElement | null => {
        if (!this.ready || !this.video || !this.ctx) {
            return null
        }
        this.enforceLoop()
        if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
            this.canvas.width = this.width
            this.canvas.height = this.height
        }
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height)
        return this.canvas
    }

    play = async (): Promise<boolean> => {
        if (!this.video) {
            profileDebug('video', 'file.play.noVideo', this.snapshot())
            return false
        }
        if (this.duration > 0) {
            const start = this.loopInN * this.duration
            const end = this.loopOutN * this.duration
            if (this.video.currentTime < start || this.video.currentTime >= end - 0.03) {
                this.video.currentTime = start
            }
        }
        try {
            await this.video.play()
            const ok = !this.video.paused
            profileDebug('video', ok ? 'file.play.ok' : 'file.play.stillPaused', this.snapshot())
            return ok
        } catch (e) {
            profileDebug('video', 'file.play.error', {
                ...this.snapshot(),
                message: e instanceof Error ? e.message : String(e),
            })
            return false
        }
    }

    pause = (): void => {
        this.video?.pause()
        profileDebug('video', 'file.pause', this.snapshot())
    }

    setFile = async (file: File | null): Promise<void> => {
        this.clearVideo()
        if (!file) {
            profileDebug('video', 'file.setFile.clear')
            return
        }

        profileDebug('video', 'file.setFile.start', {
            name: file.name,
            size: file.size,
            type: file.type,
        })

        const video = document.createElement('video')
        video.muted = true
        video.defaultMuted = true
        video.playsInline = true
        video.preload = 'auto'
        video.loop = false
        video.setAttribute('muted', '')
        video.setAttribute('playsinline', '')
        video.setAttribute('webkit-playsinline', '')
        video.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
        document.body.appendChild(video)

        const url = URL.createObjectURL(file)
        this.objectUrl = url
        this.video = video
        video.src = url
        video.addEventListener('timeupdate', this.onTimeUpdate)

        await new Promise<void>((resolve, reject) => {
            const fail = () => {
                done()
                profileDebug('video', 'file.setFile.loadError', this.snapshot())
                reject(new Error('video file load failed'))
            }
            const ok = () => {
                done()
                profileDebug('video', 'file.setFile.loadeddata', this.snapshot())
                resolve()
            }
            const done = () => {
                video.removeEventListener('error', fail)
                video.removeEventListener('loadeddata', ok)
            }
            video.addEventListener('error', fail)
            video.addEventListener('loadeddata', ok)
            video.load()
        })

        try {
            await video.play()
        } catch (e) {
            profileDebug('video', 'file.setFile.primePlayError', {
                message: e instanceof Error ? e.message : String(e),
            })
        }
        video.pause()
        video.currentTime = this.loopInN * (this.duration || 0)
        profileDebug('video', 'file.setFile.ready', this.snapshot())
    }

    private clearVideo = (): void => {
        if (this.video) {
            this.video.removeEventListener('timeupdate', this.onTimeUpdate)
            this.video.pause()
            this.video.removeAttribute('src')
            this.video.load()
            this.video.remove()
            this.video = null
        }
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl)
            this.objectUrl = null
        }
    }

    clear = (): void => {
        this.clearVideo()
        profileDebug('video', 'file.clear', this.snapshot())
    }
}
