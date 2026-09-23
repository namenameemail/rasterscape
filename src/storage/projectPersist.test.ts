import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createHistoryFrameId} from './historyFrameId'
import {persistProjectSave} from './projectPersist'
import * as projectsIdb from './projectsIdb'
import {
    getProject,
    getProjectFrame,
    getProjectPayload,
    listProjectFrames,
    resetProjectsDbForTests,
} from './projectsDb'
import {encodePayload, decodePayload} from './projectSerializer'
import {inlineHistoryItem, makeHistoryPayload, makeImage} from './test/fixtures'

describe('persistProjectSave', () => {
    beforeEach(async () => {
        await resetProjectsDbForTests()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('writes new frames and payload', async () => {
        const mask = makeImage(2, 2, 0)
        const before = makeImage(2, 2, 40)
        const current = makeImage(2, 2, 90)
        const frameId = createHistoryFrameId()
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [{frameId}],
                    after: [],
                    current: inlineHistoryItem(current, mask),
                },
            },
        })
        const buffer = encodePayload(payload)

        const meta = await persistProjectSave({
            projectId: 'p1',
            name: 'One',
            buffer,
            frames: [{
                projectId: 'p1',
                frameId,
                canvas: {width: 2, height: 2, bytes: before.data.slice().buffer},
                mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
            }],
            keepFrameIds: [frameId],
        })

        expect(meta.id).toBe('p1')
        expect(meta.sizeBytes).toBeGreaterThan(buffer.byteLength)
        expect(await getProjectFrame('p1', frameId)).not.toBeNull()
        const stored = decodePayload((await getProject('p1'))!.payload)
        expect(stored.patterns.a.state.history?.value.before).toEqual([{frameId}])
        expect((await getProjectPayload('p1'))?.patterns.a.state.history?.value.before[0]).toMatchObject({frameId})
    })

    it('gc drops frames not in keepFrameIds', async () => {
        const mask = makeImage(2, 2, 0)
        const keepId = createHistoryFrameId()
        const dropId = createHistoryFrameId()
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [{frameId: keepId}],
                    after: [],
                    current: inlineHistoryItem(makeImage(2, 2, 1), mask),
                },
            },
        })

        await persistProjectSave({
            projectId: 'p1',
            name: 'One',
            buffer: encodePayload(payload),
            frames: [
                {
                    projectId: 'p1',
                    frameId: keepId,
                    canvas: {width: 2, height: 2, bytes: makeImage(2, 2, 10).data.slice().buffer},
                    mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
                },
                {
                    projectId: 'p1',
                    frameId: dropId,
                    canvas: {width: 2, height: 2, bytes: makeImage(2, 2, 11).data.slice().buffer},
                    mask: {width: 2, height: 2, bytes: mask.data.slice().buffer},
                },
            ],
            keepFrameIds: [keepId, dropId],
        })

        await persistProjectSave({
            projectId: 'p1',
            name: 'One',
            buffer: encodePayload(payload),
            frames: [],
            keepFrameIds: [keepId],
        })

        expect(await getProjectFrame('p1', keepId)).not.toBeNull()
        expect(await getProjectFrame('p1', dropId)).toBeNull()
        expect(await listProjectFrames('p1')).toHaveLength(1)
    })

    it('retries put while buffer is still owned', async () => {
        const payload = makeHistoryPayload({
            patternOrder: ['a'],
            activePatternId: 'a',
            patterns: {
                a: {
                    before: [],
                    after: [],
                    current: inlineHistoryItem(makeImage(2, 2, 1), makeImage(2, 2, 0)),
                },
            },
        })
        const buffer = encodePayload(payload)
        const originalPut = projectsIdb.putProjectBuffer
        const put = vi.spyOn(projectsIdb, 'putProjectBuffer')
        put
            .mockRejectedValueOnce(new Error('idb busy'))
            .mockRejectedValueOnce(new Error('idb busy'))
            .mockImplementation((id, name, nextBuffer, keepFrameIds) => {
                expect(nextBuffer.byteLength).toBe(buffer.byteLength)
                return originalPut(id, name, nextBuffer, keepFrameIds)
            })

        const meta = await persistProjectSave({
            projectId: 'p1',
            name: 'One',
            buffer,
            frames: [],
            keepFrameIds: [],
        })

        expect(meta.id).toBe('p1')
        expect(put).toHaveBeenCalledTimes(3)
        expect(await getProject('p1')).not.toBeNull()
    })
})
