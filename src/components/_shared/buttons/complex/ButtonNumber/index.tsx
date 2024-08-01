import * as React from "react";
import classNames from "classnames";
import {ButtonSelect, ButtonSelectProps, ButtonSelectEventData} from "../../simple/ButtonSelect";
import {ChangeFunctionState, ECFType} from "../../../../../store/changeFunctions/types";
import {LoopAmplitude} from "./LoopAmplitude";
import {ParaboloidAmplitude, Sis2Amplitude} from "./ParaboloidAmplitude";
import {SinAmplitude} from "./SinAmplitude";
import './styles.scss';
import {WaveType} from "../../../../../store/changeFunctions/functions/wave";
import {FxyType} from "../../../../../store/changeFunctions/functions/fxy";
import {NoiseAmplitude} from "./NoiseAmplitude";
import {TimeDrawAmplitude} from "./TimeDrawAmplitude";
import {FxyArrayAmplitude} from "./FxyArrayAmplitude";

const DEFAULT_WIDTH = 70;

const dd = (x, y) => (-x + y) / Math.sqrt(2);
export const ValueD = {
    VerticalLinear: (() => {
        let prevD = 0;
        return (oneInPixels: number) => {
            return (oldValue: any, dx: number, dy: number) => {
                const d = dd(dx, dy);

                const k = Math.pow(Math.E, .005 * Math.abs(d));

                prevD = d;

                return oldValue - d / oneInPixels * k
            }
        }
    })(),
};

const amplitudeComponent = {
    [WaveType.Sin]: SinAmplitude,
    [WaveType.Saw]: LoopAmplitude,
    [WaveType.Noise]: NoiseAmplitude,
    [WaveType.Draw]: TimeDrawAmplitude,
    [FxyType.Parab]: ParaboloidAmplitude,
    [FxyType.Sis2]: Sis2Amplitude,
    [FxyType.Array]: FxyArrayAmplitude,
};

export interface ButtonNumberEventData extends ButtonSelectEventData {
}

export interface ButtonNumberProps extends ButtonSelectProps {

    integer?: boolean

    width?: number
    pres?: number
    precision?: number | ((value?: any) => number)
    precisionGain?: number

    text?: string

    getText?(value?: any): string

    range?: [number, number]
    from?: number
    to?: number

    disablePointerLock?: boolean

    valueD?: ((oldValue: any, dx: number, dy: number) => any) | number

    onChange?(data?: ButtonNumberEventData)

    onMouseDown?(data?: ButtonNumberEventData)

    onMouseUp?(data?: ButtonNumberEventData)

    onClick?(data?: ButtonNumberEventData)

    onPress?(data?: ButtonNumberEventData)

    onRelease?(data?: ButtonNumberEventData)


    changeFunction?: ChangeFunctionState
    changeFunctionId?: string
    changeFunctionType?: ECFType
    changingStartValue?: number
    changeFunctionParams?: any

    hotkeyDisabled?: boolean
}

export interface ButtonNumberState {
    value?: any
    range: [number, number]
    startPoint: [number, number]
    startValue?: any
    pressed: boolean
    clicked: boolean
}

export class ButtonNumber extends React.Component<ButtonNumberProps, ButtonNumberState> {

    buttonRef;
    canvasRef;
    e;
    pre;

    constructor(props) {
        super(props);

        const {range, from, to} = props;


        this.state = {
            value: props.value|| range?.[0] || from,
            startPoint: null,
            startValue: null,
            pressed: false,
            clicked: false,
            range: range || [from, to],
        };

        this.buttonRef = React.createRef();
        this.canvasRef = React.createRef();

    }

    shouldComponentUpdate(nextProps: ButtonNumberProps, nextState) {
        return nextState.value !== this.state.value
            || !!nextState.startPoint || !!this.state.startPoint
            || nextProps.changingStartValue !== this.props.changingStartValue
            || nextProps.changeFunctionParams !== this.props.changeFunctionParams
            || nextProps.changeFunctionId !== this.props.changeFunctionId
            || nextProps.className !== this.props.className
            || nextProps.style !== this.props.style
            || nextProps.autoblur !== this.props.autoblur
            || nextProps.autofocus !== this.props.autofocus
            || nextProps.getText !== this.props.getText;
    }

    static getDerivedStateFromProps(nextProps: ButtonNumberProps, prevState) {
        const {range, from, to} = nextProps;
        return {
            ...(!prevState.startPoint && nextProps.value !== prevState.value ? {
                value: nextProps.value,
            } : {}),
            ...((prevState.range !== range
                || prevState.from !== from
                || prevState.to !== to
            ) ? {
                range: range || [from, to],
            } : {}),
        };
    }

