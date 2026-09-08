import * as React from "react";

import {
    drawMasked,
    drawWithRotationAndOffset
} from "../../../../../../utils/canvas/helpers/draw";
import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {getRandomColor} from "../../../../../../utils/utils";
import {patternValues} from "../../../../../../store/patterns/values";
import {Cursors} from "./cursors";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {BrushParams, BrushSelectParams} from "../../../../../../store/brush/types";
import {PatternService} from "../../../PatternService";
import {EBrushType} from "../../../../../brush/types";
import {drawWithRotation} from "../../../../../../utils/canvas/helpers/draw";
import {circle} from "../../../../../../utils/canvas/helpers/geometry";

export class BrushSelect implements ToolService {
    patternService: PatternService;

    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;

    handlers: ToolHandlers = {};

    constructor(patternService: PatternService, _width?: number, _height?: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDown: (brushEvent: CanvasServiceEvent) => {
                const event = brushEvent.events[0];

                const state = this.patternService.storeService.getState();

                const targetPattern = state.patterns[this.patternService.patternId];

                this.offsetX = this.offsetX || (event.offsetX - targetPattern.width / 2);
                this.offsetY = this.offsetY || (event.offsetY - targetPattern.height / 2);
            },
            onDraw: this.brushSelect,
            onClick: this.brushSelect,
            onRelease: () => {
                this.offsetX = 0;
                this.offsetY = 0;
            },
            // cursors: ({x, y}) => {
            //     return Cursors.circle(x, y, (toolParams as BrushShapeParams).size)
            // }
        };
    }

    setSize = (width: number, height: number) => {
        this.helperCanvas1.canvas.width = width;
        this.helperCanvas2.canvas.width = width;
        this.helperCanvas1.canvas.height = height;
        this.helperCanvas2.canvas.height = height;
    };
    offsetX = 0;
    offsetY = 0;

    brushSelect = (brushEvent: CanvasServiceEvent) => {
        const {context, events, gpuAhead} = brushEvent;

        if (!events[0]) return;

        if (gpuAhead) {
            this.patternService.canvasService.buffer?.ensureCpu();
        }

        const state = this.patternService.storeService.getState();

        const targetPattern = state.patterns[this.patternService.patternId];
        const {
            size: patternSize,
            opacity,
            compositeOperation,
        } = state.brush.params.paramsByType[EBrushType.Select];
        const coordinates = state.position.coordinates;

        context.globalAlpha = opacity;
        context.globalCompositeOperation = compositeOperation;
        context.imageSmoothingEnabled = true;

        const brushRotation = targetPattern?.config?.rotation ? targetPattern?.rotation?.value : null;
        const destinationRotation = (
            targetPattern?.config?.rotation &&
            targetPattern?.rotation?.value?.rotateDrawAreaElement
        ) ? targetPattern?.rotation?.value : null;

        const brushPatternImage = this.patternService.valuesService.selected;

        // imageDebug.setImage(brushPatternImage);
        if (!brushPatternImage) return;

        // 1 patternSize - divide two
        const width = patternSize * brushPatternImage.width;
        const height = patternSize * brushPatternImage.height;


        // this.offsetX = this.offsetX || (events[0].offsetX - targetPattern.width / 2);
        // this.offsetY = this.offsetY || (events[0].offsetY - targetPattern.height / 2);

        coordinates[0]?.forEach(({x, y}) => {

            //
            const destAngle = destinationRotation ? destinationRotation.angle : 0;

            const brushAngle = brushRotation ? brushRotation.angle : 0;
            const brushCenter = brushRotation ? {
                x: patternSize * brushRotation.offset.xc,
                y: patternSize * brushRotation.offset.yc
            } : {x: 0, y: 0};
            const brushOffset = brushRotation ? {
                x: patternSize * brushRotation.offset.xd,
                y: patternSize * brushRotation.offset.yd
            } : {x: 0, y: 0};


            drawWithRotationAndOffset(
                brushAngle,
                destAngle,
                brushCenter.x, -brushCenter.y,
                brushOffset.x, -brushOffset.y,
                x - this.offsetX, y - this.offsetY,
                ({context, canvas}) => {
                    context.drawImage(brushPatternImage, -width / 2, -height / 2, width, height);
                }
            )(this.helperCanvas1);


        });

        const resultCanvas: HelperCanvas = this.helperCanvas1;


        context.globalCompositeOperation = compositeOperation;
        context.globalAlpha = opacity;
        context.drawImage(resultCanvas.canvas, 0, 0);
        resultCanvas.clear();

        context.globalCompositeOperation = ECompositeOperation.SourceOver;
        context.globalAlpha = 1;
    };
}

