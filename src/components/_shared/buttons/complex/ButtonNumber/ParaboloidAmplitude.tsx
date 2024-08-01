import * as React from "react";
import {createCanvas} from "../../../../../utils/canvas/helpers/base";
import {Canvas} from "../../../Canvas/index";
import {AmplitudeComponentProps} from "./types";
import classNames from "classnames";
import * as Color from "color";
import xyamplitude from './xyamplitude.png';
import {WithTranslation, withTranslation} from "react-i18next";
import {Translations} from "../../../../../store/language/helpers";

export interface ParaboloidAmplitudeProps extends AmplitudeComponentProps, WithTranslation {

}

export const xyAmplitude = (type): React.FC<ParaboloidAmplitudeProps> => (props) => {
    const {range, params, changingStartValue, changeFunction, changing, buttonWidth, t} = props;


    const ampWidth = params.end * (1 - (changingStartValue - range[0]) / (range[1] - range[0]));

    const startVPerc = (changingStartValue  - range[0])/ (range[1] - range[0]);

    return (
        <div
            style={{
                width: ampWidth * 100 + "%",
                left: `${(startVPerc) * 100}%`
            }}
            className={classNames("button-number-xy-amplitude", {["button-number-xy-amplitude-changing"]: changing})}
            >
            <img src={xyamplitude} />
            <span>
                {Translations.cf(t)(changeFunction)}
            </span>
        </div>
    );
};

export const ParaboloidAmplitude = withTranslation('common')(xyAmplitude('parab'));
export const Sis2Amplitude = withTranslation('common')(xyAmplitude('sis2'));