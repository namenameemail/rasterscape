import {pathDataToString} from "../../../../utils/path";
import {Segments} from "../../selection/types";
import {PatternService} from "../PatternService";
import {HelperCanvas} from "../../../../utils/canvas/helpers/base";
import {ensureCanvas} from "../../../../utils/canvas/helpers/composite";

export class PatternSelectionService {

    patternService: PatternService;

    isSelected?: boolean = false;

    mask?: ImageData;
    maskCanvas?: HTMLCanvasElement;
    bBox?: SVGRect;

    private maskBuffer?: HelperCanvas;

    constructor(patternService: PatternService) {
        this.patternService = patternService;
    }

    update = (segments: Segments, bBox?: SVGRect): PatternService => {
        const canvas = this.patternService.canvasService.canvas;

        if (segments.length && canvas) {
            const {width, height} = canvas;
            this.maskBuffer = ensureCanvas(this.maskBuffer, width, height);
            this.maskBuffer.context.fillStyle = 'black';
            this.maskBuffer.context.fill(new Path2D(pathDataToString(segments)));

            this.maskCanvas = this.maskBuffer.canvas;
            this.mask = this.maskBuffer.context.getImageData(0, 0, width, height);
            this.bBox = bBox;
        } else {
            this.mask = undefined;
            this.maskCanvas = undefined;
            this.bBox = undefined;
        }

        return this.patternService;
    };
}
