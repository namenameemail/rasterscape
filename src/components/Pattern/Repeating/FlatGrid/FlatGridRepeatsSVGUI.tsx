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
import {RepeatsBezierGridParams, RepeatsFlatGridParams} from "../../../../store/patterns/repeating/types";

export interface CrossSelectData {
    xn0?: number;
    yn0?: number;
    xn1?: number;
    yn1?: number;
}

export interface FlatCurveRepeatingProps {
    onParamChange(param: keyof RepeatsFlatGridParams, value: any)
    onCrossSelect(data: CrossSelectData)

    xd: number
    yd: number
    xOut: number
    yOut: number

    float?: boolean
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

const GRID_OFFSET = 3;

export const FlatGridRepeatsSVGUI: React.FC<FlatCurveRepeatingProps> = (props) => {

    const {
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


    const {xd, yd, xOut, yOut} = props;

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

    const i0 = WW / xd / 2;
    const j0 = HH / yd / 2;
    const ilast = WW ;
    const jlast = HH ;

    const handleXdChange = React.useCallback((v: Vector) => {
        onParamChange('xd', float ? v.x : Math.max(1, Math.round(v.x)));
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



    const handleXOutChange = React.useCallback((v: Vector) => {
        onParamChange('xOut', Math.max(0, float ? v.x : Math.round(v.x)));
    }, [onParamChange, float]);
    const startChangeXOut = useDragPoint(handleXOutChange, scale * 100);
    const handleChangeXOutStart = React.useCallback((e) => {
        startChangeXOut(e, createVector(xOut, 0));
    }, [startChangeXOut, xOut]);

    const handleYOutChange = React.useCallback((v: Vector) => {
        onParamChange(
            'yOut', Math.max(0, float ? v.y : Math.round(v.y))
        );
    }, [onParamChange, float]);
    const startChangeYOut = useDragPoint(handleYOutChange, scale * 100);
    const handleChangeYOutStart = React.useCallback((e) => {
        startChangeYOut(e, createVector(0, yOut));
    }, [startChangeYOut, yOut]);

    const grid = React.useMemo(() => {

        const size = 1;
        const cords = [];
        const linesx = [];
        const linesy = [];

        let i,j;
        for (i = -xOut; i < xd + xOut; i++) {
            const ai = WW / xd * (i + 0.5);
            const ci = WW / xd * (i);
            // !(i < 0 || i > xd) &&
            linesx.push({
                x: ci + GRID_OFFSET,
                center: i===0
            });
            for (j = -yOut; j < yd + yOut; j++) {

                const aj = HH / yd * (j + 0.5);
                const cj = WW / yd * (j);

                // !(j < 0 || j > yd) &&
                (i === -xOut) && linesy.push({
                    y: cj + GRID_OFFSET,
                    center: j===0
                });

                cords.push({
                    x: ai,
                    y: aj,
                    i,
                    j,
                    center: createVector(ai, aj),
                    corner: createVector(ci, cj),
                    out: i < 0 || i > xd || j < 0 || j > yd,
                    // active: i >= -xn0 && i <= xn1 && j >= -yn0 && j <= yn1
                });
            }
        }
        // i = Math.ceil(xd + xOut);
        // j = Math.ceil(yd + yOut);
        //
        // if (i !== xd + xOut) {
        //     const ci = WW / xd * (i);
        //     // !(i < 0 || i > xd) &&
        //     linesx.push({
        //         x: ci + GRID_OFFSET,
        //         center: i===0
        //     });
        // }
        // if (j !== yd + yOut) {
        //     const cj = WW / yd * (j);
        //
        //     // !(j < 0 || j > yd) &&
        //     (i === -xOut) && linesy.push({
        //         y: cj + GRID_OFFSET,
        //         center: j===0
        //     });
        // }



            // const crossesOffset = createVector(1 / (2 * xd), 1 / (2 * yd));
            // const crossesOffsetZero = createVector(0,0);
            //
            // for (let i = -xn0 - 1; i < Math.max(xd, xn1 + 1) + 1; i++) {
            //     const ai0 = i / xd + crossesOffset.x;
            //     const ai = curve.get(ai0);
            //     const ci = curve.get(i / xd + crossesOffsetZero.x);
            //
            //     !(i < 0 || i > xd) && linesx.push(ci.x);
            //
            //     for (let j = -yn0 - 1; j < Math.max(yd, yn1 + 1) + 1; j++) {
            //
            //         const aj0 = j / yd + crossesOffset.y;
            //         const aj = curve.get(aj0);
            //         const cj = curve.get(j / yd + crossesOffsetZero.y);
            //
            //         !(j < 0 || j > yd) && (i === (-xn0 - 1)) && linesy.push(cj.y);
            //
            //         cords.push({
            //             origin: createVector(ai0 * 100, aj0 * 100),
            //             center: createVector(ai.x, aj.y),
            //             corner: createVector(ci.x, cj.y),
            //             x: ai.x,
            //             y: aj.y,
            //             cx: ci.x,
            //             cy: cj.y,
            //             i,
            //             j,
            //             ai0,
            //             aj0,
            //             out: i < 0 || i > xd || j < 0 || j > yd,
            //             active: i >= -xn0 && i <= xn1 && j >= -yn0 && j <= yn1
            //         });
            //     }
            // }



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
                {/*<CrossSVG*/}
                {/*    position={createVector(i0, j0)} size={300}*/}
                {/*    strokeWidth={0.3}*/}
                {/*    minStrokeWidth={0.2}*/}
                {/*    strokeDasharray={2}*/}
                {/*    strokeDashoffset={2}*/}
                {/*    stroke={'white'}*/}
                {/*    pointerEvents="none"*/}
                {/*/>*/}
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
                start={createVector(0, 0)}
                finish={createVector(0, HH)}
                strokeWidth={10}
                stroke={'transparent'}
                // stroke={'red'}
                cursor={'col-resize'}
                onMouseDown={handleChangeXdStart}
            />
            <Line
                start={createVector(0, 0)}
                finish={createVector(WW, 0)}
                strokeWidth={10}
                stroke={'transparent'}
                // stroke={'red'}
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

            <Line
                start={createVector(0, 0)}
                finish={createVector(0, HH)}
                strokeWidth={10}
                stroke={'transparent'}
                // stroke={'red'}
                cursor={'col-resize'}
                onMouseDown={handleChangeXdStart}
            />
            <Line
                start={createVector(0, 0)}
                finish={createVector(WW, 0)}
                strokeWidth={10}
                stroke={'transparent'}
                // stroke={'red'}
                onMouseDown={handleChangeYdStart}
                cursor={'row-resize'}
            />
            <Line
                start={createVector(WW, 0)}
                finish={createVector(WW, HH)}
                strokeWidth={10}
                stroke={'transparent'}
                // stroke={'red'}
                cursor={'e-resize'}
                onMouseDown={handleChangeXOutStart}
            />
            <Line
                start={createVector(0, HH)}
                finish={createVector(WW, HH)}
                strokeWidth={10}
                stroke={'transparent'}
                // stroke={'red'}
                onMouseDown={handleChangeYOutStart}
                cursor={'s-resize'}
            />
            {linesx.map(({x, center}) => (
                <Line
                    start={createVector(
                        x,
                        linesy[0].y
                    )}
                    finish={createVector(
                        x,
                        linesy[linesy.length - 1].y + HH / yd
                    )}
                    strokeWidth={center ? 0.7 : 0.4}
                    minStrokeWidth={center ? 0.3 : 0.2}
                    stroke={'white'}
                    pointerEvents="none"
                />
            ))}
            {linesy.map(({y, center}) => (
                <Line
                    start={createVector(
                        linesx[0].x,
                        y,
                    )}
                    finish={createVector(
                        linesx[linesx.length - 1].x + WW / xd,
                        y
                    )}
                    strokeWidth={center ? 0.7 : 0.4}
                    minStrokeWidth={center ? 0.3 : 0.2}
                    stroke={'white'}
                    pointerEvents="none"
                />
            ))}

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
                {/*<CrossSVG*/}
                {/*    opacity={out ? 0.4 : 1}*/}
                {/*    position={center}*/}
                {/*    size={8}*/}
                {/*    minSize={6}*/}
                {/*    stroke={'white'}*/}
                {/*    strokeWidth={out ? 0.8 : 0.5}*/}
                {/*    minStrokeWidth={out ? 0.8 : 0.5}*/}
                {/*    pointerEvents='none'*/}
                {/*    data={`${i}-${j}`}*/}
                {/*/>*/}
               {/* {active ? (<>*/}
               {/*     <CrossSVG*/}
               {/*         opacity={out ? 0.4 : 1}*/}
               {/*         position={center}*/}
               {/*         size={8}*/}
               {/*         minSize={6}*/}
               {/*         stroke={'white'}*/}
               {/*         strokeWidth={out ? 0.8 : 0.5}*/}
               {/*         minStrokeWidth={out ? 0.8 : 0.5}*/}
               {/*         pointerEvents='none'*/}
               {/*         data={`${i}-${j}`}*/}
               {/*     />*/}


               {/*</> ) : (*/}
               {/*    <>*/}
               {/*     <RectCenterSVG*/}
               {/*         opacity={out ? 0.3 : 1}*/}
               {/*         fill={'white'}*/}
               {/*         center={center}*/}
               {/*         size={createVector(*/}
               {/*             1.5,*/}
               {/*             out ? 4 : 1.5*/}
               {/*         )}*/}
               {/*         minSize={createVector(*/}
               {/*             0.8,*/}
               {/*             out ? 4 : 0.8*/}
               {/*         )}*/}
               {/*         pointerEvents="none"*/}
               {/*         strokeWidth={GRID_DOT_LINE_WIDTH}*/}
               {/*         minStrokeWidth={MIN_WIDTH_DOT}*/}
               {/*     />*/}
               {/*     </>*/}
               {/* )}*/}

                {/*<RectCenterSVG*/}
                {/*    fill='transparent'*/}
                {/*    center={center}*/}
                {/*    size={createVector(10, 10)}*/}
                {/*    minSize={createVector(2, 2)}*/}
                {/*    data-id={`${i},${j}`}*/}
                {/*    data-i={i}*/}
                {/*    data-j={j}*/}
                {/*    // cursor={out ? 'crosshair' : 'cell'}*/}
                {/*    // cursor={out ? 'se-resize' : 'sw-resize'}*/}
                {/*    cursor={'default'}*/}
                {/*    onMouseDown={handleItemDown}*/}
                {/*    onMouseEnter={handleItemEnter}*/}
                {/*/>*/}
            </>))}




        </>);
    }, [Line, Rect, xd, yd, xOut, yOut, i0, j0, handleItemEnter, handleItemDown]);

    // BORDER OF CANVAS
    const border = React.useMemo(() => {
        return (
            <Rect
                start={createVector(0, 0)}
                size={createVector(WW, HH)}
                // strokeWidth={BACK_LINE_WIDTH}
                // minStrokeWidth={MIN_WIDTH_0}
                strokeWidth={0.7}
                minStrokeWidth={0.4}
                stroke="rgba(255,255,255,0.8)"
                fill="rgba(255,255,255,0)"
                // fill="rgba(255,255,255,0.1)"
                pointerEvents="none"
            />
        );
    }, [Rect]);



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


                {grid}
            </SVG>
        </div>
    );
}
