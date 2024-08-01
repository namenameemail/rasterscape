import * as React from "react";
import classnames from 'classnames'

export interface InputNumberProps {

    min?: number
    max?: number
    step?: number
    value?: number
    delay?: number
    notZero?: boolean

    className?: string

    autofocus?: boolean
    autoblur?: boolean

    onChange(value: number): void

    onMouseEnter?(e?)


    onMouseLeave?(e?)
}


export const InputNumber: React.FC<InputNumberProps> = (props) => {

    const {
        className, value, onChange,
        min = 0, max = 1, step = 0.05,
        autofocus,
        autoblur,
        onMouseEnter,
        onMouseLeave,
    } = props;

    const inputRef = React.useRef<HTMLInputElement>(null);

    const [_value, set_value] = React.useState(value);
    const [__value, set__value] = React.useState(value);

    React.useEffect(() => {
        if (value !== __value) {
            set_value(value)
            set__value(value)
        }
    }, [__value, value]);

    const changeHandler = React.useCallback(e => {
        const n_value = +e.target.value;

        set_value(n_value);
    }, []);

    const blurHandler = React.useCallback(() => {
        onChange?.(_value);
    }, [onChange, _value]);

    const keyPressHandler = React.useCallback((e) => {
        if (e.key === 'Enter') {
            onChange?.(_value);
        }
    }, [onChange, _value]);

    const handleMouseEnter = React.useCallback(e => {

        if (autofocus)
            inputRef.current?.focus();

        onMouseEnter?.(e);

    }, [onMouseEnter, inputRef, autofocus]);

    const handleMouseLeave = React.useCallback(e => {

        if (autoblur)
            inputRef.current?.blur();

        onMouseLeave?.(e);

    }, [onMouseLeave, inputRef, autoblur]);

    return (
        <input
            ref={inputRef}
            className={classnames("input-number", className)}
            type="number"
            step={step}
            min={min}
            max={max}
            value={_value}
            onBlur={blurHandler}
            onChange={changeHandler}
            onKeyPress={keyPressHandler}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        />
    );
};