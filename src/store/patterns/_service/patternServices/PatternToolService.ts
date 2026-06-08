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

    canvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            this.canvasToolService?.handlers.onClick?.(...args)
        },
        onDown: (...args) => {
            this.canvasToolService?.handlers.onDown?.(...args)
        },
        onDraw: (...args) => {
            this.syncActiveToolSourceValues();
            profileLogger.time('draw.tool', () => {
                this.canvasToolService?.handlers.onDraw?.(...args);
            });
            if (this.patternService.platformerService.isPlaying) {
                this.patternService.platformerService.markWorldDirty('tool.onDraw');
                this.patternService.platformerService.refreshDisplay();
            }
            profileLogger.time('draw.valuesMasked', () => {
                this.patternService.valuesService.updateMaskedIfNeeded();
            });
        },
        onRelease: (...args) => {
            this.canvasToolService?.handlers.onRelease?.(...args);
            if (this.patternService.platformerService.isPlaying) {
                this.patternService.platformerService.markWorldDirty('tool.onRelease');
                this.patternService.platformerService.refreshDisplay();
            }
            this.patternService.valuesService.update();
        },
        onPushPosition: this.pushPositionToStore,
        onResetPosition: this.resetPositionToStore,
    };

    maskCanvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            this.maskToolService?.handlers.onClick?.(...args)
        },
        onDown: (...args) => {
            this.maskToolService?.handlers.onDown?.(...args)
        },
        onDraw: (...args) => {
            profileLogger.time('draw.mask.tool', () => {
                this.maskToolService?.handlers.onDraw?.(...args);
            });
            profileLogger.time('draw.mask.valuesMasked', () => {
                this.patternService.valuesService.updateMaskedIfNeeded();
            });
        },
        onRelease: (...args) => {
            this.maskToolService?.handlers.onRelease?.(...args);
            this.patternService.valuesService.update();
        },
        onPushPosition: this.pushPositionToStore,
        onResetPosition: this.resetPositionToStore,
    };

    bindCanvas = (): PatternService => {
        const canvas = this.patternService.canvasService.canvas;
        this.canvasEventsService.bindCanvas(canvas);
        this.setToolSize(canvas.width, canvas.height);

        return this.patternService;
    };

    bindMaskCanvas = (): PatternService => {
        const canvas = this.patternService.maskService.canvas;
        this.maskCanvasEventsService.bindCanvas(canvas);
        this.setToolSize(canvas.width, canvas.height);

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