    handleDown = data => {
        // coordHelper2.writeln('DOWN');
        if (!this.props.disablePointerLock) {
            this.canvasRef.current.requestPointerLock();
        }

        if (this.state.startValue) {
            return;
        }

        const {e} = data;
        e.persist();
        this.e = e;


        // redPoint1.set(e.clientX, e.clientY);

        const {onMouseDown, name, selected} = this.props;
        const {value} = this.state;

        onMouseDown && onMouseDown({e, value, name, selected});

        this.setState(({value}) => ({
            startValue: value,
            startPoint: [e.clientX, e.clientY],
            clicked: true,
        }), () => {
            document.addEventListener("mousemove", this.handleMove);
            document.addEventListener("mouseup", this.handleUp);
        });


        // coordHelper2.writeln('start', e.clientX, e.clientY);
    };

    handleMove = e => {

        this.pre = this.e;
        this.e = !this.props.disablePointerLock ? {
            ...e,
            pageX: this.pre.pageX + e.movementX,
            pageY: this.pre.pageY + e.movementY,
        } : e;


        const {onChange, name, selected} = this.props;
        const value = this.calcValue(e, true);

        onChange && onChange({e, value, name, selected});

        this.setState({value});
    };

    calculateOneStep = (value?) => {
        const {pres = 0} = this.props;
        return Math.pow(10, -pres);
    };

    handleUp = (e?) => {

        e = e || this.pre;
        this.pre = null;

        if (!this.props.disablePointerLock) {
            document.exitPointerLock();
        }


        // //  modulation

        // redPoint1.hide();


        const {
            changingStartValue,
            onClick,
            onMouseUp,
            onChange,
            name,
            selected,
            width = DEFAULT_WIDTH,
            precisionGain = 2,
            range,
            from,
            to
        } = this.props;
        const value = this.calcValue(e, true);


        // const one = this.calculateOneStep(value);
        // const d = Math.abs(value - this.state.startValue);
        // if (d < one) {
        //
        //     const {left} = getOffset(e.target);
        //
        //     const increment = (left + width / 2) < e.pageX
        //         ? ((left + width * 3 / 4) < e.pageX ? (precisionGain * one) : one)
        //         : ((left + width / 4) < e.pageX ? -one : (-precisionGain * one));
        //
        //     value = Math.min(Math.max(
        //         this.state.startValue + increment
        //         , from || range?.[0]), to || range?.[1]);
        //
        //     onChange && onChange({e, value, name, selected});
        // } else {
        //     onClick && onClick({value, name, e, selected});
        // }


        onMouseUp && onMouseUp({e, value, name, selected});


        this.setState({
            value,
            startValue: null,
            startPoint: null,
            clicked: false,
        }, () => {
            document.removeEventListener("mousemove", this.handleMove);
            document.removeEventListener("mouseup", this.handleUp);
        });


    };

    handleLeave = e => {
    };

    /**
     BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY
     BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY BY KEY
     * */

    handlePress = (e: undefined | number, priority) => {

        if (this.props.hotkeyDisabled && !priority) {
            return;
        }
        // coordHelper2.writeln('PRESS');
        if (this.state.startValue) {
            return;
        }

        const {onPress, name, selected} = this.props;
        const {value} = this.state;

        onPress && onPress({e, value, name, selected});

        this.setState(({value}) => ({
            startValue: value,
            startPoint: null,
            pressed: true,
        }));

        document.addEventListener("mousemove", this.handlePressed);
    };

    handlePressed = e => {
        if (!this.state.startPoint) {
            // redPoint1.set(e.clientX, e.clientY);
            this.setState({
                startPoint: [e.clientX, e.clientY]
            });
        } else {
            const {onChange, name, selected} = this.props;
            const value = this.calcValue(e, false);

            onChange && onChange({e, value, name, selected});

            this.setState({value});
        }
    };

    handleRelease = (e?) => {
        // coordHelper2.writeln('RELEASE');

        // redPoint1.hide();

        const {onRelease, name, selected} = this.props;
        const {value} = this.state;

        onRelease && onRelease({value, name, e, selected});

        this.setState({
            value,
            startValue: null,
            startPoint: null,
            pressed: false,
        });

        document.removeEventListener("mousemove", this.handlePressed);
    };

    /**
     CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC
     CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC CALC
     */

