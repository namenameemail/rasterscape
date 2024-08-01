import * as React from "react";
import Bezier from "bezier-js";
import "../../Pattern/Repeating/styles.scss";
import {SVG} from "../SVG";
import {
    BezierPoints,
    BezierProps,
    bezierSVG,
    cross,
    CrossSVGProps,
    LineProps,
    lineSVG, RectCenterProps, rectCenterSVG,
    RectProps,
    rectSVG, SquareCenterProps, squareCenterSVG
} from "./_utils";
import {
    createVector,
    Vector,
    vectorAdd,
    vectorMul
} from "../../../utils/vector";
import {RepeatsBezierGridParams} from "../../../store/patterns/repeating/types";

export interface CrossSelectData {
    xn0?: number;
    yn0?: number;
    xn1?: number;
    yn1?: number;
}

export interface BezierCurveRepeatingProps {
    onChange?(points: BezierPoints)
    onPointChange?(point: number, value: Vector)


    onParamChange(param: keyof RepeatsBezierGridParams, value: any)
    onCrossSelect(data: CrossSelectData)

    xd: number
    yd: number
    xn0: number
    yn0: number
    xn1: number
    yn1: number

    value?: BezierPoints

    disabled?: boolean
}

export interface BezierCurveRepeatingState {
    points: BezierPoints
}

const W = 210;
const H = 140;
const WW = 100;
const HH = 100;
const O = {x: 0, y: 0};


type UseMoveHandler = (vec: Vector, e: MouseEvent) => void;

