import React, {RefObject} from 'react';
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

export interface CanvasProps {
    name?: string
    disabled?: boolean
    width?: number
    height?: number
    className?: string
    style?: any

    children?: React.ReactNode




    onDown?(e: MouseEvent)

    onUp?(e: MouseEvent)

    onChange?(imageData?: ImageData)

    onLeave?(e?)
    onEnter?(e?)

    onEnterDraw?(e?)

    onLeaveDraw?(e?)

    demonstration?: boolean

    onDemonstrationUnload?()

    onCanvasRef?(canvas: HTMLCanvasElement)
}

export interface CanvasState {
    drawing: boolean
    startEvent: any
    modalWindowOpen: boolean
    mouseInsideCanvas: boolean
}

export class CanvasLight extends React.PureComponent<CanvasProps, CanvasState> {

    canvas: HTMLCanvasElement;

    modalWindow;

    constructor(props) {
        super(props);

        this.state = {
            drawing: false,
            startEvent: null,
            modalWindowOpen: false,
            mouseInsideCanvas: false,
        };

    }

    handleCanvasRef = (element: HTMLCanvasElement) => {
        this.canvas = (element);
        this.props.onCanvasRef?.(element);
    };

    openModal = () => {
        const {width, height, name, onDemonstrationUnload} = this.props;

        this.modalWindow = window.open(``, name, `width=${width},height=${height}`);
        this.modalWindow.onbeforeunload = onDemonstrationUnload;

        this.modalWindow.document.body.style = 'margin: 0';

        const div = this.modalWindow.document.createElement('div');
        this.modalWindow.document.body.appendChild(div);

        const stream = this.canvas["captureStream"](25);

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

    componentDidMount() {

        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mouseenter", this.mouseEnterHandler);
        this.canvas.addEventListener("mouseleave", this.mouseLeaveHandler);

        this.canvas.addEventListener("touchstart", this.mouseDownHandler);

    }

    componentWillUnmount() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mouseenter", this.mouseEnterHandler);
        this.canvas.removeEventListener("mouseleave", this.mouseLeaveHandler);

        // this.canvas.removeEventListener("touchstart", this.mouseDownHandler);

        this.modalWindow?.close();
    }

    componentDidUpdate(prevProps: CanvasProps) {
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
        e.preventDefault();

        document.addEventListener("mouseup", this.mouseUpHandler);

        this.setState({
            drawing: true,
            startEvent: e
        });

        const {onDown} = this.props;

        onDown?.(e);
    };


    /**
     ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION  CYCLE ANIMATION  CYCLE
     CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE
     * */

    /**
     MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE
     DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG
     * */





    /**
     UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP
     UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP UP
     * */


    private mouseUpHandler = e => {

        document.removeEventListener("mouseup", this.mouseUpHandler);

        // document.removeEventListener("touchend", this.mouseUpHandler);
        // document.removeEventListener("touchmove", this.mouseDragHandler);

        if (this.state.drawing) {
            this.setState({drawing: false, startEvent: null});

            const {onChange} = this.props;

            onChange && onChange(canvasToImageData(this.canvas));

            const {onUp} = this.props;

            onUp && onUp(e);

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



    render() {
        const { width, height, className, style, children, disabled} = this.props;
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
                    ref={this.handleCanvasRef}
                    // ref={this.canvasRef}
                    // width={width || (value ? value.width : 300)}
                    // height={height || (value ? value.height : 300)}
                />
                {children}
            </div>
        )
    }
}
