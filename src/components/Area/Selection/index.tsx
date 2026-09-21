import * as React from "react";
import {CSSProperties} from "react";
import {pointsDistance} from "../../../utils/geometry";
import {SVG} from "../../_shared/SVG";
import * as d3 from "d3";
import {
    EPathModeType,
    ESegType,
    getLastSlice,
    getNearestSegment,
    NearestSegmentData,
    Path,
    Segment,
    stringToPathData
} from "../../../utils/path";
import {arrayToSelectItems} from "../../../utils/utils";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import classNames from "classnames";
import {EToolType} from "../../../store/tool/types";
import {CurveValueName, ECurveType, ESelectionMode, SelectToolParams} from "../../../store/selectTool/types";
import "./selection.scss"
import {Segments, SelectionParams} from "../../../store/patterns/selection/types";


const lineFunction = d3
    .line<Segment>()
    .x(({values}) => values ? values[0] : 0)
    .y(({values}) => values ? values[1] : 0)
    .defined(({values}) => !!values);


const HANDLER_SIZE = 5;

const differenceStyle: CSSProperties = {mixBlendMode: 'difference'};

export const selectionModesSelectItems = arrayToSelectItems(
    [ESelectionMode.Rect, ESelectionMode.Line, ESelectionMode.Points]);

export const curveTypesSelectItems = arrayToSelectItems(Object.values(ECurveType), undefined, (item: string) => item[5].toLowerCase() + item.slice(6));

export interface CanvasSelectionStateProps {
    currentTool: EToolType
    selectToolParams: SelectToolParams
}

export interface CanvasSelectionActionProps {
}

export interface CanvasSelectionOwnProps {
    isActive: boolean
    isUnable?: boolean
    params: SelectionParams

    name: any
    width: number
    height: number

    value?: Segments
    className?: string
    style?: any
    transparent?: boolean

    onChange?(value: any, bBox: SVGRect)
}

export interface CanvasSelectionProps extends CanvasSelectionStateProps, CanvasSelectionActionProps, CanvasSelectionOwnProps {

}

export interface CanvasSelectionState {

    startX: number
    startY: number
    offsetX: number
    offsetY: number
    points: any[]
    closed: boolean
    path: any[]
    prevPath: any[] // нужно чтобы знать когда обновлять стейт из пропсов
    curvePath: any[]
    currentSliceN: number
    cursor?: SelectionCursorType
}

export enum SelectionCursorType {
    def = 'def', //default
    end = 'end',
}

class CanvasSelectionComponent extends React.PureComponent<CanvasSelectionProps, CanvasSelectionState> {

    canvasRef;
    pathRef;
    pathRefWhiteDash;
    pathPointsRef;
    maskPathRef;
    maskRef;

    static getDerivedStateFromValue = (value?: Segments) => {
        return {
            prevPath: value,
            path: value,
            currentSliceN: value.filter(({type}) => type === ESegType.M).length,
        }
    }

    static getDerivedStateFromProps(nextProps: CanvasSelectionProps, prevState) {
        const {value} = nextProps;

        return (
            Array.isArray(value) && value !== prevState.prevPath
                ? CanvasSelectionComponent.getDerivedStateFromValue(value)
                : {}
        );
    }

    constructor(props) {
        super(props);

        const {value} = props;

        this.canvasRef = React.createRef();
        this.pathRef = React.createRef();
        this.pathRefWhiteDash = React.createRef();
        this.pathPointsRef = React.createRef();
        this.maskPathRef = React.createRef();
        this.maskRef = React.createRef();

        this.state = {
            startX: null,
            startY: null,
            offsetX: null,
            offsetY: null,
            points: [],
            closed: true,
            path: [],
            prevPath: null,
            curvePath: [],
            currentSliceN: 0,
            cursor: SelectionCursorType.def,
            ...(
                Array.isArray(value)
                    ? CanvasSelectionComponent.getDerivedStateFromValue(value)
                    : {}
            )
        };
    }

    componentDidMount() {
        const {value} = this.props;
        Array.isArray(value) && this.setState({
            path: value,
            currentSliceN: value.filter(({type}) => type === ESegType.M).length
        })


        // let ii = 0
        // setInterval(() => {
        //     ii = ii % 20;
        //     if (this.pathRef.current)
        //         this.pathRef.current.strokeDasharray = `${ii}, ${20 - ii}`
        // }, 200);


        this.maskPathRef.current && this.maskPathRef.current.setPathData(this.state.path);
        this.pathRef.current && this.pathRef.current.setPathData(this.state.path);
        this.pathRefWhiteDash.current && this.pathRefWhiteDash.current.setPathData(this.state.path);
    }

