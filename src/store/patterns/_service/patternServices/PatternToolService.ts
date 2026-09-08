import {PatternService} from "../PatternService";
import {EToolType} from "../../../tool/types";
import {EBrushType} from "../../../brush/types";
import {ELineType} from "../../../line/types";
import {ToolService} from "./CanvasEventsService/types";
import {CanvasEventHandlers, CanvasEventsService} from "./CanvasEventsService";
import {BrushShape} from "./CanvasEventsService/ToolsServices/brushForm";
import {BrushPattern} from "./CanvasEventsService/ToolsServices/brushPattern";
import {LineSolid} from "./CanvasEventsService/ToolsServices/lineSolid";
import {BrushSelect} from "./CanvasEventsService/ToolsServices/brushSelect";
import {LineSolidPattern} from "./CanvasEventsService/ToolsServices/lineSolidPattern";
import {LineTrailingPattern} from "./CanvasEventsService/ToolsServices/lineTrailingPattern";
import {profileLogger} from "../../../../utils/profiling/ProfileLogger";
import {patternsService} from "../../../index";
import {getActiveToolSourcePatternIds} from "./valuesServiceHelpers";


export const BrushServiceByType = {
    [EToolType.Brush]: {
        [EBrushType.Shape]: BrushShape,
        [EBrushType.Select]: BrushSelect,
        [EBrushType.Pattern]: BrushPattern
    },
    [EToolType.Line]: {
        [ELineType.Solid]: LineSolid,
        [ELineType.SolidPattern]: LineSolidPattern,
        [ELineType.TrailingPattern]: LineTrailingPattern
    }
};


export class PatternToolService {
    patternService: PatternService;

    canvasEventsService: CanvasEventsService;
    canvasToolService: ToolService;

    maskCanvasEventsService: CanvasEventsService;
    maskToolService: ToolService;

    constructor(patternService: PatternService) {
        this.patternService = patternService;


        this.canvasEventsService = new CanvasEventsService(this.canvasEventHandlers, this.patternService.storeService, 'canvas');
        this.maskCanvasEventsService = new CanvasEventsService(this.maskCanvasEventHandlers, this.patternService.storeService, 'mask');

    }

    pushPositionToStore = (e: MouseEvent) => {
        this.patternService.storeService.dispatchPushPosition(e);
    }
    resetPositionToStore = () => {
        this.patternService.storeService.dispatchResetPosition();
    }

    syncActiveToolSourceValues = () => {
        const state = this.patternService.storeService.getState();

        for (const patternId of getActiveToolSourcePatternIds(state)) {
            patternsService.pattern[patternId]?.valuesService.updateMaskedIfNeeded();
        }
    }

    private presentToolResult = () => {
        const buffer = this.patternService.canvasService.buffer;

        if (this.canvasToolService?.drewGpu) {
            buffer?.presentGl();
            this.canvasToolService.drewGpu = false;
            return;
        }

        if (buffer?.isGpuAhead) {
            buffer.presentGl();
            return;
        }

        this.patternService.canvasService.presentFromCpu();
    };

    canvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            const gpuAhead = !!this.patternService.canvasService.buffer?.isGpuAhead;
            if (!gpuAhead) {
                this.syncActiveToolSourceValues();
            }
            this.canvasToolService?.handlers.onClick?.(...args);
            this.presentToolResult();
        },
        onDown: (...args) => {
            this.canvasToolService?.handlers.onDown?.(...args);
            this.presentToolResult();
        },
        onDraw: (...args) => {
            const gpuAhead = !!this.patternService.canvasService.buffer?.isGpuAhead;
            if (!gpuAhead) {
                this.syncActiveToolSourceValues();
            }
            profileLogger.time('draw.tool', () => {
                this.canvasToolService?.handlers.onDraw?.(...args);
            });
            this.presentToolResult();
            if (this.patternService.platformerService.isPlaying) {
                this.patternService.platformerService.markWorldDirty('tool.onDraw');
            }
            if (!this.patternService.canvasService.buffer?.isGpuAhead) {
                profileLogger.time('draw.valuesMasked', () => {
                    this.patternService.valuesService.updateMaskedIfNeeded();
                });
            }
        },
        onRelease: (...args) => {
            this.canvasToolService?.handlers.onRelease?.(...args);
            this.presentToolResult();
            if (this.patternService.platformerService.isPlaying) {
                this.patternService.platformerService.markWorldDirty('tool.onRelease');
            }
            this.patternService.valuesService.update();
        },
        onPushPosition: this.pushPositionToStore,
        onResetPosition: this.resetPositionToStore,
    };

    maskCanvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            this.maskToolService?.handlers.onClick?.(...args);
            this.patternService.maskService.presentFromCpu();
        },
        onDown: (...args) => {
            this.maskToolService?.handlers.onDown?.(...args);
            this.patternService.maskService.presentFromCpu();
        },
        onDraw: (...args) => {
            profileLogger.time('draw.mask.tool', () => {
                this.maskToolService?.handlers.onDraw?.(...args);
            });
            this.patternService.maskService.presentFromCpu();
            profileLogger.time('draw.mask.valuesMasked', () => {
                this.patternService.valuesService.updateMaskedIfNeeded();
            });
        },
        onRelease: (...args) => {
            this.maskToolService?.handlers.onRelease?.(...args);
            this.patternService.maskService.presentFromCpu();
            this.patternService.valuesService.update();
        },
        onPushPosition: this.pushPositionToStore,
        onResetPosition: this.resetPositionToStore,
    };

    bindCanvas = (): PatternService => {
        const {monitor, buffer} = this.patternService.canvasService;

        if (!monitor || !buffer) {
            return this.patternService;
        }

        this.canvasEventsService.bindCanvas(monitor, buffer);
        this.setToolSize(buffer.width, buffer.height);

        return this.patternService;
    };

    unbindCanvas = (): PatternService => {
        this.canvasEventsService.unbindCanvas();

        return this.patternService;
    };

    bindMaskCanvas = (): PatternService => {
        const {monitor, buffer} = this.patternService.maskService;

        if (!monitor || !buffer) {
            return this.patternService;
        }

        this.maskCanvasEventsService.bindCanvas(monitor, buffer);
        this.setToolSize(buffer.width, buffer.height);

        return this.patternService;
    };

    unbindMaskCanvas = (): PatternService => {
        this.maskCanvasEventsService.unbindCanvas();

        return this.patternService;
    };

    bindTool = (tool: EToolType, toolType: EBrushType | ELineType, width?: number, height?: number): PatternService => {
        const BrushService = BrushServiceByType[tool]?.[toolType];

        if (BrushService) {
            this.canvasToolService = new BrushService(this.patternService, width, height);
            this.maskToolService = new BrushService(this.patternService, width, height);
        } else {
            this.canvasToolService = null;
            this.maskToolService = null;
        }

        return this.patternService;
    }

    setToolSize = (width: number, height: number) => {
        this.canvasToolService?.setSize(width, height);
        this.maskToolService?.setSize(width, height);
    };
}
