import * as React from "react";
import classNames from "classnames";
import '../../../styles/inputText.scss';

export interface InputTextProps {
    onChange?(value: string): void

    onFocus?(e?)

    onBlur?(e?)

    className?: string
    placeholder?: string

    value: string

    disabled?: boolean

    maxLength?: number

    [other: string]: any
}

export interface InputTextImperativeHandlers {
    blur()
    focus()
    ref: HTMLInputElement
}

export const InputText = React.forwardRef<InputTextImperativeHandlers, InputTextProps>((props, ref) => {

    const {
        maxLength,
        disabled,
        onChange,
        onFocus,
        onBlur,
        value,
        placeholder,
        className,
        ...otherProps
    } = props;

    const changeHandler = e => {
        onChange && onChange(e.target.value)
    };

    const inputRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
        blur: () => {
            inputRef?.current?.blur();
        },
        focus: () => {
            inputRef?.current?.focus();
        },
        ref: inputRef.current
    }), [inputRef]);

    return (
        <input
            ref={inputRef}
            className={classNames(className, "input-text")}
            type="text"
            maxLength={maxLength}
            disabled={disabled}
            value={value || ''}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            onChange={changeHandler}
            {...otherProps}/>
    );
});