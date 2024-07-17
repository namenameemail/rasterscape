import * as React from 'react'
import * as cn from 'classnames'
import {VideoParams} from '../../../store/patterns/video/types'
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
} from '../../../store/patterns/video/actions'
import {getChangeFunctionsSelectItemsVideo} from '../../../store/changeFunctions/selectors'
import {EdgeMode, MirrorMode, SlitMode} from '../../../store/patterns/video/services_DEPREC'
import {StackType} from '../../../store/patterns/video/_old/capture/pixelStack'
import './videoControls.scss'
import {setCFHighlights, setCFTypeHighlights} from '../../../store/changeFunctionsHighlights'
import {SelectButtonsEventData} from '../../_shared/buttons/complex/SelectButtons'
import {CycledToggleHK} from '../../_shared/buttons/hotkeyed/CycledToggleHK'
import {ButtonHK} from '../../_shared/buttons/hotkeyed/ButtonHK'
import {ButtonNumberCF} from '../../_shared/buttons/hotkeyed/ButtonNumberCF'
import {WithTranslation, withTranslation} from 'react-i18next'
import {LabelFormatter} from '../../../store/hotkeys/label-formatters'
import {Translations} from '../../../store/language/helpers'
import {SelectVideoDevice} from 'bbuutoonnss'
import {InputNumber} from '../../_shared/inputs/InputNumber'
import {coordHelper4} from '../../Area/canvasPosition.servise'
import {VideoOffsetForm} from './VideoOffsetForm'
import {CameraAxis} from "../../../store/patterns/_service/patternServices/PatternVideoService/ShaderVideoModule";

export interface VideoControlsStateProps {

    videoParams: VideoParams

    changeFunctionsSelectItems: ChangeFunctionState[]
    videoDisabled: boolean
    changeFunctionParams: any

    autoblur: boolean
    autofocus: boolean
}

export interface VideoControlsActionProps {
    start(id: string)

    stop(id: string)

    startCamera(id: string)

    stopCamera(id: string)

    setCFHighlights(cfName?: string)

    setCFTypeHighlights(cfType?: ECFType[])

    setDevice(id: string, value: MediaDeviceInfo)

    setCameraAxis(id: string, value: CameraAxis)

    setEdgeMode(id: string, value: EdgeMode)

    setMirrorMode(id: string, value: MirrorMode)

    setStackType(id: string, value: StackType)

    setChangeFunction(id: string, value: string)

    setStackSize(id: string, value: number)

    setVideoOffset(id: string, name: string, value: number)
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

const percentRange = [0, 1] as [number, number]
const offsetRange = [-1, 0] as [number, number]
const stackTypeClassNames = {
    [StackType.Right]: 'rightStack',
    [StackType.Left]: 'leftStack',
    [StackType.FromCenter]: 'toCenterStack',
    [StackType.ToCenter]: 'fromCenterStack',
}

const inputNumberProps = {min: 0, max: null, step: 1, delay: 1000, notZero: true}

export class VideoControlsComponent extends React.PureComponent<VideoControlsProps, VideoControlsState> {

    capture
    sketch
    stream

    state = {
        pause: false,
        cutOffsetStyles: null,
    }


    componentDidUpdate(prevProps: Readonly<VideoControlsProps>, prevState: Readonly<VideoControlsState>, snapshot?: any): void {

    }

    handleChangeCameraOnParam = (data) => {
        const {videoParams, patternId} = this.props
        videoParams.cameraOn
            ? this.props.stopCamera(patternId)
            : this.props.startCamera(patternId)
    }

    handleChangeUpdatingOnParam = (data) => {
        const {videoParams, patternId} = this.props
        videoParams.updatingOn
            ? this.props.stop(patternId)
            : this.props.start(patternId)
    }

    handleChangeSlitModeParam = (axis: CameraAxis) => {
        const {setCameraAxis, patternId} = this.props
        setCameraAxis(patternId, axis)
    }

    handleChangeEdgeMode = (data) => {
        const {setEdgeMode, patternId} = this.props
        const {value} = data
        setEdgeMode(patternId, value)
    }

    handleChangeMirrorMode = (data) => {
        const {setMirrorMode, patternId} = this.props
        const {value} = data
        setMirrorMode(patternId, data.selected ? MirrorMode.NO : MirrorMode.HORIZONTAL)
    }

    handleChangeStackType = (data) => {
        const {setStackType, patternId} = this.props
        const {value} = data
        setStackType(patternId, value)
    }

    handleChangeChangeFunction = (data) => {
        const {setChangeFunction, patternId} = this.props
        const {value} = data
        setChangeFunction(patternId, value)
    }

    handleClearChangeFunction = () => {
        const {setChangeFunction, patternId} = this.props
        setChangeFunction(patternId, null)
    }

    handleChangeStackSize = (value) => {
        const {setStackSize, patternId} = this.props
        setStackSize(patternId, value)
    }

    handleChangeOffset = (data) => {
        const {setVideoOffset, patternId} = this.props
        const {value, name} = data
        setVideoOffset(patternId, name, value)
    }
    handleChangeOffsetForm = (name, value) => {
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
        setCFTypeHighlights(null)
    }

    handleCFMouseEnter = (data: SelectButtonsEventData) => {
        const {setCFHighlights} = this.props
        setCFHighlights(data?.value?.id)
    }
    handleCFMouseLeave = () => {
        const {setCFHighlights} = this.props
        setCFHighlights(null)
    }

    stackSizeText = (value) => {
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

    edgeModeGetValue = id => id
    edgeModeGetText = (id) => {
        const {t} = this.props
        return t('pattern.video.edgeMode.' + id)
    }

    cameraAxisGetValue = id => id
    cameraAxisGetText = (id) => {
        const {t} = this.props
        return t('pattern.video.cameraAxis.' + id)
    }

    stackTypeGetValue = id => id

    cfGetValue = (item: ChangeFunctionState) => item.id
    cfGetText = (item: ChangeFunctionState) => {
        const {t} = this.props
        return Translations.cfName(t)(item)
    }

    handleDeviceSelect = (device: MediaDeviceInfo) => {
        this.props.setDevice(this.props.patternId, device)

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
        const {cameraOn, updatingOn} = params

        return (
            <div className={'video-controls'}>

                <div className={'video-controls-source'}>
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
                        {/* {cameraOn ? t('pattern.video.stop') : t('pattern.video.camera')} */}
                        {t('pattern.video.camera')}
                    </ButtonHK>
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
                        disabled={videoDisabled}
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

const mapStateToProps: MapStateToProps<VideoControlsStateProps, VideoControlsOwnProps, AppState> = (state, {patternId}) => ({
    changeFunctionsSelectItems: getChangeFunctionsSelectItemsVideo(state),
    videoParams: state.patterns[patternId]?.video?.params || null,
    changeFunctionParams: state.changeFunctions.functions[state.patterns[patternId]?.video?.params?.changeFunctionId]?.params || null,
    videoDisabled: !!state.patterns[patternId]?.room?.value?.connected && !state.patterns[patternId]?.room?.value?.meDrawer,
    autoblur: state.hotkeys.autoblur,
    autofocus: state.hotkeys.autofocus,
})

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
}

export const VideoControls = connect<VideoControlsStateProps, VideoControlsActionProps, VideoControlsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps,
)(withTranslation('common')(VideoControlsComponent))
