import {VideoParams, VideoValue} from './types'
import {getFunctionState} from '../../../utils/patterns/function'
import {CameraAxis, EdgeMode, MirrorMode, StackType} from '../_service/patternServices/PatternVideoService/ShaderVideoModule'

export const getVideoState = getFunctionState<VideoValue, VideoParams>(
    {}, {
        cameraOn: false,
        updatingOn: false,
        // on: false,
        // pause: false,
        changeFunctionId: null,
        cameraAxis: CameraAxis.T,
        edgeMode: EdgeMode.ALL,
        stackType: StackType.Right,
        mirrorMode: MirrorMode.NO,
        stackSize: 20,
        device: null,
        offset: {
            x0: 0.0,//.25,
            x1: 1.0,//.75,
            y0: 0.0,//.25,
            y1: 1.0,//.75,
            z0: 0.0,//.25,
            z1: 1.0,//.75,
        },
    })
