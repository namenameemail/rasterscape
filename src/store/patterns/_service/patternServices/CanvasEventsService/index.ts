import {getOffset} from "../../../../../utils/offset";
import {rotate} from "../../../../../utils/draw";
import {CanvasServiceEvent} from "./types";

export interface CanvasEventHandlers {
    onPushPosition?: (e: MouseEvent) => void
    onSetPosition?: (e: MouseEvent) => void
    onResetPosition?: () => void

    onClick?: (e: CanvasServiceEvent) => void,
    onDown?: (e: CanvasServiceEvent) => void,
    onDraw?: (e: CanvasServiceEvent) => void,
    onRelease?: (e: CanvasServiceEvent) => void,
}


export class CanvasEventsService {
    handlers: CanvasEventHandlers;

    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    pointerLock: boolean = false;
    drawOnMove: boolean = false;
    rotationAngle: number = 0;
    rotationView: boolean = true;

    requestFrameID: number;

    drawing: boolean = false;
    startFrameRelatedEvent: MouseEvent;

    documentDragEvents: (MouseEvent | null)[] = (new Array(2)).fill(null); // pageX
    frameRelatedEvents: (MouseEvent | null)[] = (new Array(2)).fill(null); // offsetX

    constructor(handlers: CanvasEventHandlers) {
        this.handlers = handlers;
    }

    bindCanvas = (canvas: HTMLCanvasElement) => {
        if (this.canvas) {
            this.unbindCanvas();
        }
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mousemove", this.canvasMouseMoveHandler); // 1 внутри канваса
        /**
         * есть два вида движения мыши
         * 1 внутри канваса
         * 2 по всему экрану во время рисования - для этого случая нужно вычислять кординаты относительно канваса
         */
    };
    unbindCanvas = () => {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mousemove", this.canvasMouseMoveHandler);
        this.canvas = null;
        this.context = null;
    };

    pushFrameRelatedEvent = (e: MouseEvent) => {
        this.handlers.onPushPosition(e);

        this.frameRelatedEvents.unshift(e);
        this.frameRelatedEvents.pop();
    };

    pushDocumentDragEvent = (e: MouseEvent) => {
        if (this.pointerLock) {
            this.documentDragEvents.unshift({
                ...e,
                pageX: this.documentDragEvents[1].pageX + e.movementX,
                pageY: this.documentDragEvents[1].pageY + e.movementY,
            });
            this.documentDragEvents.pop();
        } else {
            this.documentDragEvents.unshift(e);
            this.documentDragEvents.pop();
        }
    };

    mouseDownHandler = (e: MouseEvent) => {
        e.preventDefault(); // начал делать хендлеры тач ивентов

        if (this.pointerLock) {
            this.canvas.requestPointerLock();
        }

        document.addEventListener("mouseup", this.mouseUpHandler);
        document.addEventListener("mousemove", this.documentMouseDragHandler); // 2 по всему экрану
        this.canvas.removeEventListener("mousemove", this.canvasMouseMoveHandler);

        // document.addEventListener("touchend", this.mouseUpHandler);
        // document.addEventListener("touchmove", this.mouseDragHandler);

        this.drawing = true;
        this.startFrameRelatedEvent = e;

        this.pushFrameRelatedEvent(e);

        this.handlers.onDown?.({
            events: this.frameRelatedEvents,
            context: this.context,
            canvas: this.canvas,
        });

        this.start();

        // клик возможно не нужен вообще когда есть onDraw
        // или все же нужен клик с задержкой потому что значения не успевают вычислиться
        setTimeout(() => {
            !this.drawing && this.handlers.onClick?.({
                events: this.frameRelatedEvents,
                context: this.context,
                canvas: this.canvas,
            });
        }, 10)

    };

    /**
     ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION  CYCLE ANIMATION  CYCLE
     CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE
     * */

    onNewDrawEvent = () => {
        this.handlers.onDraw?.({
            events: this.frameRelatedEvents,
            context: this.context,
            canvas: this.canvas,
        });
    };

    newCursorPosition = () => {

        // this.toolService?.handlers.moveProcess?.({
        //     events: this.frameRelatedEvents,
        //     context: this.context,
        //     canvas: this.canvas,
        // });
    };

