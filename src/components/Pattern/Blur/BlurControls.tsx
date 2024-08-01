import * as React from "react";
import {ButtonNumberCF} from "../../_shared/buttons/hotkeyed/ButtonNumberCF";
import {BlurValue} from "../../../store/patterns/blur/types";
import './blurControls.scss';
import {withTranslation, WithTranslation} from "react-i18next";
import {blurOnce, setBlur} from "../../../store/patterns/blur/actions";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import {ButtonHK} from "../../_shared/buttons/hotkeyed/ButtonHK";

export interface BlurControlsStateProps {
    blur: BlurValue
}

export interface BlurControlsActionProps {
    setBlur(id: string, value: BlurValue)
    blurOnce(id: string)
}

export interface BlurControlsOwnProps {
    patternId: string
}

export interface BlurControlsProps extends BlurControlsStateProps, BlurControlsActionProps, BlurControlsOwnProps, WithTranslation {
}

export interface BlurControlsState {

}

const radiusRange = [0, 100] as [number, number];

export class BlurControlsComponent extends React.PureComponent<BlurControlsProps, BlurControlsState> {


    handleChange = ({value, name}) => {
        const {setBlur, blur, patternId} = this.props;
        setBlur(patternId, {
            ...blur,
            [name]: value
        });
    };

    handleToggleChange = (data) => {
        const {selected, name} = data;
        const {setBlur, blur, patternId} = this.props;
        setBlur(patternId, {
            ...blur,
            [name]: !selected
        });
    };

    handleBlurOnce = () => {
        const {blurOnce, patternId} = this.props;
        blurOnce(patternId);
    };

    render() {
        const {patternId, t} = this.props;
        const {radius} = this.props.blur;
        return (
            <div className={'blur-controls'}>
                <ButtonNumberCF
                    integer
                    pres={0}
                    path={`patterns.${patternId}.blur.value.radius`}
                    hkLabel={`pattern.hotkeysDescription.blur.radius`}
                    hkData1={patternId}
                    name={"radius"}
                    value={radius}
                    range={radiusRange}
                    onChange={this.handleChange}/>
                {/* <ButtonHK
                    path={`pattern.${patternId}.blur.onUpdate`}
                    hkLabel={`pattern.hotkeysDescription.blur.onUpdate`}
                    hkData1={patternId}
                    selected={onUpdate}
                    name={"onUpdate"}
                    onClick={this.handleToggleChange}
                >{t('pattern.blur.onUpdate')}</ButtonHK> */}
                <ButtonHK
                    path={`pattern.${patternId}.blur.once`}
                    hkLabel={`pattern.hotkeysDescription.blur.once`}
                    hkData1={patternId}
                    onClick={this.handleBlurOnce}
                >{t('pattern.blur.once')}</ButtonHK>
            </div>
        );
    }
}

const mapStateToProps: MapStateToProps<BlurControlsStateProps, BlurControlsOwnProps, AppState> = (state, {patternId}) => ({
    blur: state.patterns[patternId]?.blur?.value
});

const mapDispatchToProps: MapDispatchToProps<BlurControlsActionProps, BlurControlsOwnProps> = {
    setBlur,
    blurOnce,
};

export const BlurControls = connect<BlurControlsStateProps, BlurControlsActionProps, BlurControlsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(BlurControlsComponent));
