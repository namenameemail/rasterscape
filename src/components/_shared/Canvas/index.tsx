import React from 'react';
import ReactDOM from 'react-dom';
import {canvasToImageData, resizeImageData} from "../../../utils/canvas/helpers/imageData";
import "../../../styles/canvas.scss";
import classNames from "classnames";
import {getOffset} from "../../../utils/offset";
import {rotate} from "../../../utils/draw";
import {RotationValue} from "../../../store/patterns/rotating/types";
import {DemonstrationSubApp} from "./Demonstration";
import _throttle from 'lodash/throttle';
import {coordHelper, coordHelper3, coordHelper4, coordHelper5} from "../../Area/canvasPosition.servise";

export interface CanvasEvent {
    e: MouseEvent
    pre?: MouseEvent
    ctx: CanvasRenderingContext2D
    canvas: HTMLCanvasElement
    drawing?: boolean
    rotation?: RotationValue
}

export interface CanvasProps {
    name?: string
    value?: ImageData
    disabled?: boolean
    width?: number
    height?: number
    className?: string
    style?: any

    children?: React.ReactNode

    rotation?: RotationValue

    pointerLock?: boolean

    drawOnMove?: boolean

    throttle?: boolean

    onDown?(e: CanvasEvent)

    onUp?(e: CanvasEvent)

    onDraw?(e: CanvasEvent)

    onClick?(e: CanvasEvent)

    onMove?(e: CanvasEvent)

    downProcess?(e: CanvasEvent)

    releaseProcess?(e: CanvasEvent)

    onChange?(imageData?: ImageData)

    onLeave?(e?)
    onEnter?(e?)

    onEnterDraw?(e?)

    onLeaveDraw?(e?)

    demonstration?: boolean

    onDemonstrationUnload?()
}

export interface CanvasState {
    drawing: boolean
    startEvent: any
    modalWindowOpen: boolean
    mouseInsideCanvas: boolean
}

export class Canvas extends React.PureComponent<CanvasProps, CanvasState> {

    canvasRef;
    videoRef;
    ctx;

    e;
    pre;
    canvasE;
    canvasPrE;

    requestID;

    modalWindow;

    constructor(props) {
        super(props);

        this.state = {
            drawing: false,
            startEvent: null,
            modalWindowOpen: false,
            mouseInsideCanvas: false,
        };

        this.canvasRef = React.createRef();
        this.videoRef = React.createRef();
        this.ctx = null;
        this.pre = null;
        this.canvasPrE = null;
    }

    openModal = () => {
        const {width, height, name, onDemonstrationUnload} = this.props;

        this.modalWindow = window.open(``, name, `width=${width},height=${height}`);
        this.modalWindow.onbeforeunload = onDemonstrationUnload;

        this.modalWindow.document.body.style = 'margin: 0';

        const div = this.modalWindow.document.createElement('div');
        this.modalWindow.document.body.appendChild(div);

        const stream = this.canvasRef.current.captureStream(25);

        ReactDOM.render(<DemonstrationSubApp name={name} stream={stream}/>, div);

        this.setState({
            modalWindowOpen: true,
        })
    };

    closeModal = () => {
        this.modalWindow?.close();
        this.modalWindow = null;
        this.setState({
            modalWindowOpen: false,
        })
    };

    receiveImageData = () => {
        if (this.props.value instanceof ImageData) {
            this.ctx = this.canvasRef.current.getContext("2d");

            const imgD = this.props.value.width !== this.props.width || this.props.value.height !== this.props.height
                ? resizeImageData(this.props.value, this.props.width, this.props.height)
                : this.props.value;

            this.ctx.putImageData(imgD, 0, 0);
            this.modalWindow?.canvas?.getContext("2d").putImageData(imgD, 0, 0);
        }
    };

    receiveImageDataT = _throttle(this.receiveImageData, 300);

    receiveImageDataThrottled = () => {
        const {throttle} = this.props;

        if (throttle) {
            this.receiveImageDataT();
        } else {
            this.receiveImageData();
        }
    };

    componentDidMount() {
        this.ctx = this.canvasRef.current.getContext("2d");

        this.canvasRef.current.addEventListener("mousedown", this.mouseDownHandler);
        this.canvasRef.current.addEventListener("mousemove", this.mouseMoveHandler);
        this.canvasRef.current.addEventListener("mouseenter", this.mouseEnterHandler);
        this.canvasRef.current.addEventListener("mouseleave", this.mouseLeaveHandler);

        this.canvasRef.current.addEventListener("touchstart", this.mouseDownHandler);
        this.canvasRef.current.addEventListener("touchmove", this.mouseMoveHandler);

        this.receiveImageData();
    }

