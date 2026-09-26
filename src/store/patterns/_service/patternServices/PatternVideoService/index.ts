import { PatternService } from '../../PatternService'
import { CameraService, CameraServiceInitParams } from 'bbuutoonnss'
import { EdgeMode, MirrorMode, ShaderVideoModule, CameraAxis, StackType } from './ShaderVideoModule'
import { VideoVolumeView } from './VideoVolumeView'
import { FxyParams } from '../../../../changeFunctions/functions/fxy'
import { getFxyFunctionType } from './utils'
import { VideoOffset } from './ShaderVideoModule/types'
import { ECFType } from '../../../../changeFunctions/types'
import { CfDepthParams } from '../../../../changeFunctions/functions/depth'
import { VideoSourceType } from '../../../video/types'
import { patternsService } from '../../../../index'
import { profileLogger } from '../../../../../utils/profiling/ProfileLogger'
import { frameScheduler, FramePriority } from '../../../../../utils/FrameScheduler'
import { getGlContext } from '../../../../../gl/GlContext'
import { VideoFileSource } from './VideoFileSource'
import { profileDebug } from '../../../../../utils/profileDebug'
import { getRetainedVideoFile, retainVideoFile } from './retainedVideoFiles'

export const CameraAxisDirectionMap = {
    [CameraAxis.T]: 0,
    [CameraAxis.Y]: 1,
    [CameraAxis.X]: 2,
}

export const EdgeModeASMap = {
    [EdgeMode.NO]: 0,
    [EdgeMode.TOP]: 1,
    [EdgeMode.BOT]: 2,
    [EdgeMode.ALL]: 3,
}


export const StackTypeASMap = {
    [StackType.Right]: 0,
    [StackType.Left]: 1,
    [StackType.FromCenter]: 2,
    [StackType.ToCenter]: 3,
}


export interface VideoServiceInitParams {
    width: number;
    height: number;
    stackSize: number,
    offset: VideoOffset

    edgeMode: EdgeMode,
    cameraAxis: CameraAxis,
    stackType: StackType,
    mirrorMode: MirrorMode
}

export class PatternVideoService {
    patternService: PatternService

    // isCameraOn: boolean = false
    // isUpdatingOn: boolean = false

    // isOn: boolean = false
    // isPause: boolean = false

    width: number
    height: number
    stackSize: number
    stackType: StackType = StackType.Right
    edgeMode: EdgeMode = EdgeMode.ALL
    cameraAxis: CameraAxis = CameraAxis.T
    mirrorMode: MirrorMode = MirrorMode.NO

    offset: VideoOffset


    cutOffset: number
    depth: number

    changeFunctionId: string

    sourceType: VideoSourceType = VideoSourceType.Camera
    sourcePatternId: string | null = null
    device: MediaDeviceInfo
    cameraService: CameraService = new CameraService()
    fileSource = new VideoFileSource()
    volumeView = new VideoVolumeView()

    private unsubscribeFrame: (() => void) | null = null
    private fileFrameLogAt = 0

    shaderVideoModule: ShaderVideoModule

    constructor(patternService: PatternService) {
        this.patternService = patternService


        this.shaderVideoModule = new ShaderVideoModule()

    }

    initCamera(params: CameraServiceInitParams): PatternVideoService {
        this.cameraService.init(params)
        return this
    }

    async startCamera() {
        await this.cameraService.start()
        console.log('getCapabilities', this.cameraService.stream.getVideoTracks()[0]?.getCapabilities())

        return this
    }

    stopCamera() {
        this.cameraService.stop()
        return this
    }

    setDevice = async (device: MediaDeviceInfo): Promise<PatternVideoService> => {
        this.device = device

        await this.cameraService.setDevice(device)

        return this
    }


    async init(params: VideoServiceInitParams): Promise<PatternVideoService> {

        this.width = params.width
        this.height = params.height
        this.stackSize = params.stackSize

        this.edgeMode = params.edgeMode
        this.cameraAxis = params.cameraAxis
        this.stackType = params.stackType
        this.mirrorMode = params.mirrorMode
        this.offset = params.offset
        this.fileSource.setSize(params.width, params.height);

        (
            await this.shaderVideoModule.instantiate()
        ).init(
            params,
        )

        return this

    }

    isCooking = (): boolean => {
        return !!this.unsubscribeFrame
    }

    start = () => {
        if (this.unsubscribeFrame) {
            profileDebug('video', 'file.update.start.already', {
                patternId: this.patternService.patternId,
                sourceType: this.sourceType,
            })
            return
        }
        this.unsubscribeFrame = frameScheduler.subscribe(
            `video:${this.patternService.patternId}`,
            this.onFrameTick,
            FramePriority.Video,
        )
        profileDebug('video', 'file.update.start', {
            patternId: this.patternService.patternId,
            sourceType: this.sourceType,
            ...this.fileSource.snapshot(),
        })
    }

    stop = () => {
        this.unsubscribeFrame?.()
        this.unsubscribeFrame = null
        profileDebug('video', 'file.update.stop', {
            patternId: this.patternService.patternId,
            sourceType: this.sourceType,
            ...this.fileSource.snapshot(),
        })
    }

