import {encodeImageData} from '../../utils/imageDataCodec'
import {
    ProjectPayloadV1,
    SerializedPattern,
    SerializedPatternHistoryItem,
} from '../projectTypes'

export function makeImage(width: number, height: number, fill: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4)
    data.fill(fill)
    return new ImageData(data, width, height)
}

export function imagePixelsEqual(a: ImageData | null | undefined, b: ImageData | null | undefined): boolean {
    if (!a || !b) {
        return a === b
    }

    if (a.width !== b.width || a.height !== b.height || a.data.length !== b.data.length) {
        return false
    }

    for (let i = 0; i < a.data.length; i++) {
        if (a.data[i] !== b.data[i]) {
            return false
        }
    }

    return true
}

export function inlineHistoryItem(canvas: ImageData, mask: ImageData): SerializedPatternHistoryItem {
    return {
        canvasImageData: encodeImageData(canvas),
        maskImageData: encodeImageData(mask),
    }
}

function minimalPattern(
    history: NonNullable<SerializedPattern['state']['history']>,
): SerializedPattern {
    return {
        state: {
            history,
        } as SerializedPattern['state'],
    }
}

export function makeHistoryPayload(args: {
    patternOrder: string[]
    activePatternId: string | null
    patterns: Record<string, {
        before: SerializedPatternHistoryItem[]
        after: SerializedPatternHistoryItem[]
        current: SerializedPatternHistoryItem
    }>
}): ProjectPayloadV1 {
    const patterns: ProjectPayloadV1['patterns'] = {}

    for (const [id, history] of Object.entries(args.patterns)) {
        patterns[id] = minimalPattern({
            params: {length: 23},
            value: {
                before: history.before,
                after: history.after,
                current: history.current,
            },
        })
    }

    return {
        version: 1,
        patternOrder: args.patternOrder,
        activePatternId: args.activePatternId,
        patterns,
        changeFunctions: {functions: {}, functionsConstants: {}, namesList: []},
        changingValues: {},
        dependencies: {changeFunctionToPattern: {}, patternToChangeFunction: {}},
        tool: {} as ProjectPayloadV1['tool'],
        brush: {} as ProjectPayloadV1['brush'],
        line: {} as ProjectPayloadV1['line'],
        selectTool: {} as ProjectPayloadV1['selectTool'],
        color: {} as ProjectPayloadV1['color'],
    }
}