    calcValue = (e, locked?) => {
        // console.log(this.state.startValue);
        const {range, from, to, integer, pres} = this.props;
        let valueD = this.props.valueD;

        if (!valueD) {
            valueD = ValueD.VerticalLinear(Math.pow(10, pres))
        } else if (typeof valueD === 'number') {
            valueD = ValueD.VerticalLinear(valueD);
        }
        // valueD = ValueD.VerticalLinear(Math.pow(10, pres))


        console.log(this.state.startValue, e.movementX + this.pre?.pageX - this.state.startPoint[0], e.movementY + this.pre?.pageY - this.state.startPoint[1])
        // let nextValue = valueD(this.state.startValue, e.clientX - this.state.redPoint1[0], e.clientY - this.state.redPoint1[1]);
        let nextValue = !locked
            ? valueD(this.state.startValue, e.clientX - this.state.startPoint[0], e.clientY - this.state.startPoint[1])
            : valueD(this.state.startValue, e.movementX + this.pre?.pageX - this.state.startPoint[0], e.movementY + this.pre?.pageY - this.state.startPoint[1]);
        nextValue = Math.min(Math.max(nextValue, range ? range?.[0] : from),  range ? range?.[1] : to);

        if (integer) {
            nextValue = Math.round(nextValue);
        }
        return nextValue;
    };

    componentWillUnmount() {
        if (this.state.pressed) {
            this.handleRelease();

            // document.removeEventListener("mousemove", this.handlePressed);
        }

        if (this.state.clicked) {
            this.handleUp();
            // document.removeEventListener("mousemove", this.handleMove);
            // document.removeEventListener("mouseup", this.handleUp);
        }
    }

    getText = (value) => {
        const {getText, pres} = this.props;
        return (getText || (value => value.toFixed(pres)))(value);
    };

    focus = () => {
        this.buttonRef.current.focus();
    };

    controlKey = null;
    handleKeyDown = (e) => {

        // control
        if (e.keyCode === 32) {
            e.preventDefault();

            this.controlKey = e.keyCode;

            this.handlePress(e, true);

            document.addEventListener('keyup', this.handleKeyUp);
        }


        // buttons up down
        let i = 0;
        if (e.keyCode === 38) {
            e.preventDefault();
            i = 1;
        } else if (e.keyCode === 40) {
            e.preventDefault();
            i = -1
        }

        if (!i) return;


        i *= e.shiftKey ? 10 : 1;

        const {onChange, name, value: oldValue, selected} = this.props;

        const value = oldValue + i * this.calculateOneStep();
        onChange?.({e, value, name, selected});
    };
    // constrol buttons up
    handleKeyUp = (e) => {
        if (e.keyCode === this.controlKey) {
            e.preventDefault();

            this.controlKey = null;

            if (this.state.pressed) {
                this.handleRelease();

                document.removeEventListener("keyup", this.handleKeyUp);
            }
        }
    };

    render() {
        const {
            changingStartValue,
            changeFunction,
            changeFunctionId,
            changeFunctionType,
            changeFunctionParams,
            width = DEFAULT_WIDTH,
            className,
            text,
            // ----
            valueD,
            setValueInChangingList,
            deactivateValueChanging,
            activateValueChanging,
            toStartValue,
            setStartValue,
            onPress,
            onRelease,
            addHotkey,
            precisionGain,
            getText,
            ...otherProps
        } = this.props;
        const {value = 0, startValue, startPoint, range} = this.state;

        const Amplitude = amplitudeComponent[changeFunctionParams?.type || changeFunctionType];

        const amplitudeParams = changeFunctionParams?.type
            ? changeFunctionParams.typeParams[changeFunctionParams.type]
            : changeFunctionParams;


        return (
            <ButtonSelect
                {...otherProps}
                className={classNames("button-number", className, {
                    ["button-number-active"]: !!startValue,
                })}
                width={width}
                ref={this.buttonRef}
                onMouseLeave={this.handleLeave}
                onMouseDown={this.handleDown}
                onKeyDown={this.handleKeyDown}
                onKeyUp={this.handleKeyUp}
            >
                <div
                    className={"button-number-value"}
                    style={{width: (value - range?.[0]) / (range?.[1] - range?.[0]) * 100 + "%"}}>
                    <span>{this.getText(value)}</span>
                </div>

                {changeFunctionId && Amplitude &&
                <Amplitude
                    changing={!!startPoint}
                    range={range}
                    buttonWidth={width}
                    params={amplitudeParams}
                    type={changeFunctionParams?.type}

                    changingStartValue={changingStartValue}
                    changeFunctionId={changeFunctionId}
                    changeFunction={changeFunction}
                />}
                <canvas
                    width={width}
                    height={20}
                    ref={this.canvasRef}/>
            </ButtonSelect>
        );
    }
}