    onFrameTick = () => {
        this.onFrame()
    }

    private pushSourceFrame = (): void => {
        if (this.sourceType === VideoSourceType.Camera) {
            const source = this.cameraService.receiveImage()
            if (source) {
                profileLogger.time('video.pushNewFrame', () => {
                    this.shaderVideoModule.pushNewFrame(source)
                })
            }
            return
        }

        if (this.sourceType === VideoSourceType.File) {
            const filePlaying = !!this.patternService.storeService.getState()
                .patterns[this.patternService.patternId]?.video?.params?.filePlaying
            if (filePlaying && !this.fileSource.playing) {
                profileDebug('video', 'file.frame.rePlay', this.fileSource.snapshot())
                void this.fileSource.play()
            }
            const source = this.fileSource.receiveImage()
            const now = performance.now()
            if (now - this.fileFrameLogAt > 500) {
                this.fileFrameLogAt = now
                profileDebug('video', 'file.frame', {
                    patternId: this.patternService.patternId,
                    filePlaying,
                    pushed: !!source,
                    cooking: this.isCooking(),
                    ...this.fileSource.snapshot(),
                })
            }
            if (source) {
                profileLogger.time('video.pushNewFrame', () => {
                    this.shaderVideoModule.pushNewFrame(source)
                })
            }
            return
        }

        if (!this.sourcePatternId) {
            return
        }

        const masked = patternsService.pattern[this.sourcePatternId]?.valuesService.ensureMaskedGpu()

        if (!masked) {
            return
        }

        profileLogger.time('video.pushNewFrame', () => {
            this.shaderVideoModule.pushFrameFromTexture(masked.texture, masked.width, masked.height)
        })
    }

    onFrame = () => {
        this.pushSourceFrame()

        const state = this.patternService.storeService.getState()
        const patternId = this.patternService.patternId
        const videoParams = state.patterns[patternId].video.params
        const platformerPlaying = this.patternService.platformerService.isPlaying
        const volumeViewOn = !platformerPlaying && !!videoParams.volumeViewOn

        profileLogger.time('video.updateFuncParams', () => {
            if (!this.changeFunctionId) {
                this.volumeView.clearCut()
                return
            }

            const changeFunctionState = state.changeFunctions.functions[this.changeFunctionId]
            if (!changeFunctionState) {
                this.volumeView.clearCut()
                return
            }

            if (volumeViewOn) {
                if (changeFunctionState.type === ECFType.FXY) {
                    const changeFunctionParams = changeFunctionState.params as FxyParams
                    const changeFunctionTypeParams = changeFunctionParams.typeParams[changeFunctionParams.type]
                    this.volumeView.setFxyCut(changeFunctionParams.type, changeFunctionTypeParams)
                } else if (changeFunctionState.type === ECFType.DEPTH) {
                    this.volumeView.setDepthCut(changeFunctionState.params as CfDepthParams)
                } else {
                    this.volumeView.clearCut()
                }
                return
            }

            if (changeFunctionState.type === ECFType.FXY) {
                const changeFunctionParams = changeFunctionState.params as FxyParams
                const changeFunctionTypeParams = changeFunctionParams.typeParams[changeFunctionParams.type]

                this.shaderVideoModule.updateFuncParams(changeFunctionParams.type, changeFunctionTypeParams, state)
            }
            if (changeFunctionState.type === ECFType.DEPTH) {
                const changeFunctionParams = changeFunctionState.params as CfDepthParams

                this.shaderVideoModule.updateFuncParams(changeFunctionState.type, changeFunctionParams, state)
            }
        })

        profileLogger.time('video.updateOffsets', () => {
            if (volumeViewOn) {
                return
            }
            this.shaderVideoModule.updateOffsets(videoParams.offset)
        })

        const frame = profileLogger.time('video.shaderDraw', () => {
            if (volumeViewOn) {
                const mod = this.shaderVideoModule
                if (!mod.cubeTexture) {
                    return null
                }
                return this.volumeView.render(mod.cubeTexture, this.width, this.height, {
                    queueOffset: mod.queueOffset,
                    stackSize: mod.stackSizeWithError,
                    error: mod.error,
                    direction: this.cameraAxis,
                    offset: videoParams.offset,
                    ghost: typeof videoParams.volumeGhost === 'number' ? videoParams.volumeGhost : 0.14,
                })
            }
            return this.shaderVideoModule.updateImage()
        })

        const buffer = this.patternService.canvasService.buffer

        if (frame && platformerPlaying) {
            profileLogger.time('video.drawImage', () => {
                const glc = getGlContext()
                glc.blitToDefault(frame, this.width, this.height)
                this.patternService.platformerService.applyVideoFrame(glc.canvas)
            })
        } else if (frame && buffer) {
            profileLogger.time('video.composite', () => {
                buffer.compositeVideo(frame)
            })
        }

        const pattern = state.patterns[patternId]
        const radius = Math.round(pattern.blur?.value?.radius)

        if (radius > 0) {
            profileLogger.time('video.blur', () => {
                if (platformerPlaying) {
                    this.patternService.platformerService.applyBlurToWorld(radius)
                } else if (buffer?.texture) {
                    getGlContext().blurTexture(buffer.texture, buffer.width, buffer.height, radius)
                    buffer.markGpuContent()
                    getGlContext().blitToDefault(buffer.texture, buffer.width, buffer.height)
                }
            })
        }

        if (!platformerPlaying && buffer) {
            buffer.presentGl()

            profileLogger.time('video.valuesService', () => {
                this.patternService.valuesService.updateForVideoFrame()
            })
        }
    }

