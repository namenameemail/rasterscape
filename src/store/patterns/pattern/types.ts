import {HeightAction, ImageAction, WidthAction,} from "../../../utils/types";
import {Action} from "redux";
import {CanvasState} from "../../../utils/canvas/types";
import {HistoryParams, HistoryState} from "../history/types";
import {StoreParams, StoreState} from "../store/types";
import {RotationParams, RotationState} from "../rotating/types";
import {RepeatsParams, RepeatsState} from "../repeating/types";
import {SelectionParams, SelectionState} from "../selection/types";
import {MaskParams, MaskState} from "../mask/types";
import {VideoParams, VideoState} from "../video/types";
import {ImportParams, ImportState} from "../import/types";
import {RoomParams, RoomState} from "../room/types";
import {BlurParams, BlurState} from "../blur/types";
import {DemonstrationParams, DemonstrationState} from "../demonstration/types";


// PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN PATTERN

// параметры патерна для копирования их в новый патерн
export interface PatternParams {
    history?: HistoryParams

    store?: StoreParams

    rotation?: RotationParams

    repeating?: RepeatsParams

    selection?: SelectionParams

    mask?: MaskParams

    import?: ImportParams

    video?: VideoParams

    room?: RoomParams

    blur?: BlurParams

    demonstration?: DemonstrationParams
}

// конфиг создания нового патерна для ручного заполнения или для формирования на основе друго патерна
export interface PatternConfig {

    startImage?: ImageData
    startMask?: ImageData

    width?: number
    height?: number

    history?: boolean

    store?: boolean

    selection?: boolean

    mask?: boolean

    rotation?: boolean

    repeating?: boolean

    video?: boolean

    room?: boolean

    blur?: boolean
}


export interface PatternState {
    error?: any
    id: string
    width: number
    height: number
    // resultImage: HTMLCanvasElement | boolean
    config: PatternConfig
    // current: CanvasState
    history?: HistoryState,
    store?: StoreState,
    selection?: SelectionState
    mask?: MaskState
    rotation?: RotationState
    repeating?: RepeatsState
    import?: ImportState
    video?: VideoState
    room?: RoomState
    blur?: BlurState
    demonstration?: DemonstrationState
}

// ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS ACTIONS

export interface AddPatternAction extends Action {
    id: string
    config?: PatternConfig
    params?: PatternParams
}

export interface PatternAction extends Action {
    id: string
}

export interface RemovePatternAction extends PatternAction {
}

export interface UpdatePatternImageAction extends ImageAction, PatternAction {
    noHistory: boolean
}

export interface EditPatternConfigAction extends PatternAction {
    config?: PatternConfig
}

export interface SetPatternWidthAction extends WidthAction, PatternAction {
}

export interface SetPatternHeightAction extends HeightAction, PatternAction {
}

export interface UpdateOptions {
    id: string,
    imageData?: ImageData,
    emit?: boolean,
    // blur?: boolean,
    noHistory?: boolean
}

