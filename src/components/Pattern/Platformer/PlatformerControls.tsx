import * as React from 'react'
import {connect, MapDispatchToProps, MapStateToProps} from 'react-redux'
import {WithTranslation, withTranslation} from 'react-i18next'
import {AppState} from '../../../store'
import {PlatformerBackgroundFit, PlatformerParams} from '../../../store/patterns/platformer/types'
import {getPlatformerState} from '../../../store/patterns/platformer/helpers'
import {
    setBackgroundFit,
    setBackgroundPattern,
    setCollisionAlphaThreshold,
    setGravity,
    setJumpForce,
    setMoveSpeed,
    setPlayerPattern,
    setPlayerSize,
    start,
    stop,
} from '../../../store/patterns/platformer/actions'
import {ButtonHK} from '../../_shared/buttons/hotkeyed/ButtonHK'
import {ButtonNumberCF} from '../../_shared/buttons/hotkeyed/ButtonNumberCF'
import {HoverPatternSelect} from '../HoverPatternSelect'
import {SelectDrop} from '../../_shared/buttons/complex/SelectDrop'
import {isMeDrawer} from '../../../store/patterns/room/helpers'
import './platformerControls.scss'

export interface PlatformerControlsStateProps {
    platformerParams: PlatformerParams
    platformerDisabled: boolean
}

export interface PlatformerControlsActionProps {
    start(id: string): void
    stop(id: string): void
    setPlayerPattern(id: string, value: string | null): void
    setBackgroundPattern(id: string, value: string | null): void
    setPlayerSize(id: string, width: number, height: number): void
    setGravity(id: string, value: number): void
    setJumpForce(id: string, value: number): void
    setMoveSpeed(id: string, value: number): void
    setCollisionAlphaThreshold(id: string, value: number): void
    setBackgroundFit(id: string, value: PlatformerBackgroundFit): void
}

export interface PlatformerControlsOwnProps {
    patternId: string
}

export interface PlatformerControlsProps
    extends PlatformerControlsStateProps,
        PlatformerControlsActionProps,
        PlatformerControlsOwnProps,
        WithTranslation {
}

const backgroundFitItems = Object.values(PlatformerBackgroundFit)

const playerWidthRange = [4, 128] as [number, number]
const playerHeightRange = [4, 128] as [number, number]
const gravityRange = [0, 3] as [number, number]
const jumpForceRange = [1, 30] as [number, number]
const moveSpeedRange = [1, 20] as [number, number]
const collisionThresholdRange = [1, 255] as [number, number]

export class PlatformerControlsComponent extends React.PureComponent<PlatformerControlsProps> {

    handleChangePlayingOn = () => {
        const {platformerParams, patternId, start, stop} = this.props
        platformerParams.playingOn
            ? stop(patternId)
            : start(patternId)
    }

    handleSelectPlayerPattern = (value: string | null) => {
        this.props.setPlayerPattern(this.props.patternId, value)
    }

    handleSelectBackgroundPattern = (value: string | null) => {
        this.props.setBackgroundPattern(this.props.patternId, value)
    }

    handleChangeNumber = ({value, name}: { value: number; name: string }) => {
        const {patternId, platformerParams} = this.props

        switch (name) {
            case 'playerWidth':
                this.props.setPlayerSize(patternId, value, platformerParams.playerHeight)
                break
            case 'playerHeight':
                this.props.setPlayerSize(patternId, platformerParams.playerWidth, value)
                break
            case 'gravity':
                this.props.setGravity(patternId, value)
                break
            case 'jumpForce':
                this.props.setJumpForce(patternId, value)
                break
            case 'moveSpeed':
                this.props.setMoveSpeed(patternId, value)
                break
            case 'collisionAlphaThreshold':
                this.props.setCollisionAlphaThreshold(patternId, value)
                break
        }
    }

    handleChangeBackgroundFit = ({value}: { value: PlatformerBackgroundFit }) => {
        this.props.setBackgroundFit(this.props.patternId, value)
    }

    backgroundFitGetValue = (id: PlatformerBackgroundFit) => id

    backgroundFitGetText = (id: PlatformerBackgroundFit) => {
        return this.props.t('pattern.platformer.backgroundFit.' + id)
    }

