import {ECompositeOperation} from "../../../../../../store/compositeOperations";
import {createCanvas, HelperCanvas} from "../../../../../../utils/canvas/helpers/base";
import {drawMasked} from "../../../../../../utils/canvas/helpers/draw";
import {patternValues} from "../../../../../../store/patterns/values";
import {Cursors} from "./cursors";
import {PatternState} from "../../../../../../store/patterns/pattern/types";
import {EToolType} from "../../../../../../store/tool/types";
import {CanvasServiceEvent, ToolHandlers, ToolService} from "../types";
import {LineParams} from "../../../../../../store/line/types";
import {getRepeatingCoords} from "../../../../../../store/patterns/repeating/helpers";
import {PatternService} from "../../../PatternService";
import {getRandomColor} from "../../../../../../utils/utils";
import {ELineRandomType} from "../../../../../line/types";
import {patternsService} from "../../../../../index";

const getPatternStrokeStyle = (ctx, x, y, patternSize, linePattern: PatternState, linePatternImage, patternMouseCentered: boolean) => {
    const patternStrokeStyle = ctx.createPattern(linePatternImage, "repeat");
    const matrix = new DOMMatrix();

    const rotation = linePattern.config.rotation ? linePattern.rotation : null;

    patternStrokeStyle.setTransform(
        matrix
            .translateSelf(
                patternMouseCentered ? (x - linePattern.width / 2) : 0,
                patternMouseCentered ? (y - linePattern.height / 2) : 0,
            )
            .translateSelf(
                rotation?.value?.offset?.xd || 0,
                -rotation?.value?.offset?.yd || 0,
            )
            .translateSelf(
                linePattern.width / 2 + (rotation?.value?.offset?.xc || 0),
                linePattern.height / 2 - (rotation?.value?.offset?.yc || 0),
            )
            .rotateSelf(rotation?.value?.angle || 0)
            .scaleSelf(patternSize)
            .translateSelf(
                -linePattern.width / 2 - (rotation?.value?.offset?.xc || 0),
                -linePattern.height / 2 + (rotation?.value?.offset?.yc || 0),
            )
    );
    return patternStrokeStyle;
};

export class LineSolidPattern implements ToolService {
    patternService: PatternService;

    prevPoints: Record<string, { x: number, y: number }> = {};

    canvases: Record<string, HelperCanvas> = {};

    helperCanvas1: HelperCanvas;
    helperCanvas2: HelperCanvas;

    handlers: ToolHandlers = {};

    draw: boolean = false;

