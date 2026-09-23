import {beforeEach, describe, expect, it} from 'vitest'
import {
    createExportFile,
    deserializeProjectPayload,
    encodePayload,
    parseProjectExportFile,
} from './projectSerializer'
import {
    deleteProject,
    duplicateProject,
    encodeResolvedPayloadForExport,
    ensureProjectFrames,
    getProject,
    getProjectFrame,
    getProjectPayload,
    listProjectFrames,
    putProject,
    putProjectBuffer,
    resetProjectsDbForTests,
} from './projectsDb'
import {createHistoryFrameId} from './historyFrameId'
import {
    imagePixelsEqual,
    inlineHistoryItem,
    makeHistoryPayload,
    makeImage,
} from './test/fixtures'
import {ProjectPayloadV1} from './projectTypes'

function payloadWithFrameRefs(args: {
    patternOrder: string[]
    activePatternId: string | null
    patterns: Record<string, {
        beforeIds: string[]
        afterIds: string[]
        current: ReturnType<typeof inlineHistoryItem>
    }>
}): ProjectPayloadV1 {
    const patterns: ProjectPayloadV1['patterns'] = {}

    for (const [id, history] of Object.entries(args.patterns)) {
        patterns[id] = {
            state: {
                history: {
                    params: {length: 23},
                    value: {
                        before: history.beforeIds.map(frameId => ({frameId})),
                        after: history.afterIds.map(frameId => ({frameId})),
                        current: history.current,
                    },
                },
            },
        } as ProjectPayloadV1['patterns'][string]
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

describe('project frames store', () => {
    beforeEach(async () => {
        await resetProjectsDbForTests()
    })

    it('loads history from frame refs without rewriting existing frame bytes', async () => {
        const mask = makeImage(2, 2, 0)
        const oldest = makeImage(2, 2, 10)
        const prev = makeImage(2, 2, 40)
        const current = makeImage(2, 2, 90)
        const oldestId = createHistoryFrameId()
        const prevId = createHistoryFrameId()

        await ensureProjectFrames('p1', [
            {
                projectId: 'p1',
                frameId: oldestId,
                canvas: {width: 2, height: 2, bytes: oldest.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            },
            {
                projectId: 'p1',
                frameId: prevId,
                canvas: {width: 2, height: 2, bytes: prev.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            },
        ])

        const payload = payloadWithFrameRefs({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    beforeIds: [oldestId, prevId],
                    afterIds: [],
                    current: inlineHistoryItem(current, mask),
                },
            },
        })

        await putProject('p1', 'Frames', payload, new Set([oldestId, prevId]))

        const beforeRewrite = await getProjectFrame('p1', oldestId)
        await ensureProjectFrames('p1', [{
            projectId: 'p1',
            frameId: oldestId,
            canvas: {width: 2, height: 2, bytes: makeImage(2, 2, 255).data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])
        const afterEnsure = await getProjectFrame('p1', oldestId)
        expect(new Uint8Array(afterEnsure!.canvas!.bytes)[0]).toBe(new Uint8Array(beforeRewrite!.canvas!.bytes)[0])

        const restored = deserializeProjectPayload((await getProjectPayload('p1'))!)
        const history = restored.patterns.a.history!.value
        expect(history.before).toHaveLength(2)
        expect(imagePixelsEqual(history.before[0].canvasImageData, oldest)).toBe(true)
        expect(imagePixelsEqual(history.before[1].canvasImageData, prev)).toBe(true)
        expect(imagePixelsEqual(history.current.canvasImageData, current)).toBe(true)
        expect(history.before[0].id).toBe(oldestId)
        expect(history.before[1].id).toBe(prevId)
    })

    it('does not share frames across patterns with same stack index', async () => {
        const mask = makeImage(2, 2, 0)
        const aBefore = makeImage(2, 2, 11)
        const bBefore = makeImage(2, 2, 22)
        const aId = createHistoryFrameId()
        const bId = createHistoryFrameId()

        await ensureProjectFrames('p2', [
            {
                projectId: 'p2',
                frameId: aId,
                canvas: {width: 2, height: 2, bytes: aBefore.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            },
            {
                projectId: 'p2',
                frameId: bId,
                canvas: {width: 2, height: 2, bytes: bBefore.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            },
        ])

        await putProject('p2', 'Two patterns', payloadWithFrameRefs({
            patternOrder: ['pat-a', 'pat-b'],
            activePatternId: 'pat-a',
            patterns: {
                'pat-a': {
                    beforeIds: [aId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 1), mask),
                },
                'pat-b': {
                    beforeIds: [bId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 2), mask),
                },
            },
        }), new Set([aId, bId]))

        const restored = deserializeProjectPayload((await getProjectPayload('p2'))!)
        expect(imagePixelsEqual(restored.patterns['pat-a'].history!.value.before[0].canvasImageData, aBefore)).toBe(true)
        expect(imagePixelsEqual(restored.patterns['pat-b'].history!.value.before[0].canvasImageData, bBefore)).toBe(true)
    })

    it('broken frame ref becomes empty without substituting foreign frames', async () => {
        const mask = makeImage(2, 2, 0)
        const good = makeImage(2, 2, 50)
        const goodId = createHistoryFrameId()
        const missingId = createHistoryFrameId()

        await ensureProjectFrames('p3', [{
            projectId: 'p3',
            frameId: goodId,
            canvas: {width: 2, height: 2, bytes: good.data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])

        await putProject('p3', 'Broken', payloadWithFrameRefs({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    beforeIds: [goodId, missingId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 9), mask),
                },
            },
        }), new Set([goodId, missingId]))

        const restored = deserializeProjectPayload((await getProjectPayload('p3'))!)
        expect(restored.patterns.a.history!.value.before).toHaveLength(1)
        expect(imagePixelsEqual(restored.patterns.a.history!.value.before[0].canvasImageData, good)).toBe(true)
    })

    it('prunes unused frames only with successful project put', async () => {
        const mask = makeImage(2, 2, 0)
        const keep = makeImage(2, 2, 1)
        const drop = makeImage(2, 2, 2)
        const keepId = createHistoryFrameId()
        const dropId = createHistoryFrameId()

        await ensureProjectFrames('p4', [
            {
                projectId: 'p4',
                frameId: keepId,
                canvas: {width: 2, height: 2, bytes: keep.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            },
            {
                projectId: 'p4',
                frameId: dropId,
                canvas: {width: 2, height: 2, bytes: drop.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            },
        ])

        await putProject('p4', 'Prune', payloadWithFrameRefs({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    beforeIds: [keepId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 3), mask),
                },
            },
        }), new Set([keepId]))

        expect(await getProjectFrame('p4', keepId)).not.toBeNull()
        expect(await getProjectFrame('p4', dropId)).toBeNull()
    })

    it('does not prune frames of another project', async () => {
        const mask = makeImage(2, 2, 0)
        const frameId = createHistoryFrameId()

        await ensureProjectFrames('pa', [{
            projectId: 'pa',
            frameId,
            canvas: {width: 2, height: 2, bytes: makeImage(2, 2, 1).data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])
        await ensureProjectFrames('pb', [{
            projectId: 'pb',
            frameId,
            canvas: {width: 2, height: 2, bytes: makeImage(2, 2, 2).data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])

        await putProject('pa', 'A', makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(makeImage(2, 2, 3), mask),
                },
            },
        }), new Set())

        expect(await getProjectFrame('pb', frameId)).not.toBeNull()
        expect(await getProjectFrame('pa', frameId)).toBeNull()
    })

    it('delete and duplicate isolate project frames', async () => {
        const mask = makeImage(2, 2, 0)
        const pixels = makeImage(2, 2, 44)
        const frameId = createHistoryFrameId()

        await ensureProjectFrames('src', [{
            projectId: 'src',
            frameId,
            canvas: {width: 2, height: 2, bytes: pixels.data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])
        await putProjectBuffer('src', 'Source', encodePayload(payloadWithFrameRefs({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    beforeIds: [frameId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 1), mask),
                },
            },
        })), new Set([frameId]))

        const copy = await duplicateProject('src', 'Copy')
        expect(await getProjectFrame(copy.id, frameId)).not.toBeNull()

        await deleteProject('src')
        expect(await getProjectFrame('src', frameId)).toBeNull()
        expect(await getProjectFrame(copy.id, frameId)).not.toBeNull()

        const restored = deserializeProjectPayload((await getProjectPayload(copy.id))!)
        expect(imagePixelsEqual(restored.patterns.a.history!.value.before[0].canvasImageData, pixels)).toBe(true)
    })

    it('export encodes pixels and has no frameId', async () => {
        const mask = makeImage(2, 2, 0)
        const before = makeImage(2, 2, 70)
        const frameId = createHistoryFrameId()

        await ensureProjectFrames('exp', [{
            projectId: 'exp',
            frameId,
            canvas: {width: 2, height: 2, bytes: before.data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])
        await putProject('exp', 'Export', payloadWithFrameRefs({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    beforeIds: [frameId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 71), mask),
                },
            },
        }), new Set([frameId]))

        const record = await getProject('exp')
        const payload = await getProjectPayload('exp')
        const file = createExportFile({
            id: record!.id,
            name: record!.name,
            updatedAt: record!.updatedAt,
        }, encodeResolvedPayloadForExport(payload!))

        const text = JSON.stringify(file)
        expect(text).not.toContain('"frameId"')

        const parsed = parseProjectExportFile(text)
        const restored = deserializeProjectPayload(parsed.payload)
        expect(imagePixelsEqual(restored.patterns.a.history!.value.before[0].canvasImageData, before)).toBe(true)
    })

    it('sizeBytes includes frame payloads', async () => {
        const mask = makeImage(2, 2, 0)
        const frameId = createHistoryFrameId()
        const canvas = makeImage(2, 2, 5)

        await ensureProjectFrames('size', [{
            projectId: 'size',
            frameId,
            canvas: {width: 2, height: 2, bytes: canvas.data.slice().buffer},
            mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
        }])

        const payload = payloadWithFrameRefs({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    beforeIds: [frameId],
                    afterIds: [],
                    current: inlineHistoryItem(makeImage(2, 2, 6), mask),
                },
            },
        })
        const buffer = encodePayload(payload)
        const meta = await putProjectBuffer('size', 'Sized', buffer, new Set([frameId]))
        expect(meta.sizeBytes).toBeGreaterThan(buffer.byteLength)
        expect((await listProjectFrames('size'))).toHaveLength(1)
    })

    it('opens legacy inline payload without frames', async () => {
        const mask = makeImage(2, 2, 0)
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [inlineHistoryItem(makeImage(2, 2, 3), mask)],
                    after: [],
                    current: inlineHistoryItem(makeImage(2, 2, 4), mask),
                },
            },
        })

        await putProject('legacy', 'Legacy', payload)
        const restored = deserializeProjectPayload((await getProjectPayload('legacy'))!)
        expect(imagePixelsEqual(
            restored.patterns.a.history!.value.before[0].canvasImageData,
            makeImage(2, 2, 3),
        )).toBe(true)
        expect(await listProjectFrames('legacy')).toHaveLength(0)
    })
})
