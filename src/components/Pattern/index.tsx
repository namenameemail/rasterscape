import * as React from "react";
import "../../styles/pattern.scss";
import {HistoryControls} from "./HistoryControls";
import {Area} from "../Area";
import {InputNumber} from "../_shared/inputs/InputNumber";
import {RotationControls} from "./Rotating/RotatingControls";
import {RepeatingControls} from "./Repeating/RepeatingControls";
import {SelectionControls} from "./SelectionControls";
import {MaskParams} from "../../store/patterns/mask/types";
import {RotationValue} from "../../store/patterns/rotating/types";
import {ImportParams} from "../../store/patterns/import/types";
import {PatternConfig, UpdateOptions} from "../../store/patterns/pattern/types";
import {StoreState} from "../../store/patterns/store/types";
import {Segments, SelectionState} from "../../store/patterns/selection/types";
import {VideoControls} from "./VideoControls";
import {withTranslation, WithTranslation} from "react-i18next";
import {File} from "../_shared/File/File";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../store";
import {bindMaskCanvas, updateMask} from "../../store/patterns/mask/actions";
import {bindCanvas, doublePattern, editConfig, updateImage} from "../../store/patterns/pattern/actions";
import {setImportParams} from "../../store/patterns/import/actions";
import {RoomControls} from "./Room/RoomControls";
import {BlurControls} from "./Blur/BlurControls";
import {PlatformerControls} from "./Platformer/PlatformerControls";
import '../../styles/inputNumber.scss';
import {createPatternFromSelection, cutPatternBySelection} from "../../store/patterns/selection/actions";
import {ButtonHK} from "../_shared/buttons/hotkeyed/ButtonHK";
import {setDemonstrationEnabled} from "../../store/patterns/demonstration/actions";
import {MaskControls} from "./Mask/MaskControls";
import {DragAndDrop} from "../_shared/File/DragAndDrop/DragAndDrop";
import {readImageFile} from "../_shared/File/helpers";
import {setDrawer} from "../../store/patterns/room/actions";
import {DeleteButton} from "../_shared/buttons/complex/DeleteButton/DeleteButton";
import {HiddenScroll} from "../_shared/HiddenScroll";

export interface PatternComponentStateProps {

    error?: any
    config: PatternConfig
    selection: SelectionState

    maskParams?: MaskParams
    rotation?: RotationValue
    importParams: ImportParams

    height: number
    width: number

    meDrawer: boolean

    demonstration: boolean

    persistDrawer: boolean

    autofocus: boolean
    autoblur: boolean
}

export interface PatternComponentActionProps {

    updateImage(options: UpdateOptions)

    updateMask(id: string, imageData: ImageData)

    editConfig(id: string, config: PatternConfig)

    setImportParams(id: string, value: ImportParams)

    doublePattern(id: string)

    createPatternFromSelection(id: string)

    cutPatternBySelection(id: string)

    setDemonstrationEnabled(id: string, enabled: boolean)

    setDrawer(patternId: string, persist?: boolean)

    bindCanvas(patternId: string, canvas: HTMLCanvasElement)

    bindMaskCanvas(patternId: string, canvas: HTMLCanvasElement)
}

export interface PatternComponentOwnProps {
    id: string
    index: number
}

export interface PatternComponentProps extends PatternComponentStateProps, PatternComponentActionProps, PatternComponentOwnProps, WithTranslation {

    onSelectionChange(id: string, selectionValue: Segments, bBox: SVGRect)

    onRemove(id: string)

    onSetWidth(id: string, width: number)

    onSetHeight(id: string, height: number)


    onLoad(id: string, image)

    onSave(id: string)
}

export interface PatternComponentState {
    error?
}

const inputNumberProps = {min: 0, max: null, step: 1, delay: 1000, notZero: true};