    setStackType = (type: StackType): PatternVideoService => {
        this.stackType = type
        this.shaderVideoModule.updateStackType(type)

        return this
    }

    setEdgeMode = (mode: EdgeMode): PatternVideoService => {
        this.edgeMode = mode
        this.shaderVideoModule.updateEdgeMode(mode)

        return this
    }

    setCameraAxis = (cameraAxis: CameraAxis): PatternVideoService => {
        this.cameraAxis = cameraAxis
        this.shaderVideoModule.updateCameraAxis(cameraAxis)

        return this
    }


    setMirrorMode = (mirrorMode: MirrorMode): PatternVideoService => {
        this.mirrorMode = mirrorMode
        this.shaderVideoModule.updateMirror(
            mirrorMode === MirrorMode.BOTH || mirrorMode === MirrorMode.HORIZONTAL,
            mirrorMode === MirrorMode.BOTH || mirrorMode === MirrorMode.VERTICAL,
        )

        return this
    }

    setStackSize = (value: number): PatternVideoService => {
        this.stackSize = value
        this.shaderVideoModule.updateStackSize(this.stackSize)

        return this
    }

    setChangeFunction = (changeFunctionId: string): PatternVideoService => {
        this.changeFunctionId = changeFunctionId

        this.shaderVideoModule.updateCutFunctionType(
            getFxyFunctionType(this.changeFunctionId, this.patternService.storeService.getState()),
        )

        return this
    }

    setOffset = (param: string, value: any): PatternVideoService => {
        this.offset = { ...this.offset, [param]: value }

        this.shaderVideoModule.updateOffset(param, value)

        return this
    }

    setSourceType = (sourceType: VideoSourceType): PatternVideoService => {
        this.sourceType = sourceType
        return this
    }

    setSourcePatternId = (sourcePatternId: string | null): PatternVideoService => {
        this.sourcePatternId = sourcePatternId
        return this
    }

    setSourceFile = async (file: File | null): Promise<PatternVideoService> => {
        retainVideoFile(this.patternService.patternId, file)
        if (this.width && this.height) {
            this.fileSource.setSize(this.width, this.height)
        } else {
            const pattern = this.patternService.storeService.getState().patterns[this.patternService.patternId]
            if (pattern?.width && pattern?.height) {
                this.fileSource.setSize(pattern.width, pattern.height)
            }
        }
        await this.fileSource.setFile(file)
        const params = this.patternService.storeService.getState()
            .patterns[this.patternService.patternId]?.video?.params
        this.fileSource.setLoopRange(params?.fileLoopIn ?? 0, params?.fileLoopOut ?? 1)
        return this
    }

    clearSourceFile = (): PatternVideoService => {
        retainVideoFile(this.patternService.patternId, null)
        this.fileSource.clear()
        return this
    }

    ensureSourceFile = async (): Promise<boolean> => {
        if (this.fileSource.ready) {
            return true
        }
        const file = getRetainedVideoFile(this.patternService.patternId)
        if (!file) {
            profileDebug('video', 'file.ensure.missing', {
                patternId: this.patternService.patternId,
                ...this.fileSource.snapshot(),
            })
            return false
        }
        profileDebug('video', 'file.ensure.rehydrate', {
            patternId: this.patternService.patternId,
            name: file.name,
        })
        await this.setSourceFile(file)
        return this.fileSource.ready
    }

    playSourceFile = async (): Promise<boolean> => {
        if (!await this.ensureSourceFile()) {
            return false
        }
        return this.fileSource.play()
    }

    pauseSourceFile = (): PatternVideoService => {
        this.fileSource.pause()
        return this
    }

    hasSourceFile = (): boolean =>
        this.fileSource.ready || !!getRetainedVideoFile(this.patternService.patternId)

    getSourceFileCurrentTime = (): number => this.fileSource.currentTime

    getSourceFileDuration = (): number => this.fileSource.duration

    getSourceFileLoopRange = (): { loopIn: number; loopOut: number } => ({
        loopIn: this.fileSource.loopIn,
        loopOut: this.fileSource.loopOut,
    })

    setSourceFileCurrentTime = (time: number): PatternVideoService => {
        this.fileSource.setCurrentTime(time)
        return this
    }

    setSourceFileLoopRange = (loopIn: number, loopOut: number): PatternVideoService => {
        this.fileSource.setLoopRange(loopIn, loopOut)
        return this
    }
}