    componentWillUnmount() {
        this.canvasRef.current.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvasRef.current.removeEventListener("mousemove", this.mouseMoveHandler);
        this.canvasRef.current.removeEventListener("mouseenter", this.mouseEnterHandler);
        this.canvasRef.current.removeEventListener("mouseleave", this.mouseLeaveHandler);

        this.canvasRef.current.removeEventListener("touchstart", this.mouseDownHandler);
        this.canvasRef.current.removeEventListener("touchmove", this.mouseMoveHandler);

        this.modalWindow?.close();
    }

    componentDidUpdate(prevProps: CanvasProps) {
        // console.log(Object.buttons(this.props).reduce((res, key) => ({
        //     ...res,
        //     [key]: prevProps[key] !== this.props[key]
        // }), {}));
        //
        // console.log(prevProps.value !== this.props.value ||
        //     prevProps.width !== this.props.width ||
        //     prevProps.height !== this.props.height);
        if ((
            prevProps.value !== this.props.value ||
            prevProps.width !== this.props.width ||
            prevProps.height !== this.props.height
        )) {
            this.receiveImageDataThrottled();
        }

        if (!prevProps.demonstration && this.props.demonstration) {
            this.openModal();
        }
        if (prevProps.demonstration && !this.props.demonstration) {
            this.closeModal();
        }
    }

    /**
     DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN
     DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN DOWN
     * */

    private mouseDownHandler = e => {
        e.preventDefault(); // начал делать хендлеры тач ивентов

        if (this.props.pointerLock) {
            this.canvasRef.current.requestPointerLock();
        }

        // coordHelper2.setText('');
        // coordHelper2.writeln('down');


        document.addEventListener("mouseup", this.mouseUpHandler);
        document.addEventListener("mousemove", this.mouseDragHandler);

        document.addEventListener("touchend", this.mouseUpHandler);
        document.addEventListener("touchmove", this.mouseDragHandler);

        this.e = e;
        this.setState({
            drawing: true,
            startEvent: e
        });

        const event: CanvasEvent = {
            e,
            ctx: this.ctx,
            canvas: this.canvasRef.current,
            drawing: true,
            rotation: this.props.rotation
        };

        const {onDown, downProcess} = this.props;

        // coordHelper2.writeln('down', event.e.offsetX, event.e.offsetY);
        onDown && onDown(event);
        downProcess && downProcess(event);

        this.start();

        const {onClick} = this.props;
        setTimeout(() => {


            // coordHelper2.writeln('click', event.e.offsetX, event.e.offsetY);
            !this.state.drawing && onClick && onClick(event);
        }, 10)

    };


    /**
     ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION  CYCLE ANIMATION  CYCLE
     CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE
     * */

    draw = () => {
        const e = this.canvasE;
        const pre = this.canvasPrE;
        // coordHelper2.writeln('draw', e?.offsetX, e?.offsetY);

        const {onDraw} = this.props;
        onDraw && onDraw({
            e,
            pre,
            ctx: this.ctx,
            canvas: this.canvasRef.current,
            drawing: true,
            rotation: this.props.rotation
        });
    };

    move = (canvas?: boolean) => {
        // для draw и move
        const e = canvas ? this.canvasE : this.e;
        const pre = canvas ? this.canvasPrE : this.pre;

        const {onMove} = this.props;
        onMove && onMove({
            e,
            pre,
            ctx: this.ctx,
            canvas: this.canvasRef.current,
            drawing: this.state.drawing,
        });
    };

    equalEvents = (e1, e2) => {
        return e1?.offsetY === e2?.offsetY && e1?.offsetX === e2?.offsetX
    };

    onFrame = () => {
        // coordHelper2.writeln('frame');

        const canvasPrE = this.canvasPrE;
        const canvasE = this.canvasE = this.getCanvasRelatedEvent(this.e);

        // this.state.drawing && - не нужно но по сути так
        this.move(true);

        const {drawOnMove} = this.props;
        if (
            !drawOnMove
            || (!this.equalEvents(canvasPrE, canvasE))
        ) {
            this.draw();
        }
        this.canvasPrE = this.canvasE;

    };

