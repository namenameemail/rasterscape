import {decodeSerializedImage, encodeRawImage} from './imageDataBinary'

export interface SerializedImageData {
    width: number
    height: number
    data: string
}

export type RawStoredImageData = {
    width: number
    height: number
    bytes: ArrayBuffer
}

export type DecodableImageData = SerializedImageData | RawStoredImageData

export function isRawStoredImageData(value: DecodableImageData): value is RawStoredImageData {
    return 'bytes' in value && value.bytes instanceof ArrayBuffer
}

export function encodeImageData(imageData: ImageData | null | undefined): SerializedImageData | null {
    if (!imageData) {
        return null
    }

    return encodeRawImage(imageData.width, imageData.height, imageData.data.slice().buffer)
}

export function decodeImageData(serialized: DecodableImageData | null | undefined): ImageData | null {
    if (!serialized) {
        return null
    }

    if (isRawStoredImageData(serialized)) {
        return new ImageData(
            new Uint8ClampedArray(serialized.bytes.slice(0)),
            serialized.width,
            serialized.height,
        )
    }

    return decodeSerializedImage(serialized)
}
