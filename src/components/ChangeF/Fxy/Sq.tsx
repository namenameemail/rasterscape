import * as React from "react";
import {ButtonNumberCF} from "../../_shared/buttons/hotkeyed/ButtonNumberCF";
import "../../../styles/sis2ChangeFunction.scss";
import {ValueD} from "../../_shared/buttons/complex/ButtonNumber";
import {HelpTooltip} from "../../tutorial/HelpTooltip";
import {FxyType, SqParams} from "../../../store/changeFunctions/functions/fxy";
import {Sq} from "../../_shared/canvases/WebWorkerCanvas";
import {xySq} from "../../../store/changeFunctions/functions/_helpers";
import {SinHelp} from "../../tutorial/tooltips/SinHelp";
import {ChangeFunctionState} from "../../../store/changeFunctions/types";
import {FxyArrayTypeComponentPropsWithTranslation} from "./Array/types/types";
import {FxyTypeComponentProps, FxyTypeComponentPropsWithTranslation} from "./types";

export interface SqCFProps {
    params: any

    name: string
    functionParams: ChangeFunctionState

    onChange(value?: any, name?: string)

}

export interface SqCFState {

}

const range = {
    end: [0, 1] as [number, number],
    h: [-1, 1] as [number, number],
    a: [0, 2] as [number, number],
    b: [0, 2] as [number, number],
    c: [0, 1] as [number, number],
};
const pres = {
    end: 2,
    h: 2,
    a: 3,
    b: 3,
    c: 2,
};
const valueD = {
    end: 1,
    h: 0.5,
    a: 0.5,
    b: 0.5,
    c: 0.5,
};

export class SqCF extends React.PureComponent<FxyTypeComponentProps<SqParams>, SqCFState> {

    handleParamChange = ({value, name}) => {

        const params = {
            ...this.props.params,
            [name.split('.').reverse()[0]]: value,
        };

        // это чо за мап?
        let map: number[][] = [];
        const f = xySq(params.a, params.b, params.c);
        for (let y = 0; y < 300; y++) {
            map[y] = [];
            for (let x = 0; x < 300; x++) {
                map[y][x] = f(x, y) / 300;
            }
        }
        (params as any).map = map;
        // это чо за мап?

        this.props.onChange(params, this.props.name)
    };

    leftCol = ['a', 'b', 'c'];
    rightCol = ['h'];

    render() {
        const {params, name, functionParams} = this.props;


        return (
            <div className={"sis2-change-function"}>

                <div className={'sis2-controls'}>
                    <div className={'canvas-container'}>
                        <Sq
                            params={params}
                            width={68}
                            height={58}/>
                    </div>
                    <div className={'buttons-container'}>
                        {this.leftCol.map(key => {
                            return (
                                <ButtonNumberCF
                                    value={params[key]}
                                    name={`changeFunctions.${name}.typeParams.${FxyType.Sq}.${key}`}
                                    range={range[key]}
                                    pres={pres[key]}
                                    hkLabel={'cf.hotkeysDescription.xy.sis2.' + key}
                                    hkData1={functionParams.number}
                                    path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Sq}.${key}`}
                                    onChange={this.handleParamChange}
                                />
                            );
                        })}
                    </div>
                </div>
                <div className={'sis2-controls right'}>

                    <div className={'buttons-container'}>
                        {this.rightCol.map(key => {
                            return (
                                <ButtonNumberCF
                                    value={params[key]}
                                    name={`changeFunctions.${name}.typeParams.${FxyType.Sq}.${key}`}
                                    range={range[key]}
                                    pres={pres[key]}
                                    hkLabel={'cf.hotkeysDescription.xy.sis2.' + key}
                                    hkData1={functionParams.number}
                                    path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Sq}.${key}`}
                                    onChange={this.handleParamChange}
                                />
                            );
                        })}

                        <ButtonNumberCF
                            value={params.end}
                            name={`changeFunctions.${name}.end`}
                            range={range.end}
                            pres={pres.end}
                            hkLabel={'cf.hotkeysDescription.xy.sq.end'}
                            hkData1={functionParams.number}
                            path={`changeFunctions.functions.${name}.params.typeParams.${FxyType.Sq}.end`}
                            onChange={this.handleParamChange}
                        />
                        
                    </div>
                </div>
            </div>
        );
    }
}