    constructor(patternService: PatternService, _width?: number, _height?: number) {
        this.patternService = patternService;

        const width = _width || this.patternService.canvasService.canvas?.width || 50;
        const height = _height || this.patternService.canvasService.canvas?.height || 50;

        this.helperCanvas1 = createCanvas(width, height);
        this.helperCanvas2 = createCanvas(width, height);

        this.handlers = {
            onDown: () => {
            },
            onDraw: this.lineDraw,
            onClick: this.lineDraw,
            onRelease: () => {
                this.draw = false;
                this.canvases = {};
            }
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

    lineDraw = (brushEvent: CanvasServiceEvent) => {
        const {context, events, gpuAhead} = brushEvent;

        if (!events[0]) return;

        const state = this.patternService.storeService.getState();

        const pattern = state.patterns[this.patternService.patternId];
        const {width, height} = pattern;
        const {size, opacity, compositeOperation, cap, join, patternMouseCentered, patternId, patternSize} = state.line.params as LineParams;
        const coordinates = state.position.coordinates;
        const newPrevPoints = {};

        const toolPattern = state.patterns[patternId];

        if (gpuAhead) {
            this.patternService.canvasService.buffer?.ensureCpu();
            patternsService.pattern[patternId]?.valuesService.updateMaskedIfNeeded(true);
        }

        const linePatternImage = patternsService.pattern[patternId]?.valuesService.masked;

        if (!linePatternImage || !toolPattern) return;

        const selectionMask = this.patternService.selectionService.mask;

        if (!this.draw) {

            this.draw = true;


            coordinates[0]?.forEach(({x, y, id: index}) => {
                this.canvases[index] = createCanvas(width, height);


                const context = this.canvases[index]?.context;

                if (!context) return;

                context.beginPath();
                context.moveTo(x, y);

            });
        } else {

            coordinates[0]?.forEach(({x, y, id: index}) => {
                if (!this.canvases[index]) {
                    this.canvases[index] = createCanvas(width, height);
                }
                const context = this.canvases[index]?.context;


                this.canvases[index].clear();

                newPrevPoints[index] = {x, y};

                context.lineWidth = size;
                context.lineJoin = join;
                context.lineCap = cap;
                context.globalAlpha = size ? opacity : 0; // нулеввой размер почему то не устанавливается

                context.strokeStyle = getPatternStrokeStyle(context, x, y, patternSize, toolPattern, linePatternImage, patternMouseCentered);


                if (this.prevPoints[index]) {
                    context.lineTo(x, y);
                } else {
                    context.closePath();
                    context.moveTo(x, y);
                }

                context.stroke();

                this.helperCanvas1.context.drawImage(this.canvases[index].canvas, 0, 0);
            });

            const resultCanvas: HelperCanvas = selectionMask
                ? drawMasked(
                    selectionMask,
                    ({context}) => {

                        context.drawImage(this.helperCanvas1.canvas, 0, 0);
                        this.helperCanvas1.clear();
                    }
                )(
                    this.helperCanvas2
                )
                : this.helperCanvas1;


            context.globalCompositeOperation = compositeOperation;
            context.globalAlpha = opacity;
            context.drawImage(resultCanvas.canvas, 0, 0);

            resultCanvas.clear();

        }
        this.prevPoints = newPrevPoints;
    }
}
//
//
// export const lineSolidPattern = function () {
//     let draw: boolean = false;
//     let canvases: Record<string, HelperCanvas> = {};
//     let prevPoints = {};
//
//     let helperCanvas1 = createCanvas(400, 400);
//     let helperCanvas2 = createCanvas(400, 400);
//
//     return (drawToolProps: DrawToolProps) => {
//         const {
//             targetPattern,
//             toolPattern,
//             toolParams,
//             coordinates
//         } = drawToolProps;
//
//         const pattern = targetPattern;
//         const linePattern = toolPattern;
//         const {
//             size,
//             patternSize,
//             opacity,
//             compositeOperation,
//             cap,
//             join,
//             patternMouseCentered
//         } = toolParams as LineParams;
//
//         const {width, height} = pattern;
//
//         return {
//             draw: (ev) => {
//                 const {ctx, e} = ev;
//
//                 if (!e) return;
//
//                 const newPrevPoints = {};
//
//                 const linePatternImage = patternValues.values[linePattern?.id]?.current;
//
//                 if (!linePatternImage || !linePattern) return;
//
//                 const selectionMask = pattern.selection && pattern.selection.value.mask;
//
//                 if (!draw) {
//
//                     draw = true;
//
//                     if (helperCanvas1.canvas.height !== height || helperCanvas1.canvas.width !== width
//                         || helperCanvas2.canvas.height !== height || helperCanvas2.canvas.width !== width) {
//
//                         helperCanvas1.canvas.height = height;
//                         helperCanvas1.canvas.width = width;
//
//                         helperCanvas2.canvas.height = height;
//                         helperCanvas2.canvas.width = width;
//                     }
//
//                     coordinates
//                         .forEach(({x, y, id: index}) => {
//                             canvases[index] = createCanvas(width, height);
//
//
//                             const context = canvases[index]?.context;
//
//                             if (!context) return;
//
//                             context.beginPath();
//                             context.moveTo(x, y);
//
//                         });
//                 } else {
//
//                     coordinates
//                         .forEach(({x, y, id: index}) => {
//
//                             const context = canvases[index]?.context;
//                             if (!context) return;
//
//                             canvases[index].clear();
//
//                             newPrevPoints[index] = {x, y};
//
//                             context.lineWidth = size;
//                             context.lineJoin = join;
//                             context.lineCap = cap;
//                             context.globalAlpha = size ? opacity : 0; // нулеввой размер почему то не устанавливается
//
//                             context.strokeStyle = getPatternStrokeStyle(ctx, x, y, patternSize, linePattern, linePatternImage, patternMouseCentered);
//
//
//                             if (prevPoints[index]) {
//                                 context.lineTo(x, y);
//                             } else {
//                                 context.closePath();
//                                 context.moveTo(x, y);
//                             }
//
//                             context.stroke();
//
//                             helperCanvas1.context.drawImage(canvases[index].canvas, 0, 0);
//                         });
//
//                     const resultCanvas: HelperCanvas = selectionMask
//                         ? drawMasked(
//                             selectionMask,
//                             ({context}) => {
//
//                                 context.drawImage(helperCanvas1.canvas, 0, 0);
//                                 helperCanvas1.clear();
//                             }
//                         )(
//                             helperCanvas2
//                         )
//                         : helperCanvas1;
//
//
//                     ctx.globalCompositeOperation = compositeOperation;
//                     ctx.globalAlpha = opacity;
//                     ctx.drawImage(resultCanvas.canvas, 0, 0);
//                     resultCanvas.clear();
//
//                 }
//                 prevPoints = newPrevPoints;
//             },
//             release: () => {
//                 draw = false;
//                 canvases = {};
//             },
//             cursors: ({x, y, outer}) => {
//
//                 let size = Math.max((toolParams as LineParams).size, 10);
//
//                 const rotation = (pattern.config.rotation && pattern.rotation.value.rotateDrawAreaElement) ? pattern.rotation.value : null;
//
//                 return Cursors.cross(x, y, size, rotation);
//             }
//         }
//     }
// };