    componentDidUpdate(prevProps: CanvasSelectionProps) {
        if (prevProps.selectToolParams.mode !== this.props.selectToolParams.mode) {
            this.selectToolHandlers[prevProps.selectToolParams.mode].exit(this.props.selectToolParams.mode)
        }

        this.maskPathRef.current && this.maskPathRef.current.setPathData(this.state.path);
        this.pathRef.current && this.pathRef.current.setPathData(this.state.path);
        this.pathRefWhiteDash.current && this.pathRefWhiteDash.current.setPathData(this.state.path);
    }

    commitChanges = () => {
        const {onChange} = this.props;

        onChange && onChange(this.state.path, this.maskPathRef.current && this.maskPathRef.current.getBBox());
    };

    isClosedOrEmptyPath = () => {
        const {path} = this.state;
        return !path.length || path[path.length - 1].type === ESegType.Z;
    };

    isSecondPoint = () => {
        const {path} = this.state;
        return path.length && path[path.length - 1].type === ESegType.M;
    };

    selectToolHandlers: {
        [mode: string]: {
            down(e?)
            up(e?)
            drag(e?)
            exit(e?)
            move?(e?)
        }
    } = {
        [ESelectionMode.Rect]: ({
            down: e => {
                const {path} = this.state;
                const {selectToolParams: {autoReset}} = this.props;

                if (!autoReset) {
                    if (path.length) {

                        const nearest: NearestSegmentData = getNearestSegment(path, e.offsetX, e.offsetY);

                        if (nearest && nearest.distance < HANDLER_SIZE * 2) {

                            if (nearest.slice.length !== 5) {
                                return this.setState(state => ({
                                    startX: e.offsetX,
                                    startY: e.offsetY,
                                    offsetX: 0,
                                    offsetY: 0,
                                    currentSliceN: nearest.sliceN,
                                    path: Path[EPathModeType.Rect](state.path, [e.offsetX, e.offsetY, e.offsetX, e.offsetY], nearest.sliceN)
                                }));
                            } else {

                                const oppositeIndex = (nearest.startInSlice + 2) % 4;
                                const oppositeSeg = nearest.slice[oppositeIndex];

                                const offsetX = nearest.segment.values[0] - e.offsetX;
                                const offsetY = nearest.segment.values[1] - e.offsetY;

                                const startX = oppositeSeg.values[0];
                                const startY = oppositeSeg.values[1];

                                return this.setState(state => ({
                                    startX, startY,
                                    offsetX, offsetY,
                                    currentSliceN: nearest.sliceN,
                                    path: Path[EPathModeType.Rect](state.path, [startX, startY, e.offsetX + offsetX, e.offsetY + offsetY], nearest.sliceN)
                                }));
                            }
                        }
                    }
                    this.setState(({currentSliceN, path}) => ({
                        offsetX: 0,
                        offsetY: 0,
                        startX: e.offsetX,
                        startY: e.offsetY,
                        path: Path[EPathModeType.Rect](path, [e.offsetX, e.offsetY, e.offsetX, e.offsetY], currentSliceN)
                    }));
                } else {
                    this.setState(({currentSliceN, path}) => ({
                        currentSliceN: 0,
                        offsetX: 0,
                        offsetY: 0,
                        startX: e.offsetX,
                        startY: e.offsetY,
                        path: Path[EPathModeType.Rect]([], [e.offsetX, e.offsetY, e.offsetX, e.offsetY], 0)
                    }));
                }

            },
            drag: e => {
                this.setState(({path, startX, startY, offsetX, offsetY, currentSliceN}) => ({
                    path: Path[EPathModeType.Rect](path, [startX, startY, e.offsetX, e.offsetY], currentSliceN)
                }));
            },
            up: () => {
                this.setState(state => ({
                    startX: 0, startY: 0, offsetX: 0, offsetY: 0,
                    currentSliceN: state.path.filter(({type}) => type === ESegType.M).length
                }), this.commitChanges);
            },
            exit: (nextMode) => {
            },
        }),
        [ESelectionMode.SimplePoints]: { // OLD OLD OLD OLD
            down: e => {
                const {path, curvePath} = this.state;

                if (!path.length || path[path.length - 1].type === ESegType.Z) {
                    this.setState(({path}) => ({
                        path: Path[EPathModeType.M](path, [e.offsetX, e.offsetY])
                    }));
                } else {

                    if (curvePath.length) {
                        this.setState(({path, currentSliceN}) => ({
                            curvePath: [],
                            path: Path[EPathModeType.Slice](path, curvePath, currentSliceN)
                        }))
                    }

                    const subFirst = path.filter(({type}) => type === ESegType.M).reverse()[0];

                    if (pointsDistance(e.offsetX, e.offsetY, subFirst.values[0], subFirst.values[1]) < HANDLER_SIZE * 2) {
                        this.setState(({path}) => ({
                            path: Path[EPathModeType.Z](path),
                            currentSliceN: path.filter(({type}) => type === ESegType.M).length
                        }), this.commitChanges);
                    } else {
                        this.setState(({path}) => ({
                            path: Path[EPathModeType.L](path, [e.offsetX, e.offsetY])
                        }));
                    }
                }
            },
            drag: () => undefined,
            up: () => undefined,
            exit: (nextMode) => {
                const {path} = this.state;
                if (path && path.length && path[path.length - 1].type !== ESegType.Z && nextMode !== ESelectionMode.Points) {
                    this.setState(({path}) => ({
                        curvePath: [],
                        path: Path[EPathModeType.Z](path),
                        currentSliceN: path.filter(({type}) => type === ESegType.M).length
                    }), this.commitChanges);
                }
            },
        },
        [ESelectionMode.Points]: ({
            down: e => {
                const {path, curvePath} = this.state;
                const {selectToolParams: {autoReset}} = this.props;

                if (!path.length) {
                    // если пустой путь

                    const curvePath = Path[EPathModeType.M](this.state.curvePath, [e.offsetX, e.offsetY]);

                    this.setState(({path}) => ({
                        curvePath,
                        path: Path[EPathModeType.M](path, [e.offsetX, e.offsetY])
                    }));
                } else if (path[path.length - 1].type === ESegType.Z) {
                    // если закрытый

                    const curvePath = Path[EPathModeType.M](this.state.curvePath, [e.offsetX, e.offsetY]);

                    if (autoReset) {
                        this.setState(() => ({
                            curvePath,
                            path: Path[EPathModeType.M]([], [e.offsetX, e.offsetY])
                        }));
                    } else {
                        this.setState(({path}) => ({
                            curvePath,
                            path: Path[EPathModeType.M](path, [e.offsetX, e.offsetY])
                        }));
                    }
                } else {
                    if (!curvePath.length) {
                        this.setState(({path}) => ({curvePath: getLastSlice(path)}))
                    }
                    const subFirst = path.filter(({type}) => type === ESegType.M).reverse()[0];

                    if (pointsDistance(e.offsetX, e.offsetY, subFirst.values[0], subFirst.values[1]) < HANDLER_SIZE * 2) {
                        // если пришли к началу

                        this.setState(({path, curvePath}) => {
                            let newCurvePath = Path[EPathModeType.L](curvePath, [subFirst.values[0], subFirst.values[1]]);
                            newCurvePath = Path[EPathModeType.Z](newCurvePath);

                            return {
                                curvePath: [],
                                path: Path[EPathModeType.Z](this.line(path, newCurvePath)),
                                currentSliceN: path.filter(({type}) => type === ESegType.M).length,
                                cursor: SelectionCursorType.def
                            }
                        }, this.commitChanges);
                    } else {
                        // следующая точкка

                        this.setState(({path, curvePath}) => {
                            const newCurvePath = Path[EPathModeType.L](curvePath, [e.offsetX, e.offsetY]);

                            return {
                                curvePath: newCurvePath,
                                path: this.line(path, newCurvePath)
                            }
                        });
                    }
                }
            },
            drag: () => undefined, // можно сделать чтобы последняя точка перетаскивалась пока держишь
            up: () => undefined,
            exit: (nextMode) => {
                const {path} = this.state;
                if (path && path.length && path[path.length - 1].type !== ESegType.Z && nextMode !== ESelectionMode.Points) {
                    this.setState(({path}) => ({
                        curvePath: [],
                        path: Path[EPathModeType.Z](path),
                        currentSliceN: path.filter(({type}) => type === ESegType.M).length
                    }), this.commitChanges);
                }
            },
            move: (e) => {

                const {path, cursor} = this.state;

                if (!path.length || path[path.length - 1].type === ESegType.Z) {
                    if (cursor !== SelectionCursorType.def)
                        this.setState({cursor: SelectionCursorType.def});
                    return;
                }

                const subFirst = path.filter(({type}) => type === ESegType.M).reverse()[0];
                if (pointsDistance(e.offsetX, e.offsetY, subFirst.values[0], subFirst.values[1]) < HANDLER_SIZE * 2) {
                    if (cursor !== SelectionCursorType.end)
                        this.setState({cursor: SelectionCursorType.end});
                } else {
                    if (cursor !== SelectionCursorType.def)
                        this.setState({cursor: SelectionCursorType.def});
                }
            }
        }),
        [ESelectionMode.Line]: {
            down: e => {

                const {selectToolParams: {autoReset}} = this.props;

                this.setState(({path}) => ({
                    path: Path[EPathModeType.M](autoReset ? [] : path, [e.offsetX, e.offsetY])
                }));
            },
            drag: e => {
                this.setState(({path}) => ({
                    path: Path[EPathModeType.L](path, [e.offsetX, e.offsetY])
                }));
            },
            up: e => {
                this.setState(({path}) => ({
                    path: Path[EPathModeType.Z](path),
                    currentSliceN: path.filter(({type}) => type === ESegType.M).length
                }), this.commitChanges);
            },
            exit: (nextMode) => {
            }
        }
    };

