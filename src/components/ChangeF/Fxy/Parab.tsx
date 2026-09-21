import * as React from "react";
import { ButtonNumberCF } from "../../_shared/buttons/hotkeyed/ButtonNumberCF";
import "../../../styles/XYParaboloidChangeFunction.scss";
import { ValueD } from "../../_shared/buttons/complex/ButtonNumber";
import { HelpTooltip } from "../../tutorial/HelpTooltip";
import { FxyType, ParabParams } from "../../../store/changeFunctions/functions/fxy";
import { Paraboloid } from "../../_shared/canvases/WebWorkerCanvas";
import { SinHelp } from "../../tutorial/tooltips/SinHelp";
import { ChangeFunctionState } from "../../../store/changeFunctions/types";
import { FxyTypeComponentProps, FxyTypeComponentPropsWithTranslation } from "./types";

export interface ParabCFProps {
    params: any

    name: string
    functionParams: ChangeFunctionState

    onChange(value?: any, name?: string): void

}

export interface ParabCFState {

}

const seRange = [0, 1] as [number, number];
const seValueD = ValueD.VerticalLinear(100);

export class ParabCF extends React.PureComponent<FxyTypeComponentProps<ParabParams>, ParabCFState> {

    handleParamChange = ({ value, name }) => {
        this.props.onChange({ ...this.props.params, [name.split('.').reverse()[0]]: value }, this.props.name)
    };

    render() {
        const { params, name, functionParams } = this.props;
        return (
            <div className={"parab-change-function"}>

                <div className={'parab-controls'}>
                    <div className={'canvas-container'}>
                        <Paraboloid
                            params={params}
                            width={68} height={58} />
                    </div>
                </div>
                <div className={'parab-controls'}>
                    <ButtonNumberCF
                        pres={2}
                        valueD={50}
                        path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Parab}.zd`}
                        hkLabel={'cf.hotkeysDescription.xy.parab.zd'}
                        hkData1={functionParams.number}
                        value={params.zd}
                        name={`changeFunctions.${name}.zd`}
                        range={[-2, 2]}
                        onChange={this.handleParamChange}
                    />
                    <ButtonNumberCF
                        pres={2}
                        valueD={25}
                        path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Parab}.x`}
                        hkLabel={'cf.hotkeysDescription.xy.parab.x'}
                        hkData1={functionParams.number}
                        value={params.x}
                        name={`changeFunctions.${name}.x`}
                        range={[-40, 40]}
                        onChange={this.handleParamChange}
                    />
                    <ButtonNumberCF
                        pres={2}
                        valueD={25}
                        path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Parab}.y`}
                        hkLabel={'cf.hotkeysDescription.xy.parab.y'}
                        hkData1={functionParams.number}
                        value={params.y}
                        name={`changeFunctions.${name}.y`}
                        range={[-40, 40]}
                        onChange={this.handleParamChange}
                    />
                    <ButtonNumberCF
                        pres={2}
                        valueD={50}
                        path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Parab}.end`}
                        hkLabel={'cf.hotkeysDescription.xy.parab.end'}
                        hkData1={functionParams.number}
                        value={params.end}
                        name={`changeFunctions.${name}.end`}
                        range={seRange}
                        onChange={this.handleParamChange}
                    />
                </div>
            </div>
        );
    }
}
