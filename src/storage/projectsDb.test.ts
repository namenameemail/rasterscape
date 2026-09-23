import {beforeEach, describe, expect, it} from 'vitest'
import {
    createExportFile,
    decodePayload,
    deserializeProjectPayload,
    encodePayload,
    parseProjectExportFile,
} from './projectSerializer'
import {
    deleteProject,
    duplicateProject,
    getProject,
    getProjectPayload,
    putProject,
    resetProjectsDbForTests,
} from './projectsDb'
import {getPatternPreviewsFromPayload} from './projectPatternPreviews'
import {decodeImageData} from '../utils/imageDataCodec'
import {
    imagePixelsEqual,
    inlineHistoryItem,
    makeHistoryPayload,
    makeImage,
} from './test/fixtures'

describe('project save/load contract', () => {
    beforeEach(async () => {
        await resetProjectsDbForTests()
    })

    it('keeps history order and pixels after roundtrip', async () => {
        const oldest = makeImage(2, 2, 10)
        const prev = makeImage(2, 2, 40)
        const current = makeImage(2, 2, 90)
        const redo = makeImage(2, 2, 200)
        const maskA = makeImage(2, 2, 1)
        const maskB = makeImage(2, 2, 2)
        const maskC = makeImage(2, 2, 3)
        const maskD = makeImage(2, 2, 4)

        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [
                        inlineHistoryItem(oldest, maskA),
                        inlineHistoryItem(prev, maskB),
                    ],
                    after: [inlineHistoryItem(redo, maskD)],
                    current: inlineHistoryItem(current, maskC),
                },
            },
        })

        await putProject('p1', 'One', payload)
        const loaded = await getProjectPayload('p1')
        expect(loaded).not.toBeNull()

        const restored = deserializeProjectPayload(loaded!)
        const history = restored.patterns.a.history!.value

        expect(history.before).toHaveLength(2)
        expect(imagePixelsEqual(history.before[0].canvasImageData, oldest)).toBe(true)
        expect(imagePixelsEqual(history.before[0].maskImageData, maskA)).toBe(true)
        expect(imagePixelsEqual(history.before[1].canvasImageData, prev)).toBe(true)
        expect(imagePixelsEqual(history.current.canvasImageData, current)).toBe(true)
        expect(imagePixelsEqual(history.current.maskImageData, maskC)).toBe(true)
        expect(history.after).toHaveLength(1)
        expect(imagePixelsEqual(history.after[0].canvasImageData, redo)).toBe(true)
        expect(restored.patternOrder).toEqual(['a'])
        expect(restored.activePatternId).toBe('a')
    })

    it('does not mix frames between patterns', async () => {
        const aCurrent = makeImage(2, 2, 11)
        const aBefore = makeImage(2, 2, 12)
        const bCurrent = makeImage(2, 2, 21)
        const bBefore = makeImage(2, 2, 22)
        const mask = makeImage(2, 2, 255)

        const payload = makeHistoryPayload({
            patternOrder: ['pat-a', 'pat-b'],
            activePatternId: 'pat-b',
            patterns: {
                'pat-a': {
                    before: [inlineHistoryItem(aBefore, mask)],
                    after: [],
                    current: inlineHistoryItem(aCurrent, mask),
                },
                'pat-b': {
                    before: [inlineHistoryItem(bBefore, mask)],
                    after: [],
                    current: inlineHistoryItem(bCurrent, mask),
                },
            },
        })

        await putProject('p2', 'Two', payload)
        const restored = deserializeProjectPayload((await getProjectPayload('p2'))!)

        expect(imagePixelsEqual(restored.patterns['pat-a'].history!.value.current.canvasImageData, aCurrent)).toBe(true)
        expect(imagePixelsEqual(restored.patterns['pat-a'].history!.value.before[0].canvasImageData, aBefore)).toBe(true)
        expect(imagePixelsEqual(restored.patterns['pat-b'].history!.value.current.canvasImageData, bCurrent)).toBe(true)
        expect(imagePixelsEqual(restored.patterns['pat-b'].history!.value.before[0].canvasImageData, bBefore)).toBe(true)
        expect(restored.activePatternId).toBe('pat-b')
        expect(restored.patternOrder).toEqual(['pat-a', 'pat-b'])
    })

    it('keeps canvas and mask distinct and preserves dimensions', async () => {
        const canvas = makeImage(2, 2, 50)
        const mask = makeImage(4, 1, 200)

        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(canvas, mask),
                },
            },
        })

        await putProject('p3', 'Dims', payload)
        const current = deserializeProjectPayload((await getProjectPayload('p3'))!).patterns.a.history!.value.current

        expect(current.canvasImageData!.width).toBe(2)
        expect(current.canvasImageData!.height).toBe(2)
        expect(current.maskImageData!.width).toBe(4)
        expect(current.maskImageData!.height).toBe(1)
        expect(imagePixelsEqual(current.canvasImageData, canvas)).toBe(true)
        expect(imagePixelsEqual(current.maskImageData, mask)).toBe(true)
    })

    it('rejects unsupported payload version', () => {
        const buffer = new TextEncoder().encode(JSON.stringify({version: 2})).buffer
        expect(() => decodePayload(buffer)).toThrow(/Unsupported project version/)
    })

    it('deletes only the target project', async () => {
        const mask = makeImage(1, 1, 0)
        const payloadA = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(makeImage(1, 1, 7), mask),
                },
            },
        })
        const payloadB = makeHistoryPayload({
            patternOrder: ['b'],
            activePatternId: 'b',
            patterns: {
                b: {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(makeImage(1, 1, 8), mask),
                },
            },
        })

        await putProject('pa', 'A', payloadA)
        await putProject('pb', 'B', payloadB)
        await deleteProject('pa')

        expect(await getProject('pa')).toBeNull()
        expect(await getProjectPayload('pb')).not.toBeNull()
    })

    it('duplicates pixels and isolates later writes', async () => {
        const mask = makeImage(2, 2, 0)
        const originalCurrent = makeImage(2, 2, 33)
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [inlineHistoryItem(makeImage(2, 2, 11), mask)],
                    after: [],
                    current: inlineHistoryItem(originalCurrent, mask),
                },
            },
        })

        await putProject('src', 'Source', payload)
        const copy = await duplicateProject('src', 'Copy')
        expect(copy.id).not.toBe('src')

        const copyPayload = await getProjectPayload(copy.id)
        const restoredCopy = deserializeProjectPayload(copyPayload!)
        expect(imagePixelsEqual(
            restoredCopy.patterns.a.history!.value.current.canvasImageData,
            originalCurrent,
        )).toBe(true)

        await putProject(copy.id, 'Copy', makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(makeImage(2, 2, 99), mask),
                },
            },
        }))
        await deleteProject('src')

        const afterDelete = deserializeProjectPayload((await getProjectPayload(copy.id))!)
        expect(imagePixelsEqual(
            afterDelete.patterns.a.history!.value.current.canvasImageData,
            makeImage(2, 2, 99),
        )).toBe(true)
    })

    it('export file contains pixels and roundtrips', async () => {
        const mask = makeImage(2, 2, 0)
        const current = makeImage(2, 2, 77)
        const before = makeImage(2, 2, 66)
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [inlineHistoryItem(before, mask)],
                    after: [],
                    current: inlineHistoryItem(current, mask),
                },
            },
        })

        await putProject('exp', 'Export me', payload)
        const record = await getProject('exp')
        const stored = await getProjectPayload('exp')
        const file = createExportFile({
            id: record!.id,
            name: record!.name,
            updatedAt: record!.updatedAt,
        }, stored!)

        const text = JSON.stringify(file)
        expect(text).not.toContain('"frameId"')

        const parsed = parseProjectExportFile(text)
        const restored = deserializeProjectPayload(parsed.payload)
        expect(imagePixelsEqual(restored.patterns.a.history!.value.current.canvasImageData, current)).toBe(true)
        expect(imagePixelsEqual(restored.patterns.a.history!.value.before[0].canvasImageData, before)).toBe(true)
    })

    it('preview uses current canvas of the matching pattern', async () => {
        const mask = makeImage(2, 2, 0)
        const aCurrent = makeImage(2, 2, 15)
        const bCurrent = makeImage(2, 2, 25)
        const payload = makeHistoryPayload({
            patternOrder: ['pat-a', 'pat-b'],
            activePatternId: 'pat-a',
            patterns: {
                'pat-a': {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(aCurrent, mask),
                },
                'pat-b': {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(bCurrent, mask),
                },
            },
        })

        const previews = getPatternPreviewsFromPayload(payload)
        expect(previews).toHaveLength(2)
        expect(previews[0].id).toBe('pat-a')
        expect(imagePixelsEqual(previews[0].imageData, aCurrent)).toBe(true)
        expect(imagePixelsEqual(previews[1].imageData, bCurrent)).toBe(true)
        const current = payload.patterns['pat-a'].state.history!.value.current
        expect(current && !('frameId' in current && !('canvasImageData' in current))).toBe(true)
        if (current && 'canvasImageData' in current) {
            expect(imagePixelsEqual(previews[0].imageData, decodeImageData(current.canvasImageData as any))).toBe(true)
        }
    })

    it('encode/decode payload preserves history bytes', () => {
        const mask = makeImage(2, 2, 0)
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [inlineHistoryItem(makeImage(2, 2, 5), mask)],
                    after: [],
                    current: inlineHistoryItem(makeImage(2, 2, 6), mask),
                },
            },
        })

        const roundtrip = decodePayload(encodePayload(payload))
        const restored = deserializeProjectPayload(roundtrip)
        expect(imagePixelsEqual(
            restored.patterns.a.history!.value.before[0].canvasImageData,
            makeImage(2, 2, 5),
        )).toBe(true)
    })
})
