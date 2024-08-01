import * as React from "react";
import {Button, ButtonEventData, ButtonImperativeHandlers, ButtonProps} from "../Button";
import classNames from "classnames";
import './styles.scss';

export interface ButtonSelectEventData extends ButtonEventData {
    selected?: boolean
}

export interface ButtonSelectProps extends ButtonProps {
    selected?: boolean

    onClick?(data?: ButtonSelectEventData)

    onMouseDown?(data?: ButtonSelectEventData)

    onMouseUp?(data?: ButtonSelectEventData)

    onMouseEnter?(data?: ButtonSelectEventData)

    onMouseLeave?(data?: ButtonSelectEventData)
}

export interface ButtonSelectImperativeHandlers extends ButtonImperativeHandlers {

}

export const  ButtonSelect = React.forwardRef<ButtonSelectImperativeHandlers, ButtonSelectProps>((_props, ref) => {

    const {
        className,
        selected,
        onClick,
        onMouseDown,
        onMouseUp,
        onMouseEnter,
        onMouseLeave,
        disabled,
        value,
        ...props
    } = _props;

    const buttonRef = React.useRef<ButtonImperativeHandlers>(null);

    React.useImperativeHandle(ref, () => ({
        focus: () => {
            !disabled && buttonRef.current.focus();
        },
        blur: () => {
            buttonRef.current.blur();
        },
        getElement: () => {
            return buttonRef.current.getElement();
        },
        click: (e, ...args) => {

            console.log('ButtonSelect click', value, e, ...args);
            !disabled && buttonRef.current.click(e);
        }
    }), [buttonRef, disabled, value]);


    const handleClick = React.useCallback((data) => {
        console.log('ButtonSelect handleClick', data, value);
        onClick?.({...data, selected})
    }, [selected, onClick, value]);

    const handleMouseDown = React.useCallback((data) => {
        onMouseDown?.({...data, selected})
    }, [selected, onMouseDown]);

    const handleMouseUp = React.useCallback((data) => {
        onMouseUp?.({...data, selected})
    }, [selected, onMouseUp]);

    const handleMouseEnter = React.useCallback((data) => {
        onMouseEnter?.({...data, selected});
    }, [selected, onMouseEnter]);

    const handleMouseLeave = React.useCallback((data) => {
        onMouseLeave?.({...data, selected})
    }, [selected, onMouseLeave]);

    return (
        <Button
            ref={buttonRef}
            {...props}
            value={value}
            disabled={disabled}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={classNames("button-select", className, {
                ["button-select-selected"]: selected,
            })}/>
    );

});