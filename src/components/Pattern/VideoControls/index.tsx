import * as React from 'react'
import {VideoParams, VideoSourceType} from '../../../store/patterns/video/types'
import {SelectDrop} from '../../_shared/buttons/complex/SelectDrop'
import {connect, MapDispatchToProps, MapStateToProps} from 'react-redux'
import {AppState} from '../../../store'
import {ChangeFunctionState, ECFType} from '../../../store/changeFunctions/types'
import {

    setChangeFunction,
    setDevice,
    setEdgeMode,
    setMirrorMode,
    setCameraAxis,
    setStackSize,
    setStackType,
    startCamera,
    stopCamera,
    start,
    stop,
    setVideoOffset,
    setVideoSourceType,
    setVideoSourcePattern,
} from '../../../store/patterns/video/actions'
import {getChangeFunctionsSelectItemsVideo} from '../../../store/changeFunctions/selectors'
import {PatternsSelect} from '../../PatternsSelect'
import './videoControls.scss'
import {setCFHighlights, setCFTypeHighlights} from '../../../store/changeFunctionsHighlights'
import {SelectButtonsEventData} from '../../_shared/buttons/complex/SelectButtons'
import {ButtonHK} from '../../_shared/buttons/hotkeyed/ButtonHK'
import {WithTranslation, withTranslation} from 'react-i18next'
import {LabelFormatter} from '../../../store/hotkeys/label-formatters'
import {Translations} from '../../../store/language/helpers'
import {SelectVideoDevice} from 'bbuutoonnss'
import {InputNumber, InputNumberProps} from '../../_shared/inputs/InputNumber'
import {VideoOffsetForm} from './VideoOffsetForm'
import {CameraAxis, EdgeMode, MirrorMode, StackType} from '../../../store/patterns/_service/patternServices/PatternVideoService/ShaderVideoModule'
import {ButtonEventData} from '../../_shared/buttons/simple/Button'
import {getVideoState} from '../../../store/patterns/video/helpers'

export interface VideoControlsStateProps {

    videoParams: VideoParams

    changeFunctionsSelectItems: ChangeFunctionState[]
    videoDisabled: boolean
    changeFunctionParams: any

    autoblur: boolean
    autofocus: boolean
}

export interface VideoControlsActionProps {
    start(id: string): void

    stop(id: string): void

    startCamera(id: string): void

    stopCamera(id: string): void

    setCFHighlights(cfName?: string): void

    setCFTypeHighlights(cfType?: ECFType[]): void

    setDevice(id: string, value: MediaDeviceInfo): void

    setCameraAxis(id: string, value: CameraAxis): void

    setEdgeMode(id: string, value: EdgeMode): void

    setMirrorMode(id: string, value: MirrorMode): void

    setStackType(id: string, value: StackType): void

    setChangeFunction(id: string, value: string | null): void

    setStackSize(id: string, value: number): void

    setVideoOffset(id: string, name: string, value: number): void

    setVideoSourceType(id: string, value: VideoSourceType): void

    setVideoSourcePattern(id: string, value: string | null): void
}

export interface VideoControlsOwnProps {
    patternId: string
}

export interface VideoControlsProps extends VideoControlsStateProps, VideoControlsActionProps, VideoControlsOwnProps, WithTranslation {

}

export interface VideoControlsState {
    pause: boolean
}

const availableCFTypes = [ECFType.FXY, ECFType.DEPTH]
const sourceTypeItems = Object.values(VideoSourceType)

const inputNumberProps: Pick<InputNumberProps, 'min' | 'max' | 'step' | 'delay' | 'notZero'> = {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
    step: 1,
    delay: 1000,
    notZero: true,
}

export class VideoControlsComponent extends React.PureComponent<VideoControlsProps, VideoControlsState> {

    state = {
        pause: false,
    }

    handleChangeCameraOnParam = () => {
        const {videoParams, patternId} = this.props
        videoParams.cameraOn
            ? this.props.stopCamera(patternId)
            : this.props.startCamera(patternId)
    }

    handleChangeUpdatingOnParam = () => {
        const {videoParams, patternId} = this.props
        videoParams.updatingOn
            ? this.props.stop(patternId)
            : this.props.start(patternId)
    }

    handleChangeSlitModeParam = (axis: CameraAxis) => {
        const {setCameraAxis, patternId} = this.props
        setCameraAxis(patternId, axis)
    }

