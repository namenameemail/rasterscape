import {createCanvas} from '../../../../../utils/canvas/helpers/base'

export class WorldBuffer {
    width: number
    height: number
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    dirty = true

    constructor(width: number, height: number) {
        this.width = width
        this.height = height
        const helper = createCanvas(width, height)
        this.canvas = helper.canvas
        this.context = helper.context
    }

    setSize = (width: number, height: number): void => {
        if (this.width === width && this.height === height) {
            return
        }

        this.width = width
        this.height = height
        this.canvas.width = width
        this.canvas.height = height
        this.markDirty()
    }

    setImageData = (imageData: ImageData): void => {
        this.width = imageData.width
        this.height = imageData.height
        this.canvas.width = imageData.width
        this.canvas.height = imageData.height
        this.context.putImageData(imageData, 0, 0)
        this.markDirty()
    }

    loadFromImageData = (imageData: ImageData): void => {
        this.setSize(imageData.width, imageData.height)
        this.context.putImageData(imageData, 0, 0)
        this.markDirty()
    }

    getImageData = (): ImageData => {
        return this.context.getImageData(0, 0, this.width, this.height)
    }

    markDirty = (): void => {
        this.dirty = true
    }

    clearDirty = (): void => {
        this.dirty = false
    }

    isDirty = (): boolean => {
        return this.dirty
    }
}