    getCanvasRelatedEvent = (e) => {
        const offset = getOffset(this.canvasRef.current);

        if (!offset) return;

        const {top, left, box} = offset;
        const canvasCenter = {
            x: left + box.width / 2,
            y: top + box.height / 2
        };
        const rotatedE = rotate(
            canvasCenter.x, canvasCenter.y,
            e.pageX, e.pageY,
            this.props.rotation?.rotateDrawAreaElement
                ? this.props.rotation.angle
                : 0
        );

        return {
            ...e,
            offsetX: rotatedE.x - canvasCenter.x + this.props.width / 2,
            offsetY: rotatedE.y - canvasCenter.y + this.props.height / 2,
        };
    };

    start = () => {
        // coordHelper2.writeln('start');

        if (this.requestID) return;

        let prevT = 0;
        const changing = (time) => {

            // DRAW SPEED
            coordHelper.setText(time - prevT);
            prevT = time;

            this.onFrame();

            this.requestID = requestAnimationFrame(changing);
        };
        this.requestID = requestAnimationFrame(changing);

    };

    stop = () => {
        this.requestID && cancelAnimationFrame(this.requestID);
        this.requestID = null;
    };


    /**
     MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE
     DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG
     * */


    private mouseMoveHandler = e => {

        if (!this.state.drawing) {

            this.pre = this.e;
            this.e = e;

            // если просто водим мышкой

            this.move();
        }
    };

    mouseDragHandler = (e) => {

        if (this.state.drawing) {
            this.pre = this.e;
            this.e = this.props.pointerLock ? {
                ...e,
                pageX: this.pre.pageX + e.movementX,
                pageY: this.pre.pageY + e.movementY,
            } : e;

            // если водим при нажатии
            // в этом случае onMove срабатывает в анимации
            const {drawOnMove} = this.props;
            if (drawOnMove) {
                this.draw();
            }

        }
    };


    /**
     UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP
     UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP
     * */


    private mouseUpHandler = e => {

        document.removeEventListener("mouseup", this.mouseUpHandler);
        document.removeEventListener("mousemove", this.mouseDragHandler);

        document.removeEventListener("touchend", this.mouseUpHandler);
        document.removeEventListener("touchmove", this.mouseDragHandler);

        if (this.props.pointerLock) {
            document.exitPointerLock();

            const {onMove} = this.props;
            onMove?.({
                e: this.state.startEvent,
                pre: e,
                ctx: this.ctx,
                canvas: this.canvasRef.current,
                drawing: this.state.drawing,
            });
        }

        this.stop();
        if (this.state.drawing) {
            this.setState({drawing: false, startEvent: e});

            this.canvasPrE = null;
            // this.canvasE = null;
            this.pre = null;
            this.e = null;
            const {onChange} = this.props;

            const imageData = canvasToImageData(this.canvasRef.current);

            const res = imageData;

            onChange && onChange(res);

            const event = {
                e,
                ctx: this.ctx,
                canvas: this.canvasRef.current,
                drawing: false
            };

            const {onUp} = this.props;

            onUp && onUp(event);

            const {releaseProcess} = this.props;

            releaseProcess && releaseProcess(event);


            if (!this.state.mouseInsideCanvas) {
                const {onLeaveDraw} = this.props;
                onLeaveDraw?.(e);
            }
        }
    };


    /**
     ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE
     LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER LEAVE ENTER
     * */

    mouseEnterHandler = (e) => {

        const {onEnter} = this.props;

        onEnter?.(e);
    };

    mouseLeaveHandler = (e) => {

        const {onLeave} = this.props;

        onLeave?.(e);
    };

    wrapperEnterHandler = (e) => {
        console.log('enter');

        this.setState({mouseInsideCanvas: true});

        if (!this.state.drawing) {
            const {onEnterDraw} = this.props;

            onEnterDraw?.(e);

        }
    };

    wrapperLeaveHandler = (e) => {
        this.setState({mouseInsideCanvas: false});

        if (!this.state.drawing) {
            const {onLeaveDraw} = this.props;

            onLeaveDraw?.(e);
        }
    };

    getImageData = (): ImageData => {
        return this.ctx.getImageData(0, 0, this.props.width, this.props.height);
    };

    setImageData = (value: ImageData) => {
        return this.ctx.putImageData(value, 0, 0);
    };


    render() {
        const {value, width, height, className, style, children, disabled} = this.props;
        // console.log("canvas render", this.state);
        return (
            <div
                onMouseEnter={this.wrapperEnterHandler}
                onMouseLeave={this.wrapperLeaveHandler}
                style={style}
                className={classNames(className, "canvas", {
                    'disabled': disabled
                })}
            >
                <canvas
                    ref={this.canvasRef}
                    width={width || (value ? value.width : 300)}
                    height={height || (value ? value.height : 300)}/>
                {children}
            </div>
        )
    }
}