    handleChangeEdgeMode = (data: SelectButtonsEventData) => {
        const {setEdgeMode, patternId} = this.props
        const {value} = data
        setEdgeMode(patternId, value)
    }

    handleChangeMirrorMode = (data: ButtonEventData & {selected?: boolean}) => {
        const {setMirrorMode, patternId} = this.props
        setMirrorMode(patternId, data.selected ? MirrorMode.NO : MirrorMode.HORIZONTAL)
    }

    handleChangeStackType = (data: SelectButtonsEventData) => {
        const {setStackType, patternId} = this.props
        const {value} = data
        setStackType(patternId, value)
    }

    handleChangeChangeFunction = (data: SelectButtonsEventData) => {
        const {setChangeFunction, patternId} = this.props
        const {value} = data
        setChangeFunction(patternId, value)
    }

    handleClearChangeFunction = () => {
        const {setChangeFunction, patternId} = this.props
        setChangeFunction(patternId, null)
    }

    handleChangeStackSize = (value: number) => {
        const {setStackSize, patternId} = this.props
        setStackSize(patternId, value)
    }

    handleChangeOffset = (data: SelectButtonsEventData) => {
        const {setVideoOffset, patternId} = this.props
        const {value, name} = data
        if (!name) return
        setVideoOffset(patternId, name, value)
    }
    handleChangeOffsetForm = (name: string, value: number) => {
        const {setVideoOffset, patternId} = this.props
        setVideoOffset(patternId, name, value)
    }

    componentWillUnmount(): void {
        // console.log('000000000')
        // this.props.stop(this.props.patternId)
    }

    availableChangeTypes = [ECFType.FXY, ECFType.DEPTH]

    handleCFValueMouseEnter = () => {
        const {setCFTypeHighlights, changeFunctionsSelectItems} = this.props
        if (!changeFunctionsSelectItems.length)
            setCFTypeHighlights(availableCFTypes)
    }
    handleCFValueMouseLeave = () => {
        const {setCFTypeHighlights} = this.props
        setCFTypeHighlights()
    }

    handleCFMouseEnter = (data: SelectButtonsEventData) => {
        const {setCFHighlights} = this.props
        setCFHighlights(data?.value?.id)
    }
    handleCFMouseLeave = () => {
        const {setCFHighlights} = this.props
        setCFHighlights()
    }

    stackSizeText = (value: number) => {
        return value.toFixed(2) + 'D'
    }

    // dynamicCutBG = (slitMode: SlitMode, stackType: StackType) => {
    //     const { videoParams: { cutOffset } } = this.props
    //     if (slitMode === SlitMode.FRONT) {
    //         switch (stackType) {
    //
    //             case StackType.Right:
    //                 return { background: `rgba(255, 255, 255, ${(cutOffset + 1).toFixed(2)})` }
    //             case StackType.Left:
    //                 return { background: `rgba(255, 255, 255, ${(-cutOffset).toFixed(2)})` }
    //             case StackType.FromCenter:
    //                 return { background: `rgba(255, 255, 255, ${((-Math.abs(2 * cutOffset + 1) + 1)).toFixed(2)})` }
    //             case StackType.ToCenter:
    //                 return { background: `rgba(255, 255, 255, ${Math.abs(1 + 2 * cutOffset).toFixed(2)})` }
    //
    //
    //         }
    //     }
    //     if (slitMode === SlitMode.BACK) {
    //         switch (stackType) {
    //
    //             case StackType.Right:
    //                 return { background: `rgba(255, 255, 255, ${(-cutOffset).toFixed(2)})` }
    //             case StackType.Left:
    //                 return { background: `rgba(255, 255, 255, ${(cutOffset + 1).toFixed(2)})` }
    //             case StackType.FromCenter:
    //                 return { background: `rgba(255, 255, 255, ${((-Math.abs(2 * cutOffset + 1) + 1)).toFixed(2)})` }
    //             case StackType.ToCenter:
    //                 return { background: `rgba(255, 255, 255, ${Math.abs(1 + 2 * cutOffset).toFixed(2)})` }
    //
    //
    //         }
    //     }
    //     return null
    // }

    edgeModeGetValue = (id: EdgeMode) => id
    edgeModeGetText = (id: EdgeMode) => {
        const {t} = this.props
        return t('pattern.video.edgeMode.' + id)
    }

