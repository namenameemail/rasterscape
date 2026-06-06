
import * as React from "react";
import {ValueD} from "../../_shared/buttons/complex/ButtonNumber";
import {ButtonNumberCF} from "../../_shared/buttons/hotkeyed/ButtonNumberCF";
import {RotationValue} from "../../../store/patterns/rotating/types";
import './rotatingControls.scss';
import {withTranslation, WithTranslation} from "react-i18next";
import {setRotation} from "../../../store/patterns/rotating/actions";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import {buttonNumberHelpWrapper} from "../../tutorial/ButtonNumberHelpWrapper";
import {ButtonHK} from "../../_shared/buttons/hotkeyed/ButtonHK";

export interface RotationControlsStateProps {
    rotation: RotationValue | undefined
}

export interface RotationControlsActionProps {
    setRotation(id: string, value: RotationValue): void
}

export interface RotationControlsOwnProps {
    patternId: string
}

export interface RotationControlsProps extends RotationControlsStateProps, RotationControlsActionProps, RotationControlsOwnProps, WithTranslation {
}

export interface RotationControlsState {

}

const angleRange = [0, 360] as [number, number];
const angleText = (value: number) => value.toFixed(0) + '°';
const angleValueD = ValueD.VerticalLinear(0.2);

const offsetRange = [-1000, 1000] as [number, number];
const offsetValueD = ValueD.VerticalLinear(0.1);

const angleHelp = buttonNumberHelpWrapper({message: 'patternRotating.angle'});
const offsetXHelp = buttonNumberHelpWrapper({message: 'patternRotating.offsetX'});
const offsetYHelp = buttonNumberHelpWrapper({message: 'patternRotating.offsetY'});
const centerOffsetXHelp = buttonNumberHelpWrapper({message: 'patternRotating.centerOffsetY'});
const centerOffsetYHelp = buttonNumberHelpWrapper({message: 'patternRotating.centerOffsetY'});

export class RotationControlsComponent extends React.PureComponent<RotationControlsProps, RotationControlsState> {

    handleAngleChange = ({value: angle}) => {
        const {setRotation, rotation, patternId} = this.props;
        setRotation(patternId, {...rotation, angle})
    };

    handleOffsetChange = ({value, name}) => {
        const {setRotation, rotation, patternId} = this.props;
        setRotation(patternId, {
            ...rotation, offset: {
                ...rotation.offset,
                [name]: value
            }
        })
    };

    handleRotateDrawAreaElementChange = (data) => {
        const {selected} = data;
        const {setRotation, rotation, patternId} = this.props;
        setRotation(patternId, {
            ...rotation,
            rotateDrawAreaElement: !selected,
        })
    };

    handleMouseDown = () => {
        const {setRotation, rotation, patternId} = this.props;
        setRotation(patternId, {
            ...rotation,
            changing: true
        })
    };
    handleMouseUp = () => {
        const {setRotation, rotation, patternId} = this.props;
        setRotation(patternId, {
            ...rotation,
            changing: false
        })
    };

    render() {
        const {angle, offset, rotateDrawAreaElement} = this.props.rotation;
        const {patternId} = this.props;
        return (
            <div className={'rotating-controls'}>
                <div className={'left'}>

                    <ButtonNumberCF
                        pres={0}
                        valueD={1}
                        range={offsetRange}
                        hkLabel={'pattern.hotkeysDescription.rotating.xc'}
                        hkData1={patternId}
                        path={`patterns.${this.props.patternId}.rotation.value.offset.xc`}
                        name={"xc"}
                        value={offset.xc}
                        onChange={this.handleOffsetChange}
                        onMouseDown={this.handleMouseDown}
                        onMouseUp={this.handleMouseUp}
                    />
                    <ButtonNumberCF
                        pres={0}
                        valueD={1}
                        range={offsetRange}
                        hkLabel={'pattern.hotkeysDescription.rotating.yc'}
                        hkData1={patternId}
                        path={`patterns.${this.props.patternId}.rotation.value.offset.yc`}
                        name={"yc"}
                        value={offset.yc}
                        onChange={this.handleOffsetChange}
                        onMouseDown={this.handleMouseDown}
                        onMouseUp={this.handleMouseUp}
                    />
                    <ButtonNumberCF
                        className={'rotating-angle'}
                        pres={0}
                        // width={140}
                        hkLabel={'pattern.hotkeysDescription.rotating.angle'}
                        hkData1={patternId}
                        path={`patterns.${this.props.patternId}.rotation.value.angle`}
                        name={"angle"}
                        value={angle}
                        range={angleRange}
                        getText={angleText}
                        onMouseDown={this.handleMouseDown}
                        onMouseUp={this.handleMouseUp}
                        valueD={1}
                        onChange={this.handleAngleChange}
                    />
                    <ButtonHK
                        selected={rotateDrawAreaElement}
                        onClick={this.handleRotateDrawAreaElementChange}
                    >view</ButtonHK>
                </div>
                <div className={'right'}>
                    <ButtonNumberCF
                        pres={0}
                        valueD={1}
                        range={offsetRange}
                        hkLabel={'pattern.hotkeysDescription.rotating.xd'}
                        hkData1={patternId}
                        path={`patterns.${this.props.patternId}.rotation.value.offset.xd`}
                        name={"xd"}
                        value={offset.xd}
                        onChange={this.handleOffsetChange}
                        onMouseDown={this.handleMouseDown}
                        onMouseUp={this.handleMouseUp}
                    />

                    <ButtonNumberCF
                        pres={0}
                        valueD={1}
                        range={offsetRange}
                        hkLabel={'pattern.hotkeysDescription.rotating.yd'}
                        hkData1={patternId}
                        path={`patterns.${this.props.patternId}.rotation.value.offset.yd`}
                        name={"yd"}
                        value={offset.yd}
                        onChange={this.handleOffsetChange}
                        onMouseDown={this.handleMouseDown}
                        onMouseUp={this.handleMouseUp}
                    />
                </div>


            </div>
        );
    }
}

const mapStateToProps: MapStateToProps<RotationControlsStateProps, RotationControlsOwnProps, AppState> = (state, {patternId}) => ({
    rotation: state.patterns[patternId]?.rotation?.value
});

const mapDispatchToProps: MapDispatchToProps<RotationControlsActionProps, RotationControlsOwnProps> = {
    setRotation,
};

export const RotationControls = connect<RotationControlsStateProps, RotationControlsActionProps, RotationControlsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(RotationControlsComponent));

