import {profileLogger} from '../../../../../utils/profiling/ProfileLogger'
import {PlayerState} from './types'
import {Collision} from './Collision'

export type PlatformerCanvasEventPhase = 'down' | 'draw' | 'release' | 'click'

export type PlatformerCanvasEventLog = {
    phase: PlatformerCanvasEventPhase
    offsetX: number
    offsetY: number
    target: 'world' | 'display'
    drawing: boolean
}

export type PlatformerFeetProbe = {
    underLeft: number
    underCenter: number
    underRight: number
    belowCenter: number
    rectSolid: boolean
}

let sessionPatternId: string | null = null
let startedOwnRecording = false

const getFeetProbe = (
    collision: Collision,
    player: PlayerState,
    playerWidth: number,
    playerHeight: number,
): PlatformerFeetProbe => {
    const {x, y} = player
    const bottom = y + playerHeight - 1
    const centerX = x + playerWidth / 2

    return {
        underLeft: collision.getAlphaAt(x, bottom),
        underCenter: collision.getAlphaAt(centerX, bottom),
        underRight: collision.getAlphaAt(x + playerWidth - 1, bottom),
        belowCenter: collision.getAlphaAt(centerX, y + playerHeight),
        rectSolid: collision.isRectSolid(x, y, playerWidth, playerHeight),
    }
}

export const platformerProfiler = {
    beginSession: (patternId: string): void => {
        sessionPatternId = patternId
        startedOwnRecording = !profileLogger.isRecording

        if (startedOwnRecording) {
            profileLogger.startRecording(`platformer-${patternId}`)
        }

        platformerProfiler.log('session.start', {
            autoRecording: startedOwnRecording,
            wasAlreadyRecording: !startedOwnRecording,
        })
    },

    endSession: async (patternId: string): Promise<void> => {
        if (sessionPatternId !== patternId) {
            return
        }

        platformerProfiler.log('session.stop', {})

        if (startedOwnRecording) {
            profileLogger.stopRecording()

            try {
                const result = await profileLogger.saveToProject(`platformer-${patternId}`)
                console.info('[platformer profiler] saved', result.path)
            } catch (error) {
                console.warn('[platformer profiler] save failed', error)
            }
        }

        sessionPatternId = null
        startedOwnRecording = false
    },

    isActive: (patternId?: string): boolean => {
        if (!sessionPatternId) {
            return false
        }

        return patternId ? sessionPatternId === patternId : true
    },

    log: (event: string, data?: Record<string, unknown>): void => {
        if (!sessionPatternId) {
            return
        }

        profileLogger.log(`platformer.${event}`, {
            patternId: sessionPatternId,
            ...data,
        })
    },

    logWorldDirty: (source: string): void => {
        platformerProfiler.log('world.dirty', {source})
    },

    logCanvasEvent: (patternId: string, payload: PlatformerCanvasEventLog): void => {
        if (!platformerProfiler.isActive(patternId)) {
            return
        }

        platformerProfiler.log('canvas.event', payload)
    },

    logCollisionRebuild: (
        collision: Collision,
        player: PlayerState,
        playerWidth: number,
        playerHeight: number,
        reason: string,
    ): void => {
        const stats = collision.getStats()
        const feet = getFeetProbe(collision, player, playerWidth, playerHeight)

        platformerProfiler.log('collision.rebuild', {
            reason,
            ...stats,
            player: {...player},
            feet,
        })
    },

    logPhysicsStep: (
        before: PlayerState,
        after: PlayerState,
        collision: Collision,
        playerWidth: number,
        playerHeight: number,
        meta: {
            worldWasDirty: boolean
            vertical: {y: number; onGround: boolean}
        },
    ): void => {
        const feetBefore = getFeetProbe(collision, before, playerWidth, playerHeight)
        const feetAfter = getFeetProbe(collision, after, playerWidth, playerHeight)

        const fellThrough =
            before.onGround &&
            !after.onGround &&
            after.vy >= 0 &&
            after.y >= before.y

        const groundLost =
            before.onGround !== after.onGround

        if (!meta.worldWasDirty && !groundLost && !fellThrough && Math.abs(after.y - before.y) < 0.01) {
            return
        }

        platformerProfiler.log('physics.step', {
            before: {...before},
            after: {...after},
            worldWasDirty: meta.worldWasDirty,
            vertical: meta.vertical,
            feetBefore,
            feetAfter,
            fellThrough,
            groundLost,
        })

        if (fellThrough) {
            platformerProfiler.log('physics.fellThrough', {
                before: {...before},
                after: {...after},
                feetBefore,
                feetAfter,
                worldWasDirty: meta.worldWasDirty,
            })
        }
    },
}
