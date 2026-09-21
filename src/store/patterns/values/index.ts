import {createMaskedImageFromImageData} from "../../../utils/canvas/helpers/imageData";
import {SelectionBBox} from "../selection/types";
import {imageDebug} from "../../../components/Area/canvasPosition.servise";

export interface PatternItemValues {
    current?: HTMLCanvasElement;
    selected?: HTMLCanvasElement;
}
export const patternValues = new (class PatternValues {
    values: {
        [id: string]: PatternItemValues
    } = {};

    setValue = (id: string, imageData: ImageData, mask: ImageData, inverse: boolean) => {
        this.values[id] = {
            current: createMaskedImageFromImageData(imageData, mask, inverse),
            selected: this.values[id]?.selected,
        };
        return true;
    }

    setSelectedValue = (id: string, imageData?: ImageData, mask?: ImageData, _bBox?: SelectionBBox | null) => {
        const selected = (imageData && mask) ? createMaskedImageFromImageData(imageData, mask) : undefined;

        this.values[id] = {
            selected,
            current: this.values[id]?.current,
        };

        imageDebug.setImage(selected || null)
        return true;
    }
})();
