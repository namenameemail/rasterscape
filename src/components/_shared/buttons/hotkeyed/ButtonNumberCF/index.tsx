import * as React from "react";
import {createPortal} from "react-dom";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "store";
import classNames from "classnames";
import {ButtonNumber, ButtonNumberProps} from "../../complex/ButtonNumber";
import {SelectDrop, SelectDropImperativeHandlers} from "../../complex/SelectDrop";
import {
    activateValueChanging,
    deactivateValueChanging,
    setStartValue,
    setValueInChangingList
} from "store/changingValues/actions";
import {toStartValue} from "store/change/actions";
import "./styles.scss";
import {ButtonHotkeyInputs} from "../../../../Hotkeys/ButtonHotkeyInputs/ButtonHotkeyInputs";
import {getChangeFunctionsSelectItemsNumber} from "../../../../../store/changeFunctions/selectors";
import {ChangeFunctionState, ECFType} from "../../../../../store/changeFunctions/types";
import {ChangingValue} from "../../../../../store/changingValues/types";
import {WithTranslation, withTranslation} from "react-i18next";
import {SelectButtonsEventData} from "../../complex/SelectButtons";
import {setCFHighlights, setCFTypeHighlights} from "../../../../../store/changeFunctionsHighlights";
import {LabelFormatter} from "../../../../../store/hotkeys/label-formatters";
import {Translations} from "../../../../../store/language/helpers";
import {HKLabelProps} from "../types";
import {ButtonHotkeyTrigger} from "../../../../Hotkeys/ButtonHotkeyInputs/ButtonHotkeyTrigger";
import {HotkeyControlType} from "../../../../../store/hotkeys/types";
import {useHoverHideableLock} from "../../../HoverHideable/HoverHideableLockContext";

export interface ButtonNumberCFStateProps {
    changeFunctionsSelectItems: ChangeFunctionState[]
    changeFunction?: ChangeFunctionState
    changingValue: ChangingValue
    isHotkeyed: boolean
    settingMode: boolean
    highlightedPath: string
}

export interface ButtonNumberCFActionProps {
    setValueInChangingList(
        path: string,
        changeFunctionId: string,
        range: [number, number],
        startValue: number)

    deactivateValueChanging(path: string)

    activateValueChanging(path: string)

    toStartValue(path: string)

    setStartValue(path: string, startValue: number)

    setCFHighlights(cfName?: string)

    setCFTypeHighlights(cfType?: ECFType[])
}

export interface ButtonNumberCFOwnProps extends ButtonNumberProps, HKLabelProps {
    path: string
    buttonWrapper?
    withoutCF?: boolean
    hkByValue?: boolean
}

export interface ButtonNumberCFProps extends ButtonNumberCFStateProps, ButtonNumberCFActionProps, ButtonNumberCFOwnProps, WithTranslation {

}

const availableCFTypes = [ECFType.FXY, ECFType.WAVE];
const CF_PANEL_Z = 20;

