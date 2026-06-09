import {decodeSerializedImage, encodeRawImage} from './imageDataBinary';

export interface SerializedImageData {
    width: number
    height: number
    data: string
}

export function encodeImageData(imageData: ImageData | null | undefined): SerializedImageData | null {
    if (!imageData) {
        return null;
    }

    return encodeRawImage(imageData.width, imageData.height, imageData.data.slice().buffer);
}

export function decodeImageData(serialized: SerializedImageData | null | undefined): ImageData | null {
    return decodeSerializedImage(serialized);
}