export class PatternComponent extends React.PureComponent<PatternComponentProps, PatternComponentState> {

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.log(error);
        this.setState({error});
    }

    handleImageChange = imageData => this.props.updateImage({id: this.props.id, imageData});

    handleMaskChange = imageData => this.props.updateMask(this.props.id, imageData);

    handleSelectionChange = (value, bBox: SVGRect) =>
        this.props.onSelectionChange(this.props.id, value, bBox);

    handleRemove = () => this.props.onRemove(this.props.id);

    handleDouble = () => this.props.doublePattern(this.props.id);

    handleSetWidth = newWidth => {
        const {onSetWidth, width, id} = this.props;
        if (width !== newWidth) {
            if (newWidth)
                onSetWidth(id, newWidth)
            else
                onSetWidth(id, width)
        }
    };

    handleSetHeight = newHeight => {
        const {onSetHeight, height, id} = this.props;
        if (height !== newHeight) {
            onSetHeight(id, newHeight)
        }
    };


    handleConfigToggle = (data) => {
        this.props.editConfig(this.props.id, {
            ...this.props.config,
            [data.name]: !data.selected
        })
    };

    handleLoad = (image) => {
        this.props.onLoad(this.props.id, image)
    };
    handleSave = () => {
        this.props.onSave(this.props.id)
    };
    handleFitChange = (data) => {
        const {importParams, id} = this.props;
        const {selected} = data;
        this.props.setImportParams(id, {
            ...importParams,
            fit: !selected
        });
    };

    handleCreatePatternFromSelection = () => {
        this.props.createPatternFromSelection(this.props.id)
    };
    handleCutBySelection = () => {
        this.props.cutPatternBySelection(this.props.id)
    };

    handleDemonstrationUnload = () => {

        const {setDemonstrationEnabled, id} = this.props;

        setDemonstrationEnabled?.(id, false);
    };

    handleDropFiles = async (files) => {
        const {onLoad, id} = this.props;
        const image = await readImageFile(files?.[0]);

        onLoad?.(id, image)
    };

    handleEnterDraw = () => {
        const {setDrawer, id, persistDrawer} = this.props;
        !persistDrawer && setDrawer(id);
    };
    handleLeaveDraw = () => {
        const {setDrawer, id, persistDrawer} = this.props;
        !persistDrawer && setDrawer(id);
    };


    handleCanvasRef = (canvas: HTMLCanvasElement) => {
        const {bindCanvas, id} = this.props;
        if (canvas)
            bindCanvas(id, canvas);
    };
    handleMaskCanvasRef = (canvas: HTMLCanvasElement) => {
        const {bindMaskCanvas, id} = this.props;
        if (canvas)
            bindMaskCanvas(id, canvas);
    };

    render() {
        if (this.state?.error || this.props.error) return 'error';
        const {
            height, width,
            id, index,
            config, selection, rotation,
            meDrawer,
            demonstration,
            t,
            autoblur, autofocus
        } = this.props;

        return (
            <DragAndDrop onDrop={this.handleDropFiles}>
                <div className="pattern-canvas-scroll-content">
                <div
                    className="pattern"
                    id={'pattern' + id}
                >
                    <HiddenScroll className="pattern-left">
                    <div className="pattern-left-inner">

                        <div className="flex-col">

                            {config.repeating &&
                            <RepeatingControls patternId={id}/>}

                            {config.video &&
                            <VideoControls patternId={id}/>}

                            {config.blur &&
                            <BlurControls patternId={id}/>}

                            {config.platformer &&
                            <PlatformerControls patternId={id}/>}

                            {config.rotation &&
                            <RotationControls patternId={id}/>}

                            {config.room &&
                            <RoomControls patternId={id}/>}

                            <div className={'flex-row'}>
                                <ButtonHK
                                    path={`pattern.${id}.repeating`}
                                    name={"repeating"}
                                    hkLabel={'pattern.hotkeysDescription.config.repeating'}
                                    hkData1={id}
                                    selected={config.repeating}
                                    onClick={this.handleConfigToggle}
                                >
                                    {t('plugins.repeating')}</ButtonHK>
                                <ButtonHK
                                    path={`pattern.${id}.room`}
                                    name={"room"}
                                    hkLabel={'pattern.hotkeysDescription.config.room'}
                                    hkData1={id}
                                    selected={config.room}
                                    onClick={this.handleConfigToggle}
                                    disabled
                                >
                                    {t('plugins.room')}</ButtonHK>
                                <ButtonHK
                                    path={`pattern.${id}.video`}
                                    name={"video"}
                                    hkLabel={'pattern.hotkeysDescription.config.video'}
                                    hkData1={id}
                                    selected={config.video}
                                    onClick={this.handleConfigToggle}
                                >
                                    {t('plugins.video')}</ButtonHK>
                                <ButtonHK
                                    path={`pattern.${id}.rotation`}
                                    name={"rotation"}
                                    hkLabel={'pattern.hotkeysDescription.config.rotation'}
                                    hkData1={id}
                                    selected={config.rotation}
                                    onClick={this.handleConfigToggle}
                                >
                                    {t('plugins.rotating')}</ButtonHK>
                                <ButtonHK
                                    path={`pattern.${id}.mask`}
                                    name={"mask"}
                                    hkLabel={'pattern.hotkeysDescription.config.mask'}
                                    hkData1={id}
                                    selected={config.mask}
                                    onClick={this.handleConfigToggle}
                                >
                                    {t('plugins.mask')}</ButtonHK>
                                <ButtonHK
                                    path={`pattern.${id}.blur`}
                                    name={"blur"}
                                    hkLabel={'pattern.hotkeysDescription.config.blur'}
                                    hkData1={id}
                                    selected={config.blur}
                                    onClick={this.handleConfigToggle}
                                >
                                    {t('plugins.blur')}</ButtonHK>
                                <ButtonHK
                                    path={`pattern.${id}.platformer`}
                                    name={"platformer"}
                                    hkLabel={'pattern.hotkeysDescription.config.platformer'}
                                    hkData1={id}
                                    selected={config.platformer}
                                    onClick={this.handleConfigToggle}
                                >
                                    {t('plugins.platformer')}</ButtonHK>
                            </div>

                        </div>
                        <div className={'flex-row'}>
                            {config.history &&
                            <HistoryControls patternId={id}/>}
                            <div className={'flex-col'}>
                                <div className={'flex-row'}>
                                    <InputNumber
                                        autoblur={autoblur}
                                        autofocus={autofocus}
                                        className={"size-input-number"}
                                        onChange={this.handleSetWidth}
                                        value={width}
                                        {...inputNumberProps}/>
                                    <InputNumber
                                        autoblur={autoblur}
                                        autofocus={autofocus}
                                        className={"size-input-number"}
                                        onChange={this.handleSetHeight}
                                        value={height}
                                        {...inputNumberProps}/>
                                </div>
                                <div className={'flex-row'}>
                                    <ButtonHK
                                        selected={this.props.importParams.fit}
                                        onClick={this.handleFitChange}>{t('patternControls.stretch')}</ButtonHK>
                                    <File
                                        autofocus={autofocus}
                                        autoblur={autofocus}

                                        name={id + '-fileInput'}
                                        onChange={this.handleLoad}>{t('patternControls.load')}</File>
                                </div>
                            </div>

                        </div>
                        <div className="flex-row">

                            <DeleteButton
                                title={`${t('utils.p')}${id} (${index + 1})`}
                                deleteText={t('utils.delete')}
                                onDoubleClick={this.handleRemove}
                            />
                            <ButtonHK
                                hkLabel={'pattern.hotkeysDescription.double'}
                                hkData1={id}
                                path={`pattern.${id}.double`}
                                onClick={this.handleDouble}>{t('patternControls.double')}</ButtonHK>
                            <ButtonHK
                                hkLabel={'pattern.hotkeysDescription.save'}
                                hkData1={id}
                                path={`pattern.${id}.save`}
                                onClick={this.handleSave}>{t('patternControls.save')}</ButtonHK>

                        </div>
                    </div>
                    </HiddenScroll>

                    <div className="right">
                        <SelectionControls
                            patternId={id}
                        />

                        <div className={"areas"}>
                            <Area
                                // onEnterDraw={this.handleEnterDraw}
                                // onLeaveDraw={this.handleLeaveDraw}

                                disabled={!meDrawer}

                                name={id}
                                rotation={rotation}

                                width={width}
                                height={height}

                                selectionValue={selection.value.segments}
                                selectionParams={selection.params}

                                onImageChange={this.handleImageChange}
                                onSelectionChange={this.handleSelectionChange}

                                demonstration={demonstration}
                                onDemonstrationUnload={this.handleDemonstrationUnload}

                                onCanvasRef={this.handleCanvasRef}
                            />
                            {config.mask && (
                                <Area

                                    mask

                                    name={id}
                                    rotation={rotation}

                                    width={width}
                                    height={height}

                                    selectionValue={selection.value.segments}
                                    selectionParams={selection.params}

                                    onImageChange={this.handleMaskChange}
                                    onSelectionChange={this.handleSelectionChange}

                                    onCanvasRef={this.handleMaskCanvasRef}
                                >
                                    <MaskControls
                                        patternId={id}
                                    />
                                </Area>
                            )}
                        </div>
                    </div>

                </div>
                </div>
            </DragAndDrop>
        );
    }
}