// export const brushSelect = function () {
//
//     let helperCanvas1 = createCanvas(400, 400);
//     let helperCanvas2 = createCanvas(400, 400);
//
//     let offsetX = 0;
//     let offsetY = 0;
//     return (drawToolProps: DrawToolProps) => {
//         const {
//             targetPattern,
//             // toolPattern,
//             toolParams,
//             coordinates,
//         } = drawToolProps;
//
//         const {size: patternSize, opacity, compositeOperation} = toolParams as BrushSelectParams;
//         const brushPattern = targetPattern;
//         const destinationPattern = targetPattern;
//
//         if (
//             targetPattern.width !== helperCanvas1.canvas.width ||
//             targetPattern.height !== helperCanvas1.canvas.height ||
//             targetPattern.width !== helperCanvas2.canvas.width ||
//             targetPattern.height !== helperCanvas2.canvas.height
//         ) {
//             helperCanvas1.canvas.width = targetPattern.width;
//             helperCanvas1.canvas.height = targetPattern.height;
//             helperCanvas2.canvas.width = targetPattern.width;
//             helperCanvas2.canvas.height = targetPattern.height;
//         }
//
//         const patternBrush = (ev) => {
//             const {ctx, e, canvas} = ev;
//
//             if (!e) return;
//
//
//             ctx.globalAlpha = opacity;
//             ctx.globalCompositeOperation = compositeOperation;
//             ctx.imageSmoothingEnabled = true;
//
//             const brushRotation = brushPattern?.config?.rotation ? brushPattern?.rotation?.value : null;
//             const destinationRotation = (
//                 destinationPattern?.config?.rotation &&
//                 destinationPattern?.rotation?.value?.rotateDrawAreaElement
//             ) ? destinationPattern?.rotation?.value : null;
//
//             const brushPatternImage = patternValues.values[destinationPattern?.id]?.selected;
//
//             // imageDebug.setImage(brushPatternImage);
//             if (!brushPatternImage) return;
//
//             // 1 patternSize - divide two
//             const width = patternSize * brushPatternImage.width;
//             const height = patternSize * brushPatternImage.height;
//
//
//             offsetX = offsetX || (e.offsetX - destinationPattern.width / 2);
//             offsetY = offsetY || (e.offsetY - destinationPattern.height / 2);
//
//             coordinates.forEach(({x, y}) => {
//
//                 //
//                 const destAngle = destinationRotation ? destinationRotation.angle : 0;
//
//                 const brushAngle = brushRotation ? brushRotation.angle : 0;
//                 const brushCenter = brushRotation ? {
//                     x: patternSize * brushRotation.offset.xc,
//                     y: patternSize * brushRotation.offset.yc
//                 } : {x: 0, y: 0};
//                 const brushOffset = brushRotation ? {
//                     x: patternSize * brushRotation.offset.xd,
//                     y: patternSize * brushRotation.offset.yd
//                 } : {x: 0, y: 0};
//
//
//                 drawWithRotationAndOffset(
//                     brushAngle,
//                     destAngle,
//                     brushCenter.x, -brushCenter.y,
//                     brushOffset.x, -brushOffset.y,
//                     x - offsetX, y - offsetY,
//                     ({context, canvas}) => {
//                         context.drawImage(brushPatternImage, -width / 2, -height / 2, width, height);
//                     }
//                 )(helperCanvas1);
//
//
//             });
//
//             const resultCanvas: HelperCanvas = helperCanvas1;
//
//
//             ctx.globalCompositeOperation = compositeOperation;
//             ctx.globalAlpha = opacity;
//             ctx.drawImage(resultCanvas.canvas, 0, 0);
//             resultCanvas.clear();
//
//             ctx.globalCompositeOperation = ECompositeOperation.SourceOver;
//             ctx.globalAlpha = 1;
//         };
//         return {
//             draw: patternBrush,
//             click: patternBrush,
//             release: () => {
//                 offsetX = 0;
//                 offsetY = 0;
//             },
//             cursors: ({x, y, outer}) => {
//
//                 return (
//                     <>
//                         {Cursors.cross(x, y, 20)}
//                     </>
//                 );
//             }
//         }
//     }
// };

