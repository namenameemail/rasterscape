import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "store";
import classNames from "classnames";
import {WithTranslation, withTranslation} from "react-i18next";
import {ButtonHotkeyTrigger} from "../../../../Hotkeys/ButtonHotkeyInputs/ButtonHotkeyTrigger";
import './styles.scss';
import {CycledToggle, CycledToggleImperativeHandlers, CycledToggleProps} from "../../simple/CycledToggle";
import {HKLabelProps} from "../types";
import {ButtonHotkeyInputs} from "../../../../Hotkeys/ButtonHotkeyInputs/ButtonHotkeyInputs";
import {HotkeyControlType} from "store/hotkeys/types";

export interface CycledToggleHKStateProps {
    isHotkeyed: boolean
}

export interface CycledToggleHKActionProps {
}

export interface CycledToggleHKOwnProps extends CycledToggleProps, HKLabelProps {
    path: string
}

export interface CycledToggleHKProps extends CycledToggleHKStateProps, CycledToggleHKActionProps, CycledToggleHKOwnProps, WithTranslation {

}

const CycledToggleHKComponent: React.FC<CycledToggleHKProps> = (props) => {

    const {
        t,
        isHotkeyed,
        path,
        hkLabel,
        hkLabelFormatter,
        hkData0,
        hkData1,
        hkData2,
        hkData3,
        highlightedPath,
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

    const buttonRef = React.useRef<CycledToggleImperativeHandlers>();

    const handleHotkeyTrigger = React.useCallback((e, hotkey, data, isRelease) => {
        buttonRef.current?.click(e);

        !isRelease && setTimeout(setPressed, 200, false);
    }, [buttonRef, setPressed]);

    const handlePress = React.useCallback((e) => {

        setPressed(true);
    }, [setPressed]);

    const handleRelease = React.useCallback((e) => {

        setPressed(false);

    }, [setPressed]);

    return (
        <div className={classNames('hotkey-cycled-toggle', {
            // ['hotkey-highlighted']: highlightedPath === path
        })}>
            <CycledToggle
                pressed={pressed}
                ref={buttonRef}
                {...buttonProps} />
            {path && (
                <>
                    <ButtonHotkeyInputs
                        path={path}
                        type={HotkeyControlType.Cycled}
                        autoblur={buttonProps.autoblur}
                        autofocus={buttonProps.autofocus}
                        {...hkLabelProps}
                    />
                    {isHotkeyed && (
                        <ButtonHotkeyTrigger
                            path={path}
                            onRelease={handleRelease}
                            onPress={handlePress}
                            onTrigger={handleHotkeyTrigger}
                        />
                    )}
                </>
            )}
        </div>
    );
};

const mapStateToProps: MapStateToProps<CycledToggleHKStateProps, CycledToggleHKOwnProps, AppState> = (state, {path}) => ({
    isHotkeyed: !!state.hotkeys.buttons[path],
    // highlightedPath: state.hotkeys.highlightedPath,
    autofocus: state.hotkeys.autofocus,
    autoblur: state.hotkeys.autoblur,
});

const mapDispatchToProps: MapDispatchToProps<CycledToggleHKActionProps, CycledToggleHKOwnProps> = {};

export const CycledToggleHK = connect<CycledToggleHKStateProps, CycledToggleHKActionProps, CycledToggleHKOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(CycledToggleHKComponent));