const mapStateToProps: MapStateToProps<PatternComponentStateProps, PatternComponentOwnProps, AppState> = (state, {id}) => {
    const pattern = state.patterns[id];
    return {
        error: pattern.error,
        importParams: pattern.import.params,
        meDrawer: !pattern.room?.value?.connected || pattern.room?.value?.meDrawer,
        config: pattern.config,
        width: pattern.width,
        height: pattern.height,
        selection: pattern?.selection,
        rotation: pattern.config.rotation ? pattern?.rotation?.value : null,
        demonstration: pattern?.demonstration?.value?.enabled,
        persistDrawer: pattern?.room?.value?.persistMeDrawer,
        autofocus: state.hotkeys.autofocus,
        autoblur: state.hotkeys.autoblur,
    }
};

const mapDispatchToProps: MapDispatchToProps<PatternComponentActionProps, PatternComponentOwnProps> = {
    updateImage,
    updateMask,
    editConfig,
    setImportParams,
    doublePattern,
    createPatternFromSelection,
    cutPatternBySelection,
    setDemonstrationEnabled,
    setDrawer,
    bindCanvas,
    bindMaskCanvas,
};

export const Pattern = connect<PatternComponentStateProps, PatternComponentActionProps, PatternComponentOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation("common")(PatternComponent));

