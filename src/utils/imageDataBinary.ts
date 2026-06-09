import {SerializedImageData} from './imageDataCodec';

export function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }

    return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8ClampedArray {
    const binary = atob(base64);
    const bytes = new Uint8ClampedArray(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

export function encodeRawImage(width: number, height: number, bytes: ArrayBuffer): SerializedImageData {
    return {
        width,
        height,
        data: uint8ToBase64(new Uint8Array(bytes)),
    };
}

export function decodeSerializedImage(serialized: SerializedImageData | null | undefined): ImageData | null {
    if (!serialized) {
        return null;
    }

    const data = base64ToUint8(serialized.data);
    return new ImageData(data, serialized.width, serialized.height);
}

export function cloneImageBuffer(imageData: ImageData | null | undefined): ArrayBuffer | null {
    if (!imageData) {
        return null;
    }

    return imageData.data.slice().buffer;
}