    render() {
        const {
            patternId,
            platformerParams,
            platformerDisabled,
            t,
        } = this.props

        const {
            playingOn,
            playerPatternId,
            backgroundPatternId,
            playerWidth,
            playerHeight,
            gravity,
            jumpForce,
            moveSpeed,
            collisionAlphaThreshold,
            backgroundFit,
        } = platformerParams

        return (
            <div className={'platformer-controls'}>
                <ButtonHK
                    hkLabel={'pattern.hotkeysDescription.platformer.playingOn'}
                    hkData1={patternId}
                    path={`pattern.${patternId}.platformer.playingOn`}
                    className={'platformer-toggle'}
                    selected={playingOn}
                    name={'playingOn'}
                    disabled={platformerDisabled}
                    onClick={this.handleChangePlayingOn}
                >
                    {t('pattern.platformer.play')}
                </ButtonHK>

                <HoverPatternSelect
                    patternId={patternId}
                    namePrefix="platformerPlayer"
                    value={playerPatternId ?? null}
                    onChange={this.handleSelectPlayerPattern}
                />

                <HoverPatternSelect
                    patternId={patternId}
                    namePrefix="platformerBackground"
                    value={backgroundPatternId ?? null}
                    onChange={this.handleSelectBackgroundPattern}
                />

                <div className={'platformer-controls-params'}>
                    <ButtonNumberCF
                        integer
                        pres={0}
                        path={`patterns.${patternId}.platformer.params.playerWidth`}
                        hkLabel={'pattern.hotkeysDescription.platformer.playerWidth'}
                        hkData1={patternId}
                        name={'playerWidth'}
                        value={playerWidth}
                        range={playerWidthRange}
                        onChange={this.handleChangeNumber}
                    />
                    <ButtonNumberCF
                        integer
                        pres={0}
                        path={`patterns.${patternId}.platformer.params.playerHeight`}
                        hkLabel={'pattern.hotkeysDescription.platformer.playerHeight'}
                        hkData1={patternId}
                        name={'playerHeight'}
                        value={playerHeight}
                        range={playerHeightRange}
                        onChange={this.handleChangeNumber}
                    />
                    <ButtonNumberCF
                        pres={1}
                        path={`patterns.${patternId}.platformer.params.gravity`}
                        hkLabel={'pattern.hotkeysDescription.platformer.gravity'}
                        hkData1={patternId}
                        name={'gravity'}
                        value={gravity}
                        range={gravityRange}
                        onChange={this.handleChangeNumber}
                    />
                    <ButtonNumberCF
                        pres={0}
                        path={`patterns.${patternId}.platformer.params.jumpForce`}
                        hkLabel={'pattern.hotkeysDescription.platformer.jumpForce'}
                        hkData1={patternId}
                        name={'jumpForce'}
                        value={jumpForce}
                        range={jumpForceRange}
                        onChange={this.handleChangeNumber}
                    />
                    <ButtonNumberCF
                        pres={0}
                        path={`patterns.${patternId}.platformer.params.moveSpeed`}
                        hkLabel={'pattern.hotkeysDescription.platformer.moveSpeed'}
                        hkData1={patternId}
                        name={'moveSpeed'}
                        value={moveSpeed}
                        range={moveSpeedRange}
                        onChange={this.handleChangeNumber}
                    />
                    <ButtonNumberCF
                        integer
                        pres={0}
                        path={`patterns.${patternId}.platformer.params.collisionAlphaThreshold`}
                        hkLabel={'pattern.hotkeysDescription.platformer.collisionAlphaThreshold'}
                        hkData1={patternId}
                        name={'collisionAlphaThreshold'}
                        value={collisionAlphaThreshold}
                        range={collisionThresholdRange}
                        onChange={this.handleChangeNumber}
                    />
                </div>

                <SelectDrop
                    hkByValue={false}
                    hkLabel={'pattern.hotkeysDescription.platformer.backgroundFit'}
                    hkData1={patternId}
                    className={'platformer-background-fit'}
                    name={'backgroundFit'}
                    value={backgroundFit}
                    getValue={this.backgroundFitGetValue}
                    getText={this.backgroundFitGetText}
                    items={backgroundFitItems}
                    onChange={this.handleChangeBackgroundFit}
                />
            </div>
        )
    }
}

const mapStateToProps: MapStateToProps<PlatformerControlsStateProps, PlatformerControlsOwnProps, AppState> = (
    state,
    {patternId},
) => {
    const pattern = state.patterns[patternId]
    const room = pattern?.room?.value

    return {
        platformerParams: pattern?.platformer?.params ?? getPlatformerState().params,
        platformerDisabled: !!room?.connected && !room?.meDrawer,
    }
}

const mapDispatchToProps: MapDispatchToProps<PlatformerControlsActionProps, PlatformerControlsOwnProps> = {
    start,
    stop,
    setPlayerPattern,
    setBackgroundPattern,
    setPlayerSize,
    setGravity,
    setJumpForce,
    setMoveSpeed,
    setCollisionAlphaThreshold,
    setBackgroundFit,
}

export const PlatformerControls = connect(
    mapStateToProps,
    mapDispatchToProps,
)(withTranslation('common')(PlatformerControlsComponent))
