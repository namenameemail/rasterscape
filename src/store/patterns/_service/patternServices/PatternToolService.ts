import {PatternService} from "../PatternService";
import {EToolType} from "../../../tool/types";
import {EBrushType} from "../../../brush/types";
import {ELineType} from "../../../line/types";
import {ToolService, CanvasServiceEvent} from "./CanvasEventsService/types";
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
        premul: buffer?.texturePremul,
    });

    private presentToolResult = () => {
        const buffer = this.patternService.canvasService.buffer;
        if (!buffer) return;

        if (buffer.isGpuAhead) {
            profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'canvas'), path: 'gpu'});
            buffer.presentGl();
            return;
        }

        profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'canvas'), path: 'cpu'});
        this.patternService.canvasService.presentFromCpu();
    };

    private presentCanvasMonitor = () => {
        this.patternService.canvasService.buffer?.present();
    };

    private isVolumeViewOrbit = (): boolean => {
        const id = this.patternService.patternId
        return !!this.patternService.storeService.getState().patterns[id]?.video?.params?.volumeViewOn
    }

    private handleVolumePointer = (
        type: 'down' | 'move' | 'up',
        e: CanvasServiceEvent,
    ) => {
        const ev = e.events[0]
        if (!ev) return
        this.patternService.videoService.volumeView.handlePointer({
            type,
            x: ev.offsetX,
            y: ev.offsetY,
            buttons: ev.buttons ?? (type === 'up' ? 0 : 1),
        })
    }

    canvasEventHandlers: CanvasEventHandlers = {
        onClick: (...args) => {
            if (this.isVolumeViewOrbit()) return
            this.canvasToolService?.handlers.onClick?.(...args);
            this.presentToolResult();
        },
        onDown: (...args) => {
            if (this.isVolumeViewOrbit()) {
                this.handleVolumePointer('down', args[0])
                return
            }
            this.canvasToolService?.handlers.onDown?.(...args);
            this.presentCanvasMonitor();
        },
        onDraw: (...args) => {
            if (this.isVolumeViewOrbit()) {
                this.handleVolumePointer('move', args[0])
                return
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
            if (this.isVolumeViewOrbit()) {
                this.handleVolumePointer('up', args[0])
                return
            }
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
        if (!buffer) return;

        if (buffer.isGpuAhead) {
            profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'mask'), path: 'gpu'});
            buffer.presentGl();
            return;
        }

        profileDebug('draw', 'present', {...this.bufferSyncMeta(buffer, 'mask'), path: 'cpu'});
        this.patternService.maskService.presentFromCpu();
    };

    private presentMaskMonitor = () => {
        this.patternService.maskService.buffer?.present();
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