    isEqualOffset = (e1, e2) => {
        return e1?.offsetY === e2?.offsetY && e1?.offsetX === e2?.offsetX
    };

    onFrame = () => {
        const prevFrameRelatedEvent = this.frameRelatedEvents[1];
        const newFrameRelatedEvent = this.documentDragEvents[0]
            ? this.getCanvasRelatedEvent(this.documentDragEvents[0])
            : this.frameRelatedEvents[0];

        if (
            !this.drawOnMove ||
            (!this.isEqualOffset(prevFrameRelatedEvent, newFrameRelatedEvent)) // это нужно чтобы срабатывало событие рисования если мышь не двигается а двигается канвавс
        ) {
            this.onNewDrawEvent();
        }

        this.pushFrameRelatedEvent(newFrameRelatedEvent);

    };

    getCanvasRelatedEvent = (e: MouseEvent) => {
        const offset = getOffset(this.canvas);

        if (!offset) return;

        const {top, left, box} = offset;
        const canvasCenter = {
            x: left + box.width / 2,
            y: top + box.height / 2
        };
        const rotatedE = rotate(
            canvasCenter.x, canvasCenter.y,
            e.pageX, e.pageY,
            this.rotationView ? this.rotationAngle : 0
        );

        return {
            ...e,
            offsetX: rotatedE.x - canvasCenter.x + this.canvas.width / 2,
            offsetY: rotatedE.y - canvasCenter.y + this.canvas.height / 2,
        };
    };

    start = () => {

        if (this.requestFrameID) return;

        let prevTime = 0;
        // let minTime = 1000;
        // let maxTime = 0;
        const changing = (time) => {


            // DRAW SPEED
            const interval = time - prevTime;
            // minTime = Math.min(minTime, interval)
            // if(prevTime) maxTime = Math.max(maxTime, interval)
            // coordHelper.setText(interval);
            // coordHelper2.setText(minTime);
            // coordHelper3.setText(maxTime);
            prevTime = time;

            this.onFrame();

            this.requestFrameID = requestAnimationFrame(changing);
        };
        this.requestFrameID = requestAnimationFrame(changing);

    };

    stop = () => {
        this.requestFrameID && cancelAnimationFrame(this.requestFrameID);
        this.requestFrameID = null;
    };

    /**
     MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE
     DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG MOVE DRAG
     * */

        // хендлер движения мыши без нажатия
        // мьютится во время от нажатия до релиза
        // собиытия сразу относительные канваса так как канвас - таргет
    canvasMouseMoveHandler = e => {

        this.pushFrameRelatedEvent(e);

        // изменение относительной позиции
        this.newCursorPosition();
    };


    // хендлер для события движения мыши по документу
    // события пишутся в отдельный массив для последующего преобразования
    // в координаты относительные канваса
    documentMouseDragHandler = (e) => {

        this.pushDocumentDragEvent(e);

        // если рисуем только при движении мыши а не каждый кадр.
        // (при этом если движется канвас то новое событие вызывается в кадре)
        if (this.drawOnMove) {
            this.onNewDrawEvent();
        }
    };


    private mouseUpHandler = (e: MouseEvent) => {

        document.removeEventListener("mouseup", this.mouseUpHandler);
        document.removeEventListener("mousemove", this.documentMouseDragHandler);
        this.canvas.addEventListener("mousemove", this.canvasMouseMoveHandler);

        // document.removeEventListener("touchend", this.mouseUpHandler);
        // document.removeEventListener("touchmove", this.documentMouseDragHandler);


        this.stop();

        this.drawing = false;
        this.startFrameRelatedEvent = null;

        this.handlers.onRelease?.({
            events: this.frameRelatedEvents,
            context: this.context,
            canvas: this.canvas,
        });


        if (this.pointerLock) {
            document.exitPointerLock();

            // взврат на стартовую позицию
            this.pushFrameRelatedEvent(this.startFrameRelatedEvent);
            this.newCursorPosition();
        }

        this.frameRelatedEvents = (new Array(2)).fill(null);
        this.documentDragEvents = (new Array(2)).fill(null);

    };

    unbind = () => {

        document.removeEventListener("mouseup", this.mouseUpHandler);
        document.removeEventListener("mousemove", this.documentMouseDragHandler);

        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mousemove", this.canvasMouseMoveHandler);
    };

}
