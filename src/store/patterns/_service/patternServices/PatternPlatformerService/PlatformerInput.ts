import {PlatformerInputState} from './types'

export class PlatformerInput {
    state: PlatformerInputState = {
        left: false,
        right: false,
        jump: false,
        jumpPressed: false,
    }

    reset = (): void => {
        this.state.left = false
        this.state.right = false
        this.state.jump = false
        this.state.jumpPressed = false
    }

    setLeft = (value: boolean): void => {
        this.state.left = value
    }

    setRight = (value: boolean): void => {
        this.state.right = value
    }

    setJump = (value: boolean): void => {
        if (value && !this.state.jump) {
            this.state.jumpPressed = true
        }
        this.state.jump = value
    }

    consumeJumpPressed = (): boolean => {
        if (!this.state.jumpPressed) {
            return false
        }
        this.state.jumpPressed = false
        return true
    }

    getState = (): PlatformerInputState => ({...this.state})
}
