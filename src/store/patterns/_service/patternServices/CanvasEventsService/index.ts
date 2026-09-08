import {getOffset} from "../../../../../utils/offset";
import {rotate} from "../../../../../utils/draw";
import {CanvasServiceEvent} from "./types";
import { PatternStoreService } from "../PatternStoreService";
import { profileLogger } from "../../../../../utils/profiling/ProfileLogger";
import {
    platformerProfiler,
    PlatformerCanvasEventPhase,
} from "../PatternPlatformerService/PlatformerProfiler";
import { frameScheduler, FramePriority } from "../../../../../utils/FrameScheduler";
import { PatternBuffer } from "../PatternBuffer";

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
    storeService: PatternStoreService;

    monitor: HTMLCanvasElement | null = null;
    buffer: PatternBuffer | null = null;

    pointerLock: boolean = false;
    drawOnMove: boolean = false;
    rotationAngle: number = 0;
    rotationView: boolean = true;

    private unsubscribeFrame: (() => void) | null = null;
    private readonly frameSubscriberId: string;

    drawing: boolean = false;
    startFrameRelatedEvent: MouseEvent | null = null;

    documentDragEvents: (MouseEvent | null)[] = (new Array(2)).fill(null); // pageX
    frameRelatedEvents: (MouseEvent | null)[] = (new Array(2)).fill(null); // offsetX

    constructor(handlers: CanvasEventHandlers, storeService: PatternStoreService, frameSubscriberSuffix = 'canvas') {
        this.handlers = handlers;
        this.storeService = storeService;
        this.frameSubscriberId = `draw:${storeService.patternService.patternId}:${frameSubscriberSuffix}`;
    }

    bindCanvas = (monitor: HTMLCanvasElement, buffer: PatternBuffer) => {
        if (this.monitor) {
            this.unbindCanvas();
        }
        this.monitor = monitor;
        this.buffer = buffer;

        this.monitor.addEventListener("mousedown", this.mouseDownHandler);
        this.monitor.addEventListener("mousemove", this.canvasMouseMoveHandler); // 1 внутри канваса
        /**
         * есть два вида движения мыши
         * 1 внутри канваса
         * 2 по всему экрану во время рисования - для этого случая нужно вычислять кординаты относительно канваса
         */
    };
    unbindCanvas = () => {
        this.monitor?.removeEventListener("mousedown", this.mouseDownHandler);
        this.monitor?.removeEventListener("mousemove", this.canvasMouseMoveHandler);
        this.monitor = null;
        this.buffer = null;
    };

    pushFrameRelatedEvent = (e: MouseEvent) => {
        this.handlers.onPushPosition?.(e);

        this.frameRelatedEvents.unshift(e);
        this.frameRelatedEvents.pop();
    };

    pushDocumentDragEvent = (e: MouseEvent) => {
        if (this.pointerLock) {
            this.documentDragEvents.unshift({
                ...e,
                pageX: this.documentDragEvents[1]?.pageX + e.movementX,
                pageY: this.documentDragEvents[1]?.pageY + e.movementY,
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
            this.monitor.requestPointerLock();
        }

        document.addEventListener("mouseup", this.mouseUpHandler);
        document.addEventListener("mousemove", this.documentMouseDragHandler); // 2 по всему экрану
        this.monitor.removeEventListener("mousemove", this.canvasMouseMoveHandler);

        // document.addEventListener("touchend", this.mouseUpHandler);
        // document.addEventListener("touchmove", this.mouseDragHandler);

        this.drawing = true;
        this.startFrameRelatedEvent = e;

        this.pushFrameRelatedEvent(e);

        this.handlers.onDown?.(this.buildToolEvent());
        this.logPlatformerCanvasEvent('down');

        this.start();

        // клик возможно не нужен вообще когда есть onDraw
        // или все же нужен клик с задержкой потому что значения не успевают вычислиться
        setTimeout(() => {
            !this.drawing && this.handlers.onClick?.(this.buildToolEvent());
            !this.drawing && this.logPlatformerCanvasEvent('click');
        }, 10)

    };

    /**
     ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION  CYCLE ANIMATION  CYCLE
     CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE ANIMATION CYCLE
     * */

    private logPlatformerCanvasEvent = (phase: PlatformerCanvasEventPhase): void => {
        const platformer = this.storeService.patternService.platformerService

        if (!platformer.isPlaying) {
            return
        }

        const event = this.frameRelatedEvents[0]

        platformerProfiler.logCanvasEvent(this.storeService.patternService.patternId, {
            phase,
            offsetX: event?.offsetX ?? -1,
            offsetY: event?.offsetY ?? -1,
            target: 'world',
            drawing: this.drawing,
        })
    }

    private buildToolEvent = (): CanvasServiceEvent => {
        const platformer = this.storeService.patternService.platformerService

        if (platformer.isPlaying) {
            return {
                events: this.frameRelatedEvents,
                context: platformer.getWorldContext(),
                canvas: platformer.getWorldCanvas(),
            }
        }

        return {
            events: this.frameRelatedEvents,
            context: this.buffer?.context,
            canvas: this.buffer?.canvas,
        }
    }

    onNewDrawEvent = () => {
        profileLogger.time('draw.onDraw', () => {
            this.handlers.onDraw?.(this.buildToolEvent());
            this.logPlatformerCanvasEvent('draw');
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
        const newFrameRelatedEvent = profileLogger.time('draw.resolveEvent', () =>
            this.documentDragEvents[0]
                ? this.getCanvasRelatedEvent(this.documentDragEvents[0])
                : this.frameRelatedEvents[0]
        );

        if (
            !this.drawOnMove ||
            (!this.isEqualOffset(prevFrameRelatedEvent, newFrameRelatedEvent))
        ) {
            this.onNewDrawEvent();
        }

        profileLogger.time('draw.pushFrameRelatedEvent', () => {
            this.pushFrameRelatedEvent(newFrameRelatedEvent);
        });
    };

    getCanvasRelatedEvent = (e: MouseEvent) => {

        if (!this.monitor) return;

        const offset = getOffset(this.monitor);

        if (!offset) return;

        const {top, left, box} = offset;
        const canvasCenter = {
            x: left + box.width / 2,
            y: top + box.height / 2
        };

        const rotation = this.storeService.getPatternState()?.rotation?.value;
        const { angle: rotationAngle, rotateDrawAreaElement: rotationView } = rotation || {};
        
        const rotatedE = rotate(
            canvasCenter.x, canvasCenter.y,
            e.pageX, e.pageY,
            rotationView ? rotationAngle : 0
        );

        return {
            ...e,
            offsetX: rotatedE.x - canvasCenter.x + this.monitor.width / 2,
            offsetY: rotatedE.y - canvasCenter.y + this.monitor.height / 2,
        };
    };

    start = () => {
        if (this.unsubscribeFrame) return;

        this.unsubscribeFrame = frameScheduler.subscribe(
            this.frameSubscriberId,
            this.onFrameTick,
            FramePriority.Draw,
        );
    };

    onFrameTick = () => {
        this.onFrame();
    };

    stop = () => {
        this.unsubscribeFrame?.();
        this.unsubscribeFrame = null;
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
        this.monitor?.addEventListener("mousemove", this.canvasMouseMoveHandler);

        // document.removeEventListener("touchend", this.mouseUpHandler);
        // document.removeEventListener("touchmove", this.documentMouseDragHandler);


        this.stop();

        this.drawing = false;
        this.startFrameRelatedEvent = null;

        this.handlers.onRelease?.(this.buildToolEvent());
        this.logPlatformerCanvasEvent('release');


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

        this.monitor?.removeEventListener("mousedown", this.mouseDownHandler);
        this.monitor?.removeEventListener("mousemove", this.canvasMouseMoveHandler);
    };

}