    line = (path, line) => {
        const {selectToolParams} = this.props;
        const {curveType} = selectToolParams;
        const curveValue = selectToolParams[CurveValueName[curveType]];

        let curve = d3[curveType || "curveLinear"];
        if (Object.keys(CurveValueName).indexOf(curveType) !== -1)
            curve = curve[CurveValueName[curveType]](curveValue);

        return Path[EPathModeType.Slice](
            path,
            stringToPathData(
                lineFunction.curve(curve)(getLastSlice(line))),
            this.state.currentSliceN);
    };

    render() {
        const {
            width, height,
            selectToolParams: {mode},
            isActive, isUnable,
            name, style,
            transparent,
        } = this.props;

        const {path} = this.state;

        // const subFirst = this.isSecondPoint() && path.filter(({type}) => type === ESegType.M).reverse()[0];
        const subFirst = !this.isClosedOrEmptyPath() && path.filter(({type}) => type === ESegType.M).reverse()[0];

        return (
            <div
                style={style}
                className={classNames("selection", {
                    ["selectionActive"]: isActive,
                    ["selectionUnable"]: isUnable,
                    ["cursorEnd"]: this.state.cursor === SelectionCursorType.end,
                })}>
                <SVG
                    width={width}
                    height={height}
                    onMove={this.selectToolHandlers[mode].move}
                    onDown={this.selectToolHandlers[mode].down}
                    onDrag={this.selectToolHandlers[mode].drag}
                    onUp={this.selectToolHandlers[mode].up}>
                    {this.state.path && this.state.path.length && <>
                        <mask
                            id={`selectionMask${name}`}
                            ref={this.maskRef}>
                            <rect
                                x="0" y="0"
                                width={width}
                                height={height}
                                fill="white"
                            />
                            <path
                                ref={this.maskPathRef}
                                fillOpacity={1}
                                fill="black"
                            />
                        </mask>
                        {!transparent && (
                            <rect
                                x="0" y="0"
                                width={width}
                                height={height}
                                fill="black"
                                fillOpacity={0.2}
                                mask={`url(#selectionMask${name})`}
                            />
                        )}

                        <path
                            ref={this.pathRef}
                            fillOpacity={0}
                            fill="black"
                            className={'selection-path'}
                        />
                        <path
                            ref={this.pathRefWhiteDash}
                            fillOpacity={0}
                            fill="black"
                            className={'selection-path-white-dash'}
                        />
                        {/*ПЕРВАЯ ТОЧКА*/}
                        {(subFirst) && (
                            <rect
                                x={subFirst.values[0] - 2}
                                y={subFirst.values[1] - 2}
                                width={4}
                                height={4}
                                fillOpacity={1}
                                fill="white"
                                stroke={"black"}
                                strokeWidth={1}
                            />
                        )}
                    </>}
                </SVG>
            </div>
        )
    }
}

const mapStateToProps: MapStateToProps<CanvasSelectionStateProps, CanvasSelectionOwnProps, AppState> = state => ({
    selectToolParams: state.selectTool.params,
    currentTool: state.tool.current
});

const mapDispatchToProps: MapDispatchToProps<CanvasSelectionActionProps, CanvasSelectionOwnProps> = {};

export const Selection = connect<CanvasSelectionStateProps, CanvasSelectionActionProps, CanvasSelectionOwnProps, AppState>(
    mapStateToProps, mapDispatchToProps
)(CanvasSelectionComponent);