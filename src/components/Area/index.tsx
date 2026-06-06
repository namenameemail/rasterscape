import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../store";
import {EToolType, selectionTools} from "../../store/tool/types";
import {Selection} from "./Selection";
import {Draw} from "./Draw";
import "./area.scss";
import cn from "classnames";
import {RotationValue} from "../../store/patterns/rotating/types";
import {Segments, SelectionParams, SelectionValue} from "../../store/patterns/selection/types";
import {EBrushType} from "../../store/brush/types";

export interface AreaStateProps {
    currentTool: EToolType
    brushType: EBrushType
    selectUnable: boolean
}

export interface AreaActionProps {
}

export interface AreaOwnProps {
    children?: React.ReactNode
    disabled?: boolean
    mask?: boolean
    name: any // нужен для маски выделения
    height: number
    width: number
    rotation?: RotationValue

    // imageValue: ImageData
    selectionValue: Segments
    selectionParams: SelectionParams

    onImageChange(imageData: ImageData): void

    onSelectionChange(selectionValue: SelectionValue, bBox: SVGRect): void

    demonstration?: boolean

    onDemonstrationUnload?(): void

    onEnterDraw?(e?: any): void

    onLeaveDraw?(e?: any): void

    onCanvasRef?(canvas: HTMLCanvasElement): void
}

export interface AreaProps extends AreaStateProps, AreaActionProps, AreaOwnProps {

}

export interface AreaState {
    rotation?: RotationValue
    style?: any
    areaStyle?: any
    centerStyle?: any
    rotationCenterStyle?: any
    offsetCenterStyle?: any
}

const getAreaStyle = (rotation: RotationValue, width, height) => rotation?.rotateDrawAreaElement ? {
    transform: `translateX(${rotation.offset.xd}px) translateY(${-rotation.offset.yd}px)`,
} : null;

const getStyle = (rotation: RotationValue, width, height) => rotation?.rotateDrawAreaElement ? {
    transformOrigin: `${width / 2 + rotation.offset?.xc}px ${height / 2 - rotation.offset?.yc}px`,
    transform: `rotate(${rotation.angle}deg)`,
} : null;
const getRotationCenterStyle = (rotation: RotationValue, width, height) => rotation?.rotateDrawAreaElement ? {
    transform: `translateX(${width / 2 + rotation.offset?.xc}px) translateY(${height / 2 - rotation.offset?.yc}px)`,
} : null;
const getOffsetCenterStyle = (rotation: RotationValue, width, height) => rotation?.rotateDrawAreaElement ? {
    transform: `translateX(${width / 2 - rotation.offset?.xd}px) translateY(${height / 2 + rotation.offset?.yd}px)`,
} : null;
const getCenterStyle = (rotation: RotationValue, width, height) => rotation?.rotateDrawAreaElement ? {
    transform: `translateX(${width / 2}px) translateY(${height / 2}px)`,
} : null;

class AreaComponent extends React.PureComponent<AreaProps, AreaState> {


    constructor(props) {
        super(props);
        this.state = {
            style: getStyle(props.rotation, props.width, props.height),
            areaStyle: getAreaStyle(props.rotation, props.width, props.height),
            rotationCenterStyle: getRotationCenterStyle(props.rotation, props.width, props.height),
            offsetCenterStyle: getOffsetCenterStyle(props.rotation, props.width, props.height),
            centerStyle: getCenterStyle(props.rotation, props.width, props.height),
            rotation: props.rotation
        };
    }


    static getDerivedStateFromProps(props, state) {
        // if (state.rotation !== props.rotation) {
        return {
            rotation: props.rotation,
            style: getStyle(props.rotation, props.width, props.height),
            areaStyle: getAreaStyle(props.rotation, props.width, props.height),
            rotationCenterStyle: getRotationCenterStyle(props.rotation, props.width, props.height),
            offsetCenterStyle: getOffsetCenterStyle(props.rotation, props.width, props.height),
            centerStyle: getCenterStyle(props.rotation, props.width, props.height),
        }
        // }
    }

    render() {
        const {
            mask,
            currentTool,
            brushType,
            name,
            height,
            width,
            // imageValue,
            selectionValue,
            selectionParams,
            onImageChange,
            onSelectionChange,
            rotation,
            disabled,
            selectUnable,
            demonstration,
            onDemonstrationUnload,
            children,
            onEnterDraw,
            onLeaveDraw,
            onCanvasRef
        } = this.props;

        const isSelectionTool = selectionTools.indexOf(currentTool) !== -1;
        return (
            <div
                style={this.state.areaStyle}
                className={cn("area", {
                    'area-selection-on': isSelectionTool
                })}
            >
                <Draw
                    patternId={name}
                    onEnterDraw={onEnterDraw}
                    onLeaveDraw={onLeaveDraw}
                    disabled={disabled}
                    mask={mask}
                    style={this.state.style}
                    rotation={rotation}
                    // value={imageValue}
                    width={width}
                    height={height}
                    onChange={onImageChange}
                    demonstration={demonstration}
                    onDemonstrationUnload={onDemonstrationUnload}
                    onCanvasRef={onCanvasRef}
                >
                    <Selection
                        // style={this.state.style}
                        isUnable={selectUnable}
                        isActive={isSelectionTool}
                        name={name}
                        width={width}
                        height={height}
                        value={selectionValue}
                        params={selectionParams}
                        onChange={onSelectionChange}
                        transparent={currentTool === EToolType.Brush && brushType === EBrushType.Select}
                    />
                </Draw>
                {rotation?.changing && (
                    <>
                        <div
                            className={'area-center'}
                            style={this.state.rotationCenterStyle}
                        />
                        <div
                            className={'area-center'}
                            style={this.state.offsetCenterStyle}
                        />
                        <div
                            className={'area-center'}
                            style={this.state.centerStyle}
                        />
                    </>
                )}
                {children}
            </div>
        );
    }
}

const mapStateToProps: MapStateToProps<AreaStateProps, AreaOwnProps, AppState> = (state, {name}) => ({
    currentTool: state.tool.current,
    brushType: state.brush.params.brushType,
    selectUnable: false,//state.tool.current === EToolType.Line
});

const mapDispatchToProps: MapDispatchToProps<AreaActionProps, AreaOwnProps> = {};

export const Area = connect<AreaStateProps, AreaActionProps, AreaOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(AreaComponent);