const useMove = (
    onMove: UseMoveHandler,
    onUp?: UseMoveHandler,
) => {
    const [startPoint, setStartPoint] = React.useState<Vector>(null);

    React.useEffect(() => {
        if (startPoint) {

            const moveHandler = (e) => {
                onMove(createVector(e.pageX - startPoint.x, e.pageY - startPoint.y), e);
            };

            const upHandler = (e) => {
                onUp?.(createVector(e.pageX - startPoint.x, e.pageY - startPoint.y), e);
                setStartPoint(null);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
            return () => {
                document.removeEventListener('mousemove', moveHandler);
            };
        }
    }, [startPoint, onMove, onUp]);

    const startMove = React.useCallback((e) => {
        setStartPoint({x: e.pageX, y: e.pageY});
    }, []);

    return startMove;
};

type UseDragHandler = (vec: Vector, e: MouseEvent) => void;
type UseDragUpHandler = (e: MouseEvent) => void;


const useDragPoint = (
    onChange: UseDragHandler,
    scale: number,
    onUp?: UseDragUpHandler,
) => {
    const [startValue, setStartValue] = React.useState<Vector>(null);

    const movePointHandler = React.useCallback((vec: Vector, e: MouseEvent) => {
        onChange(vectorAdd(startValue, vectorMul(vec, 1 / scale)), e);
    }, [startValue, onChange, scale]);

    const upPointHandler = React.useCallback((e) => {
        console.log('up up ---drag point');
        setStartValue(null);
        onUp?.(e);
    }, [onUp]);

    const startMove = useMove(
        movePointHandler,
        upPointHandler,
    );

    const startDragPoint = React.useCallback((e, value) => {
        console.log('start drag point');
        startMove(e)

        setStartValue(value);
    }, [startMove]);

    return startDragPoint;
};

const MIN_WIDTH_0 = 0.1;
const MIN_WIDTH_2 = 0.3;
const MIN_WIDTH_DOT = 0.8;

const FRONT_LINE_WIDTH = 0.3;
const BACK_LINE_WIDTH = 0.2;
const SMALL_CROSS_LINE_WIDTH = 0.5;
const CURVE_LINE_WIDTH = 1;
const CURVE_HELPER_LINE_WIDTH = 0.6;
const CURVE_POINT_LINE_WIDTH = 0.8;
const CURVE_POINT_LINE_MIN_WIDTH = 0.5;
const GRID_DOT_LINE_WIDTH = 1;

const SCALE_SPEED = 800;

export const BezierCurveRepeating: React.FC<BezierCurveRepeatingProps> = (props) => {

    const {
        value,
        disabled,
        onChange,
        onPointChange,
        onParamChange,
        onCrossSelect,
    } = props;

    const [scale, setScale] = React.useState<number>(1);

    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleScaleChange = React.useCallback((e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setScale(Math.max(0, scale + e.deltaY / SCALE_SPEED));
    }, [scale]);

    React.useEffect(() => {
        const container = containerRef.current;

        container?.addEventListener('wheel', handleScaleChange);
        return () => {
            container?.removeEventListener('wheel', handleScaleChange);
        };
    }, [containerRef.current, handleScaleChange]);


    const [offset, setOffset] = React.useState(createVector(W / 2, H / 2));
    const [start, setStart] = React.useState(createVector(-WW / 2, -HH / 2));


    // CURVE
    const curve = React.useMemo<Bezier>(() => {
        return new Bezier(value);
    }, [value]);


    // DRAG POINT
    const [draggedPoint, setDraggedPoint] = React.useState<number>(-1);

    const handlePointChange = React.useCallback((newValue: Vector) => {
        const points = [...curve.points] as BezierPoints;
        points[draggedPoint] = newValue;
        onChange?.(points);
        onPointChange?.(draggedPoint, newValue);
    }, [curve.current, draggedPoint, onPointChange]);

    const startPointChange = useDragPoint(handlePointChange, scale);

    const handleStartChangePoint = React.useCallback((e) => {
        const {index} = e.target.dataset;

        setDraggedPoint(index);
        startPointChange(e, value[index]);
    }, [startPointChange, value]);


    const Rect = React.useMemo<React.FC<RectProps>>(() => {
        return rectSVG(start, scale, offset);
    }, [scale, offset, start]);

    const Line = React.useMemo<React.FC<LineProps>>(() => {
        return lineSVG(start, scale, offset);
    }, [scale, offset, start]);

    const BezierSVG = React.useMemo<React.FC<BezierProps>>(() => {
        return bezierSVG(start, scale, offset);
    }, [scale, offset, start]);


    const CrossSVG = React.useMemo<React.FC<CrossSVGProps>>(() => {
        return cross(start, scale, offset);
    }, [scale, offset, start]);

    const SquareSVG = React.useMemo<React.FC<SquareCenterProps>>(() => {
        return squareCenterSVG(start, scale, offset);
    }, [scale, offset, start]);
    const RectCenterSVG = React.useMemo<React.FC<RectCenterProps>>(() => {
        return rectCenterSVG(start, scale, offset);
    }, [scale, offset, start]);


    const {xd, yd, xn0, yn0, xn1, yn1} = props;

    const [changingCrosses, setChangingCrosses] = React.useState<Vector>(null);

    const handleChangeCross = React.useCallback((v: Vector) => {
        const {x: i, y: j} = v;

        const data = {};
        if (i) {
            const xf = i < 0 ? 'xn0' : 'xn1';
            data[xf] = Math.abs(i);
        } else {
            data['xn0'] = 0;
            data['xn1'] = 0;
        }
        if (j) {
            const yf = j < 0 ? 'yn0' : 'yn1';
            data[yf] = Math.abs(j);
        } else {
            data['yn0'] = 0;
            data['yn1'] = 0;
        }

        onCrossSelect(data);

    }, [onCrossSelect]);

    const handleItemEnter = React.useCallback((e) => {

        if (changingCrosses) {
            const i = +e.target.dataset.i;
            const j = +e.target.dataset.j;


            handleChangeCross(createVector(i, j));
        }
    }, [changingCrosses, handleChangeCross]);

    const handleItemDown = React.useCallback((e) => {
        const startCross = createVector(+e.target.dataset.i, +e.target.dataset.j);
        setChangingCrosses(startCross);

        handleChangeCross(startCross);
        const handleMouseUp = () => {
            setChangingCrosses(null);
            document.removeEventListener('mouseup', handleMouseUp)
        };
        document.addEventListener('mouseup', handleMouseUp);
    }, [handleChangeCross]);

    const i0 = curve.get(1 / (2 * xd)).x;
    const j0 = curve.get(1 / (2 * yd)).y;

    const handleXdChange = React.useCallback((v: Vector) => {
        onParamChange('xd', Math.max(1, Math.round(v.x)));
    }, [onParamChange]);
    const startChangeXd = useDragPoint(handleXdChange, scale * 10);
    const handleChangeXdStart = React.useCallback((e) => {
        startChangeXd(e, createVector(xd, 0));
    }, [startChangeXd, xd]);

    const handleYdChange = React.useCallback((v: Vector) => {
        onParamChange(
            'yd', Math.max(1, Math.round(v.y))
        );
    }, [onParamChange]);
    const startChangeYd = useDragPoint(handleYdChange, scale * 10);
    const handleChangeYdStart = React.useCallback((e) => {
        startChangeYd(e, createVector(0, yd));
    }, [startChangeYd, yd]);

    const grid = React.useMemo(() => {

        const size = 1;
        const cords = [];


        if (disabled) {
            for (let i = -10; i <= 10 + xn1; i++) {
                const ai = WW / xd * i;
                for (let j = -10; j <= 10 + yn1; j++) {

                    const aj = HH / yd * j;

                    cords.push({x: ai, y: aj, i, j});
                }
            }
        } else {

            // const crossesOffset = createVector(1 / (2 * xd), 1 / (2 * yd));
            const crossesOffset = createVector(0,0);

            for (let i = -xn0 - 1; i <= xd + xn1 + 1; i++) {
                const ai = curve.get(i / xd + crossesOffset.x);
                for (let j = -yn0 - 1; j <= yd + yn1 + 1; j++) {

                    const aj = curve.get(j / yd + crossesOffset.y);

                    cords.push({
                        x: ai.x,
                        y: aj.y,
                        i,
                        j,
                        out: i < 0 || i > xd || j < 0 || j > yd,
                        active: i >= -xn0 && i <= xn1 && j >= -yn0 && j <= yn1
                    });
                }
            }
        }


        return (<>
            <CrossSVG
                position={createVector(i0, j0)} size={300}
                strokeWidth={0.5}
                minStrokeWidth={0.3}
                strokeDasharray={2}
                strokeDashoffset={2}
                stroke={'white'}
                pointerEvents="none"
            />
            <Line
                start={createVector(i0, j0 -150)}
                finish={createVector(i0, j0 + 150)}
                strokeWidth={10}
                stroke={'transparent'}
                cursor={'col-resize'}
                onMouseDown={handleChangeXdStart}
            />
            <Line
                start={createVector(i0 -150, j0)}
                finish={createVector(i0+ 150, j0 )}
                strokeWidth={10}
                stroke={'transparent'}
                onMouseDown={handleChangeYdStart}
                cursor={'row-resize'}
            />

            {cords.map(({x, y, i, j, out, active}) => (<>
                {active ? (
                    !out && <CrossSVG
                        opacity={out ? 0.4 : 1}
                        position={createVector(x, y)}
                        size={8}
                        minSize={6}
                        stroke={'white'}
                        strokeWidth={out ? 0.8 : 0.5}
                        minStrokeWidth={out ? 0.8 : 0.5}
                        pointerEvents='none'
                        data={`${i}-${j}`}
                    />
                ) : (
                    !out && <RectCenterSVG
                        opacity={out ? 0.3 : 1}
                        fill={'white'}
                        center={createVector(
                            x,
                            y
                        )}
                        size={createVector(
                            0.8,
                            out ? 4 : 0.8
                        )}
                        minSize={createVector(
                            0.8,
                            out ? 4 : 0.8
                        )}
                        pointerEvents="none"
                        strokeWidth={GRID_DOT_LINE_WIDTH}
                        minStrokeWidth={MIN_WIDTH_DOT}
                    />
                )}
                <RectCenterSVG
                    fill='transparent'
                    center={createVector(x, y)}
                    size={createVector(10, 10)}
                    minSize={createVector(2, 2)}
                    data-id={`${i},${j}`}
                    data-i={i}
                    data-j={j}
                    // cursor={out ? 'crosshair' : 'cell'}
                    cursor={out ? 'se-resize' : 'sw-resize'}
                    onMouseDown={handleItemDown}
                    onMouseEnter={handleItemEnter}
                />
            </>))}


            {/* edges */}
            <Line
                start={createVector(
                    Math.min(value[0].x, value[3].x),
                    Math.min(value[0].y, value[3].y)
                )}
                finish={O}
                strokeWidth={FRONT_LINE_WIDTH}
                minStrokeWidth={MIN_WIDTH_0}
                stroke={'white'}
                pointerEvents="none"
            />
            <Line
                start={createVector(
                    Math.max(value[0].x, value[3].x),
                    Math.max(value[0].y, value[3].y)
                )}
                finish={createVector(
                    WW,
                    HH
                )}
                strokeWidth={FRONT_LINE_WIDTH}
                minStrokeWidth={MIN_WIDTH_0}
                stroke={'white'}
                pointerEvents="none"
            />

            <Line
                start={createVector(
                    Math.min(value[0].x, value[3].x),
                    Math.max(value[0].y, value[3].y)
                )}
                finish={createVector(
                    0,
                    HH
                )}
                strokeWidth={FRONT_LINE_WIDTH}
                minStrokeWidth={MIN_WIDTH_0}
                stroke={'white'}
                pointerEvents="none"
            />
            <Line
                start={createVector(
                    Math.max(value[0].x, value[3].x),
                    Math.min(value[0].y, value[3].y)
                )}
                finish={createVector(
                    WW,
                    0
                )}
                strokeWidth={FRONT_LINE_WIDTH}
                minStrokeWidth={MIN_WIDTH_0}
                stroke={'white'}
                pointerEvents="none"
            />
            <Rect
                start={createVector(
                    Math.min(value[0].x, value[3].x),
                    Math.min(value[0].y, value[3].y)
                )}
                size={createVector(
                    Math.max(value[0].x, value[3].x) - Math.min(value[0].x, value[3].x),
                    Math.max(value[0].y, value[3].y) - Math.min(value[0].y, value[3].y)
                )}
                strokeWidth={FRONT_LINE_WIDTH}
                minStrokeWidth={MIN_WIDTH_0}
                stroke={'white'}
                fillOpacity={0}
                pointerEvents="none"
            />


        </>);
    }, [Line, Rect, disabled, xd, yd, xn0, yn0, xn1, yn1, curve.current, i0, j0, value, handleItemEnter, handleItemDown]);

    // BORDER OF CANVAS
    const border = React.useMemo(() => {
        return (
            <Rect
                start={createVector(0, 0)}
                size={createVector(WW, HH)}
                strokeWidth={BACK_LINE_WIDTH}
                minStrokeWidth={MIN_WIDTH_0}
                stroke="white"
                fill="transparent"
                pointerEvents="none"
            />
        );
    }, [Rect]);

    const line = React.useMemo(() => {
        return (
            <BezierSVG
                points={value}
                color={disabled ? 'grey' : "#ffcd00"}

                curveWidth={CURVE_LINE_WIDTH}
                helperWidth={CURVE_HELPER_LINE_WIDTH}
            />
        )
    }, [BezierSVG, value]);

    const points = React.useMemo(() => {
        const point_w = 5;
        return value.map(({x, y}, index) =>
            <SquareSVG
                center={createVector(
                    x,
                    y
                )}
                size={point_w}
                minSize={3}
                strokeWidth={CURVE_POINT_LINE_WIDTH}
                minStrokeWidth={CURVE_POINT_LINE_MIN_WIDTH}
                className={'bezier-point'}
                data-index={index}
                onMouseDown={handleStartChangePoint}
                stroke="white"
                fill="black"
            />
        );
    }, [Rect, value, scale]);

    const handleOffsetChange = React.useCallback((v: Vector) => {
        setStart(v)
    }, []);

    const [offsetChanging, setOffsetChanging] = React.useState<boolean>(false);
    const handleOffsetChangeEnd = React.useCallback(() => {
        setOffsetChanging(false);
    }, []);

    const startOffsetChange = useDragPoint(handleOffsetChange, scale, handleOffsetChangeEnd);

    const handleOffsetHandlerDown = React.useCallback((e) => {
        startOffsetChange(e, start);
        setOffsetChanging(true);
    }, [start]);

    const resetOffsetAndScale = React.useCallback(() => {
        setScale(1);
        setStart(createVector(-WW / 2, -HH / 2));
    }, []);
    const offsetHandler = React.useMemo(() => {
        return (
            <rect
                x={0}
                y={0}
                width={W}
                height={H}
                fill="transparent"
                cursor={offsetChanging ? 'grabbing' : 'grab'}
                onMouseDown={handleOffsetHandlerDown}
                onDoubleClick={resetOffsetAndScale}
            />
        );
    }, [handleOffsetHandlerDown, resetOffsetAndScale, offsetChanging]);


    return (
        <div
            className={"grid-bezier-curve"}
            ref={containerRef}
        >

            <SVG
                className={"grid-bezier-curve-markers"}
                width={W}
                height={H}
            >

                {offsetHandler}
                {border}


                {line}

                {grid}

                {points}
            </SVG>
        </div>
    );
}
