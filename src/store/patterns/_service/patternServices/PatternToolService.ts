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
import {profileDebug} from "../../../../utils/profileDebug";
import {PatternBuffer} from "./PatternBuffer";


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

    pushCanvasPositionToStore = (e: MouseEvent) => {
        if (this.maskCanvasEventsService.drawing) {
            return;
        }
        this.patternService.storeService.dispatchPushPosition(e);
    };

    pushMaskPositionToStore = (e: MouseEvent) => {
        if (this.canvasEventsService.drawing) {
            return;
        }
        this.patternService.storeService.dispatchPushPosition(e);
    };

    resetPositionToStore = () => {
        this.patternService.storeService.dispatchResetPosition();
    }

    private bufferSyncMeta = (buffer: PatternBuffer | undefined, role: 'canvas' | 'mask') => ({
        role,
        serial: buffer?.contentSerial,
        gpuAhead: !!buffer?.isGpuAhead,
        fromCanvas: buffer?.textureFromCanvas,
    });

    private presentToolResult = () => {
        const buffer = this.patternService.canvasService.buffer;

        if (this.canvasToolService?.drewGpu) {
            profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'canvas'), path: 'drewGpu'});
            buffer?.presentGl();
            this.canvasToolService.drewGpu = false;
            return;
        }

        if (buffer?.isGpuAhead) {
            profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'canvas'), path: 'gpuAhead'});
            buffer.presentGl();
            return;
        }

        profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'canvas'), path: 'fromCpu'});
        this.patternService.canvasService.presentFromCpu();
    };

    private presentCanvasMonitor = () => {
        const buffer = this.patternService.canvasService.buffer;
        if (!buffer) return;
        if (buffer.isGpuAhead) {
            buffer.presentGl();
            return;
        }
        buffer.present();
    };

    canvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            this.canvasToolService?.handlers.onClick?.(...args);
            this.presentToolResult();
        },
        onDown: (...args) => {
            this.canvasToolService?.handlers.onDown?.(...args);
            this.presentCanvasMonitor();
        },
        onDraw: (...args) => {
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
        onPushPosition: this.pushCanvasPositionToStore,
        onResetPosition: this.resetPositionToStore,
    };

    private presentMaskToolResult = () => {
        const buffer = this.patternService.maskService.buffer;

        if (this.maskToolService?.drewGpu) {
            profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'mask'), path: 'drewGpu'});
            buffer?.presentGl();
            this.maskToolService.drewGpu = false;
            return;
        }

        if (buffer?.isGpuAhead) {
            profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'mask'), path: 'gpuAhead'});
            buffer.presentGl();
            return;
        }

        profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'mask'), path: 'fromCpu'});
        this.patternService.maskService.presentFromCpu();
    };

    private presentMaskMonitor = () => {
        const buffer = this.patternService.maskService.buffer;
        if (!buffer) return;
        if (buffer.isGpuAhead) {
            buffer.presentGl();
            return;
        }
        buffer.present();
    };

    maskCanvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            this.maskToolService?.handlers.onClick?.(...args);
            this.presentMaskToolResult();
        },
        onDown: (...args) => {
            this.maskToolService?.handlers.onDown?.(...args);
            this.presentMaskMonitor();
        },
        onDraw: (...args) => {
            profileLogger.time('draw.mask.tool', () => {
                this.maskToolService?.handlers.onDraw?.(...args);
            });
            this.presentMaskToolResult();
            if (!this.patternService.maskService.buffer?.isGpuAhead) {
                profileLogger.time('draw.mask.valuesMasked', () => {
                    this.patternService.valuesService.updateMaskedIfNeeded();
                });
            }
        },
        onRelease: (...args) => {
            this.maskToolService?.handlers.onRelease?.(...args);
            this.presentMaskToolResult();
            this.patternService.maskService.buffer?.ensureCpu();
            this.patternService.valuesService.update();
        },
        onPushPosition: this.pushMaskPositionToStore,
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
