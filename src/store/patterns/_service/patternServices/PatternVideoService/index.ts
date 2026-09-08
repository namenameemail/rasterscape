import { PatternService } from '../../PatternService'
import { CameraService, CameraServiceInitParams } from 'bbuutoonnss'
import { EdgeMode, MirrorMode, ShaderVideoModule, CameraAxis, StackType } from './ShaderVideoModule'
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

    private unsubscribeFrame: (() => void) | null = null

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
        this.offset = params.offset;

        (
            await this.shaderVideoModule.instantiate()
        ).init(
            params,
        )

        return this

    }

    start = () => {
        this.unsubscribeFrame?.()
        this.unsubscribeFrame = frameScheduler.subscribe(
            `video:${this.patternService.patternId}`,
            this.onFrameTick,
            FramePriority.Video,
        )
    }

    stop = () => {
        this.unsubscribeFrame?.()
        this.unsubscribeFrame = null
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

        profileLogger.time('video.updateFuncParams', () => {
            if (!this.changeFunctionId) {
                return
            }

            const state = this.patternService.storeService.getState()
            const changeFunctionState = state.changeFunctions.functions[this.changeFunctionId]

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
            const state = this.patternService.storeService.getState()
            const patternVideoOffset = state.patterns[this.patternService.patternId].video.params.offset
            this.shaderVideoModule.updateOffsets(patternVideoOffset)
        })

        const frame = profileLogger.time('video.shaderDraw', () => this.shaderVideoModule.updateImage())

        const platformerPlaying = this.patternService.platformerService.isPlaying
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

        const pattern = this.patternService.storeService.getState().patterns[this.patternService.patternId]
        const radius = Math.round(pattern.blur?.value?.radius)

        if (radius > 0) {
            profileLogger.time('video.blur', () => {
                if (platformerPlaying) {
                    this.patternService.platformerService.applyBlurToWorld(radius)
                } else if (buffer?.texture) {
                    getGlContext().blurTexture(buffer.texture, buffer.width, buffer.height, radius)
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
}
