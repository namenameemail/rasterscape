import * as React from "react";
import Bezier from "bezier-js";
import "../styles.scss";
import {SVG} from "../../../_shared/SVG";
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
} from "../../../_shared/SVG/_utils";
import {
    createVector,
    Vector,
    vectorAdd,
    vectorMul
} from "../../../../utils/vector";
import {RepeatsBezierGridParams} from "../../../../store/patterns/repeating/types";

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

    float?: boolean
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

export const BezierGridRepeatsSVGUI: React.FC<BezierCurveRepeatingProps> = (props) => {

    const {
        value,
        onChange,
        onPointChange,
        onParamChange,
        onCrossSelect,
        float,
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
    const ilast = curve.get(1 + 1 / (2 * xd)).x;
    const jlast = curve.get(1 + 1 / (2 * yd)).y;

    const handleXdChange = React.useCallback((v: Vector) => {
        onParamChange('xd', Math.max(1, float ? v.x : Math.round(v.x)));
    }, [onParamChange, float]);
    const startChangeXd = useDragPoint(handleXdChange, scale * 10);
    const handleChangeXdStart = React.useCallback((e) => {
        startChangeXd(e, createVector(xd, 0));
    }, [startChangeXd, xd]);

    const handleYdChange = React.useCallback((v: Vector) => {
        onParamChange(
            'yd', Math.max(1, float ? v.y : Math.round(v.y))
        );
    }, [onParamChange, float]);
    const startChangeYd = useDragPoint(handleYdChange, scale * 10);
    const handleChangeYdStart = React.useCallback((e) => {
        startChangeYd(e, createVector(0, yd));
    }, [startChangeYd, yd]);

    const grid = React.useMemo(() => {

        const size = 1;
        const cords = [];
        const linesx = [];
        const linesy = [];




        const crossesOffset = createVector(1 / (2 * xd), 1 / (2 * yd));
        const crossesOffsetZero = createVector(0,0);

        for (let i = -xn0 - 1; i < Math.max(xd, xn1 + 1) + 1; i++) {
            const ai0 = i / xd + crossesOffset.x;
            const ai = curve.get(ai0);
            const ci = curve.get(i / xd + crossesOffsetZero.x);

            !(i < 0 || i > xd) && linesx.push(ci.x);

            for (let j = -yn0 - 1; j < Math.max(yd, yn1 + 1) + 1; j++) {

                const aj0 = j / yd + crossesOffset.y;
                const aj = curve.get(aj0);
                const cj = curve.get(j / yd + crossesOffsetZero.y);

                !(j < 0 || j > yd) && (i === (-xn0 - 1)) && linesy.push(cj.y);

                cords.push({
                    origin: createVector(ai0 * 100, aj0 * 100),
                    center: createVector(ai.x, aj.y),
                    corner: createVector(ci.x, cj.y),
                    x: ai.x,
                    y: aj.y,
                    cx: ci.x,
                    cy: cj.y,
                    i,
                    j,
                    ai0,
                    aj0,
                    out: i < 0 || i > xd || j < 0 || j > yd,
                    active: i >= -xn0 && i <= xn1 && j >= -yn0 && j <= yn1
                });
            }
        }



        return (<>
            {/*<Rect*/}
            {/*    start={createVector(Math.min(i0, ilast), Math.min(j0, jlast))}*/}
            {/*    size={createVector(Math.abs(ilast - i0), Math.abs(jlast - j0))}*/}
            {/*    strokeWidth={0.4}*/}
            {/*    minStrokeWidth={0.3}*/}
            {/*    strokeDasharray={2}*/}
            {/*    strokeDashoffset={2}*/}
            {/*    stroke={'white'}*/}
            {/*    fill={'transparent'}*/}
            {/*    pointerEvents="none"*/}
            {/*/>*/}
            <CrossSVG
                position={createVector(i0, j0)} size={300}
                strokeWidth={0.3}
                minStrokeWidth={0.2}
                strokeDasharray={2}
                strokeDashoffset={2}
                stroke={'white'}
                pointerEvents="none"
            />
            {/*<CrossSVG*/}
            {/*    position={createVector(ilast, jlast)} size={300}*/}
            {/*    strokeWidth={0.5}*/}
            {/*    minStrokeWidth={0.3}*/}
            {/*    strokeDasharray={2}*/}
            {/*    strokeDashoffset={2}*/}
            {/*    stroke={'white'}*/}
            {/*    pointerEvents="none"*/}
            {/*/>*/}
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
            {/*<Line*/}
            {/*    start={createVector(ilast, jlast -150)}*/}
            {/*    finish={createVector(ilast, jlast + 150)}*/}
            {/*    strokeWidth={10}*/}
            {/*    stroke={'transparent'}*/}
            {/*    cursor={'col-resize'}*/}
            {/*    onMouseDown={handleChangeXdStart}*/}
            {/*/>*/}
            {/*<Line*/}
            {/*    start={createVector(ilast -150, jlast)}*/}
            {/*    finish={createVector(ilast+ 150, jlast )}*/}
            {/*    strokeWidth={10}*/}
            {/*    stroke={'transparent'}*/}
            {/*    onMouseDown={handleChangeYdStart}*/}
            {/*    cursor={'row-resize'}*/}
            {/*/>*/}

            {/*{linesx.map(x => (*/}
            {/*    <Line*/}
            {/*        start={createVector(*/}
            {/*            x,*/}
            {/*            -200*/}
            {/*        )}*/}
            {/*        finish={createVector(*/}
            {/*            x,*/}
            {/*            200*/}
            {/*        )}*/}
            {/*        strokeWidth={0.2}*/}
            {/*        minStrokeWidth={0.1}*/}
            {/*        stroke={'white'}*/}
            {/*        pointerEvents="none"*/}
            {/*    />*/}
            {/*))}*/}
            {/*{linesy.map(y => (*/}
            {/*    <Line*/}
            {/*        start={createVector(*/}
            {/*            -200,*/}
            {/*            y,*/}
            {/*        )}*/}
            {/*        finish={createVector(*/}
            {/*            200,*/}
            {/*            y*/}
            {/*        )}*/}
            {/*        strokeWidth={0.2}*/}
            {/*        minStrokeWidth={0.1}*/}
            {/*        stroke={'white'}*/}
            {/*        pointerEvents="none"*/}
            {/*    />*/}
            {/*))}*/}

            {cords.map(({x, y, ai0, aj0, origin, cx, cy, corner, center, i, j, out, active}) => (<>
                {/*{<CrossSVG*/}
                {/*    opacity={out ? 0.1 : 0.1}*/}
                {/*    position={corner}*/}
                {/*    size={30}*/}
                {/*    minSize={30}*/}
                {/*    stroke={'white'}*/}
                {/*    strokeWidth={out ? 0.8 : 0.5}*/}
                {/*    minStrokeWidth={out ? 0.8 : 0.5}*/}
                {/*    pointerEvents='none'*/}
                {/*    data={`${i}-${j}`}*/}
                {/*/>}*/}
                {active ? (<>
                    <CrossSVG
                        opacity={out ? 0.4 : 1}
                        position={center}
                        size={8}
                        minSize={6}
                        stroke={'white'}
                        strokeWidth={out ? 0.8 : 0.5}
                        minStrokeWidth={out ? 0.8 : 0.5}
                        pointerEvents='none'
                        data={`${i}-${j}`}
                    />


               </> ) : (
                   <>
                    <RectCenterSVG
                        opacity={out ? 0.3 : 1}
                        fill={'white'}
                        center={center}
                        size={createVector(
                            1.5,
                            out ? 4 : 1.5
                        )}
                        minSize={createVector(
                            0.8,
                            out ? 4 : 0.8
                        )}
                        pointerEvents="none"
                        strokeWidth={GRID_DOT_LINE_WIDTH}
                        minStrokeWidth={MIN_WIDTH_DOT}
                    />
                    </>
                )}
                <Line
                    start={origin}
                    finish={center}
                    strokeWidth={out ? 0.2 : 0.3}
                    minStrokeWidth={out ? 0.1 : 0.2}
                    stroke={'white'}
                    pointerEvents="none"
                />
                <RectCenterSVG
                    fill='transparent'
                    center={center}
                    size={createVector(10, 10)}
                    minSize={createVector(2, 2)}
                    data-id={`${i},${j}`}
                    data-i={i}
                    data-j={j}
                    // cursor={out ? 'crosshair' : 'cell'}
                    // cursor={out ? 'se-resize' : 'sw-resize'}
                    cursor={'default'}
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
                strokeWidth={0.1}
                minStrokeWidth={0.1}
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
                strokeWidth={0.1}
                minStrokeWidth={0.1}
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
                strokeWidth={0.1}
                minStrokeWidth={0.1}
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
                strokeWidth={0.1}
                minStrokeWidth={0.1}
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
                strokeWidth={0.1}
                minStrokeWidth={0.1}
                stroke={'white'}
                fillOpacity={0}
                pointerEvents="none"
            />



        </>);
    }, [Line, Rect, xd, yd, xn0, yn0, xn1, yn1, curve.current, i0, j0, value, handleItemEnter, handleItemDown]);

    // BORDER OF CANVAS
    const border = React.useMemo(() => {
        return (
            <Rect
                start={createVector(0, 0)}
                size={createVector(WW, HH)}
                // strokeWidth={BACK_LINE_WIDTH}
                // minStrokeWidth={MIN_WIDTH_0}
                strokeWidth={0.1}
                minStrokeWidth={0.1}
                stroke="rgba(255,255,255,0.8)"
                fill="rgba(255,255,255,0)"
                // fill="rgba(255,255,255,0.1)"
                pointerEvents="none"
            />
        );
    }, [Rect]);

    const line = React.useMemo(() => {
        return (
            <BezierSVG
                points={value}
                color={"#ffcd00"}

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