const ButtonNumberCFComponent: React.FunctionComponent<ButtonNumberCFProps> = React.memo((props) => {

    const {
        onChange,
        onMouseDown,
        onMouseUp,
        onPress,
        onRelease,
        setStartValue,
        path,
        isHotkeyed,
        value,
        deactivateValueChanging,
        activateValueChanging,
        setValueInChangingList,
        range,
        from,
        to,
        setCFHighlights,
        setCFTypeHighlights,
        t,
        tReady: _tReady,
        i18n: _i18n,
        settingMode,
        hkLabel,
        hkLabelFormatter,
        hkData0,
        hkData1,
        hkData2,
        hkData3,
        hkByValue: _hkByValue,
        highlightedPath: _highlightedPath,
        autoblur,
        autofocus,
        changeFunction,
        changeFunctionsSelectItems,
        changingValue,
        className,
        buttonWrapper: ButtonWrapper,
        withoutCF,
        toStartValue: _toStartValue,
        ...buttonNumberProps
    } = props;

    const hkLabelProps: HKLabelProps = {
        hkLabel,
        hkLabelFormatter,
        hkData0,
        hkData1,
        hkData2,
        hkData3,
    };

    const rootRef = React.useRef<HTMLDivElement>(null);
    const selectDropRef = React.useRef<SelectDropImperativeHandlers>(null);
    const closeTimerRef = React.useRef<number>();

    const [_redOpen, setRedOpen] = React.useState(false);
    const [_menuOpen, setMenuOpen] = React.useState(false);
    const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
    const [portalScope, setPortalScope] = React.useState('');

    const [active, setActive] = React.useState<boolean>();

    const clearCloseTimer = React.useCallback(() => {
        if (closeTimerRef.current != null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = undefined;
        }
    }, []);

    const updatePanelPosition = React.useCallback(() => {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        setPanelStyle({
            top: rect.top,
            left: rect.right - 1,
            zIndex: CF_PANEL_Z,
        });
        const scopes: string[] = [];
        if (root.closest('.repeating-controls')) scopes.push('button-number-cf-portal-host--repeating');
        if (root.closest('.video-offset')) scopes.push('button-number-cf-portal-host--video-offset');
        if (root.closest('.video-controls')) scopes.push('button-number-cf-portal-host--video');
        const colorHost = root.closest('.video-offset-red, .video-offset-blue, .video-offset-green');
        if (colorHost) {
            colorHost.classList.forEach((c) => {
                if (c.startsWith('video-offset-')) scopes.push(c);
            });
        }
        setPortalScope(scopes.join(' '));
    }, []);

    const hoverLock = useHoverHideableLock();

    React.useEffect(() => {
        if (!_redOpen || !hoverLock) return;
        hoverLock.lock();
        return () => hoverLock.unlock();
    }, [_redOpen, hoverLock]);

    const openCf = React.useCallback(() => {
        clearCloseTimer();
        updatePanelPosition();
        setRedOpen(true);
    }, [clearCloseTimer, updatePanelPosition]);

    const closeCf = React.useCallback(() => {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setRedOpen(false);
            setMenuOpen(false);
        }, 80);
    }, [clearCloseTimer]);

    React.useEffect(() => {
        if (!_redOpen) return;
        const sync = () => updatePanelPosition();
        window.addEventListener('resize', sync);
        window.addEventListener('scroll', sync, true);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync, true);
        };
    }, [_redOpen, updatePanelPosition]);

    React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

    const handleCFChange = React.useCallback(({value: changeFunctionId}) => {
        setValueInChangingList(path, changeFunctionId, range || [from, to], value);
    }, [setValueInChangingList, path, range, from, to, value]);

    const handleChange = React.useCallback((data) => {
        onChange(data);
        setStartValue(path, value);
    }, [onChange, setStartValue, path, value]);

    const handleMouseDown = React.useCallback((e) => {
        deactivateValueChanging(path);
        setActive(true);
        onMouseDown?.(e);
    }, [deactivateValueChanging, path, onMouseDown]);

    const handleMouseUp = React.useCallback((e) => {
        activateValueChanging(path);
        setActive(false);
        onMouseUp?.(e);
    }, [activateValueChanging, path, onMouseUp]);

    const handlePress = React.useCallback((e) => {
        deactivateValueChanging(path);
        setActive(true);
        onPress?.(e);
    }, [deactivateValueChanging, path, onPress]);

    const handleRelease = React.useCallback((e) => {
        activateValueChanging(path);
        setActive(false);
        onRelease?.(e);
    }, [activateValueChanging, path, onRelease]);

    const handleCFMouseEnter = React.useCallback((data: SelectButtonsEventData) => {
        setCFHighlights(data?.value?.id);
    }, [setCFHighlights]);
    const handleCFMouseLeave = React.useCallback((_data: SelectButtonsEventData) => {
        setCFHighlights(null);
    }, [setCFHighlights]);

    const handleCFValueMouseEnter = React.useCallback(() => {
        if (!changeFunctionsSelectItems.length)
            setCFTypeHighlights(availableCFTypes);
    }, [setCFTypeHighlights, changeFunctionsSelectItems]);
    const handleCFValueMouseLeave = React.useCallback(() => {
        setCFTypeHighlights(null);
    }, [setCFTypeHighlights]);

    const changingValueData = changingValue;
    const changingStartValue = changingValueData && changingValueData.startValue;
    const changeFunctionId = changingValueData && changingValue.changeFunctionId;
    const changingParams = changingValueData && changeFunction.params;
    const changingType = changingValueData && changeFunction.type;

    const buttonClassName = React.useMemo(() => classNames('button-number-cf-value', {
        ["button-number-cf-value-active"]: active
    }), [active]);

    const buttonNumberRef = React.useRef(null);

    const handlePressHotkey = React.useCallback((...args) => {
        buttonNumberRef.current?.handlePress(...args);
    }, [buttonNumberRef]);

    const handleReleaseHotkey = React.useCallback((...args) => {
        buttonNumberRef.current?.handleRelease(...args);
    }, [buttonNumberRef]);

    const button = (
        <>
            <ButtonNumber
                ref={buttonNumberRef}
                {...buttonNumberProps}
                value={value}
                range={range}
                from={from}
                to={to}
                hotkeyDisabled={settingMode}
                className={buttonClassName}
                changeFunction={changeFunction}
                changeFunctionId={changeFunctionId}
                changeFunctionType={changingType}
                changingStartValue={changingStartValue}
                changeFunctionParams={changingParams}
                onChange={handleChange}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onPress={handlePress}
                onRelease={handleRelease}
            />
            {path && (
                <>
                    <ButtonHotkeyInputs
                        path={path}
                        type={HotkeyControlType.Number}
                        autoblur={autoblur}
                        autofocus={autofocus}
                        {...hkLabelProps}
                    />
                    {isHotkeyed && (
                        <ButtonHotkeyTrigger
                            path={path}
                            onPress={handlePressHotkey}
                            onRelease={handleReleaseHotkey}/>
                    )}
                </>
            )}
        </>
    );

    const buttonElement = React.useMemo(() =>
            ButtonWrapper
                ? <ButtonWrapper button={button}/>
                : button,
        [ButtonWrapper, button]
    );

    const handleKeyPress = React.useCallback((e) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            openCf();
            setMenuOpen(true);
            setTimeout(selectDropRef.current?.focus, 0);
        }
    }, [openCf]);

    const handleCFSelectDropBlur = React.useCallback(() => {
        setTimeout(() => {
            setMenuOpen(false);
            if (!rootRef.current?.matches(':hover')) {
                setRedOpen(false);
            }
        }, 150);
        buttonNumberRef.current?.focus();
    }, []);

    const cfGetText = React.useMemo(() => (item: ChangeFunctionState) => {
        return Translations.cfName(t)(item);
    }, [t]);

    const cfGetValue = React.useMemo(() => (item: ChangeFunctionState) => {
        return item.id
    }, []);

    const cfPanel = !active && _redOpen && createPortal(
        <div className={classNames('button-number-cf-portal-host', portalScope)}>
            <div
                className={classNames("button-number-cf-settings", "button-number-cf-settings--portal", className, {
                    "button-number-cf-settings--menu-open": _menuOpen,
                })}
                style={panelStyle}
                onMouseEnter={openCf}
                onMouseLeave={closeCf}
            >
                <div
                    className="button-number-cf-settings-handler"
                    onMouseEnter={() => setMenuOpen(true)}
                >
                    <div></div>
                </div>
                {_menuOpen && (
                    <SelectDrop
                        ref={selectDropRef}
                        onBlur={handleCFSelectDropBlur}
                        name={buttonNumberProps.name + '-select-cf'}
                        nullAble
                        nullText={'-'}
                        hkByValue={false}
                        hkLabel={hkLabel}
                        hkLabelFormatter={LabelFormatter.ChangeFunction}
                        hkData1={hkData1}
                        hkData2={hkData2}
                        hkData3={hkData3}
                        onValueMouseEnter={handleCFValueMouseEnter}
                        onValueMouseLeave={handleCFValueMouseLeave}
                        className={"button-number-cf-select"}
                        value={changingValue?.changeFunctionId}
                        onItemMouseEnter={handleCFMouseEnter}
                        onItemMouseLeave={handleCFMouseLeave}
                        onChange={handleCFChange}
                        getText={cfGetText}
                        getValue={cfGetValue}
                        items={changeFunctionsSelectItems}
                    />
                )}
            </div>
        </div>,
        document.body,
    );

    return withoutCF ? <div className={classNames("button-number-cf", className)}>{buttonElement}</div> : (
        <div
            ref={rootRef}
            className={classNames("button-number-cf", className)}
            onKeyPress={handleKeyPress}
            onMouseEnter={openCf}
            onMouseLeave={closeCf}
        >
            {buttonElement}
            {cfPanel}
        </div>
    );

});

const mapStateToProps: MapStateToProps<ButtonNumberCFStateProps, ButtonNumberCFOwnProps, AppState> = (state, {path}) => ({
    changeFunctionsSelectItems: getChangeFunctionsSelectItemsNumber(state),
    changeFunction: state.changeFunctions.functions[state.changingValues[path]?.changeFunctionId],
    changingValue: state.changingValues[path],
    isHotkeyed: !!state.hotkeys.buttons[path],
    settingMode: state.hotkeys.setting,
    highlightedPath: state.hotkeys.highlightedPath,
    autofocus: state.hotkeys.autofocus,
    autoblur: state.hotkeys.autoblur,
});

const mapDispatchToProps: MapDispatchToProps<ButtonNumberCFActionProps, ButtonNumberCFOwnProps> = {
    setValueInChangingList,
    deactivateValueChanging,
    activateValueChanging,
    toStartValue,
    setStartValue,
    setCFHighlights,
    setCFTypeHighlights,
};

export const ButtonNumberCF = connect<ButtonNumberCFStateProps, ButtonNumberCFActionProps, ButtonNumberCFOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(ButtonNumberCFComponent));
