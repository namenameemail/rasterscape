import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../../../store";
import {highlightHotkey} from "../../../../../store/hotkeys/actions";
import {
    ButtonSelect,
    ButtonSelectEventData,
    ButtonSelectImperativeHandlers,
    ButtonSelectProps
} from "../../simple/ButtonSelect";
import classNames from "classnames";
import {ButtonHotkeyTrigger} from "../../../../Hotkeys/ButtonHotkeyInputs/ButtonHotkeyTrigger";
import './styles.scss';
import {HKLabelProps} from "../types";
import {ButtonHotkeyInputs} from "../../../../Hotkeys/ButtonHotkeyInputs/ButtonHotkeyInputs";
import {useRef} from "react";
import {HotkeyControlType} from "../../../../../store/hotkeys/types";

export interface ButtonHKStateProps {
    isHotkeyed: boolean
    settingMode: boolean
    highlightedPath: string
    autofocus?: boolean
    autoblur?: boolean
}

export interface ButtonHKActionProps {
    highlightHotkey: typeof highlightHotkey
}

export interface ButtonHKEventData {
    path?: string
}

export interface ButtonHKOwnProps extends ButtonSelectProps, HKLabelProps {
    path?: string
    maxKeysCount?: number
    containerClassName?: string

    onClick?(data?: ButtonSelectEventData)

    onMouseDown?(data?: ButtonSelectEventData)

    onMouseUp?(data?: ButtonSelectEventData)

    onMouseEnter?(data?: ButtonSelectEventData)

    onMouseLeave?(data?: ButtonSelectEventData)
}

export interface ButtonHKProps extends ButtonHKStateProps, ButtonHKActionProps, ButtonHKOwnProps {

}
export interface ButtonHKImperativeHandlers extends ButtonSelectImperativeHandlers {

}

const ButtonHKComponent = React.forwardRef<ButtonHKImperativeHandlers, ButtonHKProps>((props, ref) => {

    const {
        isHotkeyed,
        highlightHotkey: _highlightHotkey,
        path,
        maxKeysCount,
        settingMode: _settingMode,
        containerClassName,
        highlightedPath: _highlightedPath,
        hkLabel,
        hkLabelFormatter,
        hkData0,
        hkData1,
        hkData2,
        hkData3,
        onClick,
        onMouseDown,
        onMouseUp,
        onMouseEnter,
        onMouseLeave,
        autofocus,
        autoblur,
        ...buttonProps
    } = props;

    const hkLabelProps = {
        hkLabel,
        hkLabelFormatter,
        hkData0,
        hkData1,
        hkData2,
        hkData3,
    };

    const [pressed, setPressed] = React.useState(false);

    const buttonRef = useRef<ButtonSelectImperativeHandlers>(null);

    React.useImperativeHandle(ref, () => (buttonRef.current), [buttonRef]);

    const handleHotkeyTrigger = React.useCallback((e, _, __, isRelease) => {
        buttonRef.current?.click(e);
        !isRelease && setTimeout(setPressed, 200, false);
    }, [setPressed, buttonRef]);

    const handlePress = React.useCallback((_e) => {
        setPressed(true);
    }, [setPressed]);

    const handleRelease = React.useCallback((_e) => {
        setPressed(false);
    }, [setPressed]);

    const handleClick = React.useCallback((data) => {
        onClick?.({...data, path})
    }, [path, onClick]);

    const handleMouseDown = React.useCallback((data) => {
        onMouseDown?.({...data, path})
    }, [path, onMouseDown]);

    const handleMouseUp = React.useCallback((data) => {
        onMouseUp?.({...data, path})
    }, [path, onMouseUp]);

    const handleMouseEnter = React.useCallback((data) => {
        onMouseEnter?.({...data, path});
    }, [path, onMouseEnter]);

    const handleMouseLeave = React.useCallback((data) => {
        onMouseLeave?.({...data, path})
    }, [path, onMouseLeave]);

    return (
        <div className={classNames('hotkey-button', containerClassName)}>
            <ButtonSelect
                ref={buttonRef}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...buttonProps}
                pressed={pressed}
            />
            {path && (
                <>
                    <ButtonHotkeyInputs
                        maxKeysCount={maxKeysCount}
                        path={path}
                        type={HotkeyControlType.Cycled}
                        autoblur={autoblur}
                        autofocus={autofocus}
                        {...hkLabelProps}
                    />
                    {isHotkeyed && (
                        <ButtonHotkeyTrigger
                            path={path}
                            onRelease={handleRelease}
                            onEveryPress={handlePress}
                            onTrigger={handleHotkeyTrigger}
                        />
                    )}
                </>
            )}
        </div>
    );
});

const mapStateToProps: MapStateToProps<ButtonHKStateProps, ButtonHKOwnProps, AppState> = (state, {path}) => ({
    isHotkeyed: !!state.hotkeys.buttons[path],
    settingMode: state.hotkeys.setting,
    highlightedPath: state.hotkeys.highlightedPath,
    autoblur: state.hotkeys.autoblur,
    autofocus: state.hotkeys.autofocus,
});

const mapDispatchToProps: MapDispatchToProps<ButtonHKActionProps, ButtonHKOwnProps> = {
    highlightHotkey,
};

export const ButtonHK = connect<ButtonHKStateProps, ButtonHKActionProps, ButtonHKOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps,
    null,
    {
        forwardRef: true
    }
)(ButtonHKComponent);