    cameraAxisGetValue = (id: CameraAxis) => id
    cameraAxisGetText = (id: CameraAxis) => {
        const {t} = this.props
        return t('pattern.video.cameraAxis.' + id)
    }

    stackTypeGetValue = (id: StackType) => id

    cfGetValue = (item: ChangeFunctionState) => item.id
    cfGetText = (item: ChangeFunctionState) => {
        const {t} = this.props
        return Translations.cfName(t)(item)
    }

    handleDeviceSelect = (device: MediaDeviceInfo) => {
        this.props.setDevice(this.props.patternId, device)

    }

    handleChangeSourceType = (data: SelectButtonsEventData) => {
        const {setVideoSourceType, patternId} = this.props
        setVideoSourceType(patternId, data.value)
    }

    handleSelectSourcePattern = (value: string | string[], _added: string, _removed: string) => {
        const {setVideoSourcePattern, patternId} = this.props
        setVideoSourcePattern(patternId, Array.isArray(value) ? value[0] ?? null : value)
    }

    sourceTypeGetValue = (id: VideoSourceType) => id
    sourceTypeGetText = (id: VideoSourceType) => {
        const {t} = this.props
        return t('pattern.video.sourceType.' + id)
    }

    render() {
        const {
            changeFunctionsSelectItems,
            videoParams: params,
            patternId,
            videoDisabled,
            t,
            autoblur,
            autofocus,
        } = this.props
        const {cameraOn, updatingOn, sourceType, sourcePatternId} = params
        const isCameraSource = sourceType === VideoSourceType.Camera
        const isPatternSource = sourceType === VideoSourceType.Pattern

        return (
            <div className={'video-controls'}>

                <div className={'video-controls-source'}>
                    <SelectDrop
                        hkByValue={false}
                        hkLabel={'pattern.hotkeysDescription.video.sourceType'}
                        hkData1={patternId}
                        className={'video-source-type'}
                        name={'sourceType'}
                        value={sourceType}
                        getValue={this.sourceTypeGetValue}
                        getText={this.sourceTypeGetText}
                        items={sourceTypeItems}
                        onChange={this.handleChangeSourceType}
                    />
                    {isCameraSource && (
                        <>
                            <SelectVideoDevice
                                className={'select-device'}
                                value={params.device?.deviceId}
                                onSelect={this.handleDeviceSelect}
                            />
                            <ButtonHK
                                hkLabel={'pattern.hotkeysDescription.video.cameraOn'}
                                hkData1={patternId}
                                path={`pattern.${patternId}.video.cameraOn`}
                                className={'video-toggle'}
                                selected={cameraOn}
                                name={'cameraOn'}
                                disabled={videoDisabled || !params.device?.deviceId}
                                onClick={this.handleChangeCameraOnParam}
                            >
                                {t('pattern.video.camera')}
                            </ButtonHK>
                        </>
                    )}
                    {isPatternSource && (
                        <div className={'video-pattern-select'}>
                            <PatternsSelect
                                HK={false}
                                blurOnClick
                                nullable
                                excludePatternId={patternId}
                                value={sourcePatternId ?? undefined}
                                onChange={this.handleSelectSourcePattern}
                            />
                        </div>
                    )}
                </div>

                <div className={'video-controls-cube-params'}>


                    <InputNumber
                        autoblur={autoblur}
                        autofocus={autofocus}
                        className={'stack-size-input-number'}
                        onChange={this.handleChangeStackSize}
                        value={params.stackSize}
                        {...inputNumberProps}
                    />

                    <ButtonHK
                        hkLabel={'pattern.hotkeysDescription.video.updatingOn'}
                        hkData1={patternId}
                        path={`pattern.${patternId}.video.updatingOn`}
                        className={'video-toggle'}
                        selected={updatingOn}
                        name={'updatingOn'}
                        disabled={videoDisabled || (isPatternSource && !sourcePatternId)}
                        onClick={this.handleChangeUpdatingOnParam}
                    >
                        {/* {updatingOn ? t('pattern.video.stop') : t('pattern.video.update')} */}
                        {t('pattern.video.update')}
                    </ButtonHK>
                    <SelectDrop

                        hkByValue={false}
                        hkLabel={'pattern.hotkeysDescription.video.cutFunction'}
                        hkLabelFormatter={LabelFormatter.ChangeFunction}
                        hkData1={patternId}

                        className={'cut-function'}

                        nullAble
                        nullText={'-'}
                        onValueMouseEnter={this.handleCFValueMouseEnter}
                        onValueMouseLeave={this.handleCFValueMouseLeave}
                        onItemMouseEnter={this.handleCFMouseEnter}
                        onItemMouseLeave={this.handleCFMouseLeave}
                        name={'changeFunctionId'}
                        value={params.changeFunctionId}
                        getText={this.cfGetText}
                        getValue={this.cfGetValue}
                        items={changeFunctionsSelectItems}
                        onChange={this.handleChangeChangeFunction}
                    />
                </div>
                {/*<ButtonHK*/}
                {/*    hkLabel={'pattern.hotkeysDescription.video.mirror'}*/}
                {/*    hkData1={patternId}*/}
                {/*    path={`pattern.${patternId}.video.mirrorMode`}*/}
                {/*    className={'mirror-mode'}*/}
                {/*    name={'mirrorMode'}*/}
                {/*    onClick={this.handleChangeMirrorMode}*/}
                {/*    selected={params.mirrorMode === MirrorMode.HORIZONTAL}*/}
                {/*>*/}
                {/*    <span>{t('pattern.video.mirror')}</span>*/}
                {/*</ButtonHK>*/}

                {/*<CycledToggleHK*/}
                {/*    hkLabel={'pattern.hotkeysDescription.video.edgeMode'}*/}
                {/*    hkData1={patternId}*/}
                {/*    path={`pattern.${patternId}.video.edgeMode`}*/}
                {/*    className={'edge-mode'}*/}
                {/*    getValue={this.edgeModeGetValue}*/}
                {/*    getText={this.edgeModeGetText}*/}
                {/*    items={Object.values(EdgeMode)}*/}
                {/*    value={params.edgeMode}*/}
                {/*    name={'edgeMode'}*/}
                {/*    onChange={this.handleChangeEdgeMode}*/}
                {/*/>*/}


                {/*<CycledToggleHK*/}
                {/*    path={`pattern.${patternId}.video.stackType`}*/}
                {/*    className={'stack-type'}*/}
                {/*    hkLabel={'pattern.hotkeysDescription.video.stackType'}*/}
                {/*    hkData1={patternId}*/}
                {/*    getValue={this.stackTypeGetValue}*/}
                {/*    getText={this.stackTypeGetValue}*/}
                {/*    items={Object.values(StackType)}*/}
                {/*    value={params.stackType}*/}
                {/*    name={'stackType'}*/}
                {/*    onChange={this.handleChangeStackType}*/}
                {/*/>*/}

                <VideoOffsetForm
                    patternId={patternId}
                    cameraAxis={params.cameraAxis}
                    onCameraAxisChange={this.handleChangeSlitModeParam}
                    params={params}
                    value={params.offset} onChange={this.handleChangeOffsetForm}/>
            </div>
        )
    }
}

