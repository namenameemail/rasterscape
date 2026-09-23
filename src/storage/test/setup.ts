import 'fake-indexeddb/auto'

if (typeof globalThis.ImageData === 'undefined') {
    class ImageDataPolyfill {
        data: Uint8ClampedArray
        width: number
        height: number

        constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
            if (typeof dataOrWidth === 'number') {
                this.width = dataOrWidth
                this.height = widthOrHeight as number
                this.data = new Uint8ClampedArray(this.width * this.height * 4)
                return
            }

            this.data = dataOrWidth
            this.width = widthOrHeight as number
            this.height = height as number
        }
    }

    ;(globalThis as any).ImageData = ImageDataPolyfill
}
