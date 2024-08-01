import * as React from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import {InputText, InputTextImperativeHandlers} from "../../_shared/inputs/InputText";
import keyboardjs from "keyboardjs";
import classNames from "classnames";
import './KeyInput.scss';
import {HotkeyControlType} from "../../../store/hotkeys/types";

export interface KeyInputProps {
    name: any
    highlighted?: boolean
    value?: string
    controlType: HotkeyControlType
    onChange: (name: any, key: string, code: string) => void

    isOnRelease?: boolean
    onIsOnReleaseChange?: (name: any, isOnRelease: boolean) => void

    onBlur?(e, name: any, value: string)

    onFocus?(e, name: any, value: string)

    onMouseEnter?(e)

    onMouseMove?(e)

    onMouseLeave?(e)

    autofocus?: boolean
    autoblur?: boolean
}


const isValidNewKeyEvent = (e: KeyboardEvent) => {

    return !e.altKey && !e.ctrlKey && [
        'Key',
        'Digit',
        'BracketRight',
        'BracketLeft',
        'Backslash',
        'IntlBackslash',
        'Slash',
        'Minus',
        'Equal',
        'Quote',
        'Backquote',
        'Semicolon'
    ].some((code) => e.code.indexOf(code) === 0);
};

const isDeleteKeyEvent = (e) => {
    return [
        'Backspace',
    ].some((code) => e.code.indexOf(code) === 0);
};
const isCancelKeyEvent = (e) => {

    return [
        'Enter',
        'Esc',
    ].some((code) => e.code.indexOf(code) === 0);
};
const isOnReleasePropertyChangeEvent = (e) => {
    return e.altKey && e.code === 'KeyI';
};

export const KeyInput: React.FC<KeyInputProps> = (props) => {

    const inputRef = useRef<InputTextImperativeHandlers>();

    const {
        name, value, highlighted,
        onChange,
        onMouseEnter, onMouseMove, onMouseLeave,
        onBlur, onFocus,
        autoblur, autofocus,
        isOnRelease, onIsOnReleaseChange,
        controlType,
    } = props;

    const [inputValue, setInputValue] = useState(value);
    const [binded, setBinded] = useState<boolean>();

    const dispatchChange = useCallback((newKey, newCode) => {
        onChange?.(name, newKey, newCode);
    }, [onChange, name]);

    const dispatchIsOnReleaseChange = useCallback(() => {
        onIsOnReleaseChange?.(name, !isOnRelease);
    }, [onIsOnReleaseChange, isOnRelease, name]);

    const handleChange = useCallback((e) => {

        if (isValidNewKeyEvent(e)) {
            const key = e.key;
            const code = e.pressedKeys?.[e.pressedKeys.length - 1];

            setInputValue(key);
            dispatchChange(key, code);
        }

        if (isDeleteKeyEvent(e)) {
            setInputValue('');
            dispatchChange(null, null);
        }

        if (isCancelKeyEvent(e)) {
            inputRef.current?.blur();
        }

        if (isOnReleasePropertyChangeEvent(e) && controlType !== HotkeyControlType.Number) {
            dispatchIsOnReleaseChange();
        }

    }, [inputRef, dispatchChange, dispatchIsOnReleaseChange]);


    const handleFocus = useCallback((e?) => {
        onFocus?.(e, name, inputValue);

        setBinded(true);
    }, [name, onFocus, handleChange, inputValue]);

    const handleBlur = useCallback((e?) => {
        onBlur?.(e, name, inputValue);

        setBinded(false)
    }, [handleChange, name, onBlur, inputValue]);

    useEffect(() => {
        if (binded) {
            keyboardjs.bind("", handleChange);
        }
        return () => {
            if (binded) {
                keyboardjs.unbind("", handleChange);
            }
        }
    }, [binded, handleChange]);

    const handleMouseEnter = useCallback(e => {
        if (autofocus)
            inputRef.current?.focus();

        onMouseEnter?.(e);

    }, [onMouseEnter, autofocus, inputRef]);

    const handleMove = useCallback(e => {
        if (autofocus && document.activeElement !== inputRef.current.ref)
            inputRef.current?.focus();

        onMouseMove?.(e);

    }, [onMouseMove, autofocus, inputRef]);

    const handleMouseLeave = useCallback(e => {
        if (autoblur)
            inputRef.current?.blur();

        onMouseLeave?.(e);

    }, [onMouseLeave, autoblur, inputRef]);

    return (
        <InputText
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMove}
            onMouseLeave={handleMouseLeave}

            ref={inputRef}
            className={classNames("key-input", {
                ['empty']: !value,
                ['highlighted']: highlighted,
                ['isOnRelease']: isOnRelease,
            })}
            value={value}
            data-hotkeys
            onBlur={handleBlur}
            onFocus={handleFocus}
        />
    );
};