const mapStateToProps: MapStateToProps<VideoControlsStateProps, VideoControlsOwnProps, AppState> = (state, {patternId}) => {
    const changeFunctionId = state.patterns[patternId]?.video?.params?.changeFunctionId

    return {
        changeFunctionsSelectItems: getChangeFunctionsSelectItemsVideo(state),
        videoParams: state.patterns[patternId]?.video?.params ?? getVideoState().params,
        changeFunctionParams: changeFunctionId
            ? state.changeFunctions.functions[changeFunctionId]?.params || null
            : null,
        videoDisabled:
            (!!state.patterns[patternId]?.room?.value?.connected && !state.patterns[patternId]?.room?.value?.meDrawer)
            || !!state.patterns[patternId]?.platformer?.params?.playingOn,
        autoblur: state.hotkeys.autoblur,
        autofocus: state.hotkeys.autofocus,
    }
}

const mapDispatchToProps: MapDispatchToProps<VideoControlsActionProps, VideoControlsOwnProps> = {
    start,
    stop,
    startCamera,
    stopCamera,

    setDevice,
    setCameraAxis,
    setEdgeMode,
    setMirrorMode,
    setStackType,
    setChangeFunction,
    setStackSize,
    setVideoOffset,

    setCFHighlights,
    setCFTypeHighlights,

    setVideoSourceType,
    setVideoSourcePattern,
}

export const VideoControls = connect<VideoControlsStateProps, VideoControlsActionProps, VideoControlsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps,
)(withTranslation('common')(VideoControlsComponent))
