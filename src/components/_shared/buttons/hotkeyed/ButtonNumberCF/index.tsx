import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "store";
import classNames from "classnames";
import {ButtonNumber, ButtonNumberProps} from "../../complex/ButtonNumber";
import {SelectItem} from "utils/utils";
import {SelectDrop, SelectDropImperativeHandlers} from "../../complex/SelectDrop";
import {
    activateValueChanging,
    deactivateValueChanging,
    setStartValue,
    setValueInChangingList
} from "store/changingValues/actions";
import {toStartValue} from "store/change/actions";
import "./styles.scss";
import {HoverHideable} from "../../../HoverHideable/HoverHideable";
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
}

export interface ButtonNumberCFProps extends ButtonNumberCFStateProps, ButtonNumberCFActionProps, ButtonNumberCFOwnProps, WithTranslation {

}

const availableCFTypes = [ECFType.FXY, ECFType.WAVE];

const ButtonNumberCFComponent: React.FunctionComponent<ButtonNumberCFProps> = React.memo((props) => {

    const {
        onChange,
        setStartValue, path, isHotkeyed, value,
        deactivateValueChanging,
        activateValueChanging,
        setValueInChangingList,
        range,
        from, to,
        setCFHighlights, setCFTypeHighlights,
        t,
        settingMode,
        hkLabel,
        hkLabelFormatter,
        hkData0, hkData1, hkData2, hkData3,
        highlightedPath,
        autoblur,
        autofocus
    } = props;

    const hkLabelProps: HKLabelProps = {
        hkLabel,
        hkLabelFormatter,
        hkData0,
        hkData1,
        hkData2,
        hkData3,
    };

    const {
        changeFunction,
        changeFunctionsSelectItems,
        changingValue,
        className,
        buttonWrapper: ButtonWrapper,
        withoutCF,
        ...buttonNumberProps
    } = props;

    const {
        // onChange,
        onMouseDown,
        onMouseUp,
        onPress,
        onRelease,
        ...othersButtonNumberProps
    } = buttonNumberProps;
    //
    // React.useEffect(() => coordHelper2.writeln('changeFunctionsSelectItems'), [changeFunctionsSelectItems]);
    // React.useEffect(() => coordHelper2.writeln('changeFunction'), [changeFunction]);
    // React.useEffect(() => coordHelper2.writeln('changingValue'), [changingValue]);
    // React.useEffect(() => coordHelper2.writeln('hotkey'), [hotkey]);

    const selectDropRef = React.useRef<SelectDropImperativeHandlers>(null);

    const [_redOpen, setRedOpen] = React.useState(false);
    const [_menuOpen, setMenuOpen] = React.useState(false);

    const [active, setActive] = React.useState<boolean>();

    const handleCFChange = React.useCallback(({value: changeFunctionId}) => {

        setValueInChangingList(path, changeFunctionId, range || [from, to], value);

    }, [setValueInChangingList, path, range, from, to, value]);

    const handleChange = React.useCallback((data) => {

        onChange(data);

        setStartValue(path, value);
    }, [onChange, setStartValue, path, value]);

    const handleMouseDown = React.useCallback((e) => { //handleStartManualChanging
        deactivateValueChanging(path);
        setActive(true);
        onMouseDown?.(e);
    }, [deactivateValueChanging, path, onMouseDown]);

    const handleMouseUp = React.useCallback((e) => { //handleStopManualChanging
        activateValueChanging(path);
        setActive(false);
        onMouseUp?.(e);
    }, [activateValueChanging, path, onMouseUp]);

    const handlePress = React.useCallback((e) => { //handleStartManualChanging
        deactivateValueChanging(path);
        setActive(true);
        onPress?.(e);
    }, [deactivateValueChanging, path, onPress]);

    const handleRelease = React.useCallback((e) => { //handleStopManualChanging
        activateValueChanging(path);
        setActive(false);
        onRelease?.(e);
    }, [activateValueChanging, path, onRelease]);

    const handleCFMouseEnter = React.useCallback((data: SelectButtonsEventData) => {
        setCFHighlights(data?.value?.id);
    }, [setCFHighlights]);
    const handleCFMouseLeave = React.useCallback((data: SelectButtonsEventData) => {
        setCFHighlights(null);
    }, [setCFHighlights]);

    const handleCFValueMouseEnter = React.useCallback(() => {
        if (!changeFunctionsSelectItems.length)
            setCFTypeHighlights(availableCFTypes);
    }, [setCFTypeHighlights, changeFunctionsSelectItems]);
    const handleCFValueMouseLeave = React.useCallback(() => {
        setCFTypeHighlights(null);
    }, [setCFTypeHighlights]);


    // console.log("render b cf", buttonNumberProps.name, changeFunctionsSelectItems);

    const changingValueData = changingValue;
    const changingStartValue = changingValueData && changingValueData.startValue;
    const changeFunctionId = changingValueData && changingValue.changeFunctionId;
    const changingParams = changingValueData && changeFunction.params;
    const changingType = changingValueData && changeFunction.type;
    const cfNumber = changeFunction?.number;


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
                {...othersButtonNumberProps}

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
            setRedOpen(true);
            setMenuOpen(true);

            //это можно коментить чтобы не открывалось автоматм
            setTimeout(selectDropRef.current?.focus, 0);
        }
    }, []);

    // const handleCFSelectDropFocus = React.useCallback(() => {
    //
    // }, []);
    // const timer = React.useRef(null);
    const handleCFSelectDropBlur = React.useCallback(() => {
        // console.log('SELECT DROP BLUR')
        setTimeout(() => {
            setRedOpen(false);
            setMenuOpen(false);
        }, 150)
        buttonNumberRef.current?.focus();
    }, [setRedOpen, setMenuOpen]);
    //
    //
    //
    // const handleContainerFocus = React.useCallback(() => {
    //     setRedOpen(false);
    //     setMenuOpen(false);
    //
    // }, [setRedOpen, setMenuOpen]);
    //
    // const handleContainerBlur = React.useCallback(() => {
    //     setRedOpen(false);
    //     setMenuOpen(false);
    //
    // }, [setRedOpen, setMenuOpen]);


    const cfGetText = React.useMemo(() => (item: ChangeFunctionState) => {
        return Translations.cfName(t)(item);
    }, [t]);

    const cfGetValue = React.useMemo(() => (item: ChangeFunctionState) => {
        return item.id
    }, []);

    return withoutCF ? <div className={classNames("button-number-cf", className)}>{buttonElement}</div> : (
        <HoverHideable
            open={_redOpen}
            onKeyPress={handleKeyPress}
            className={classNames("button-number-cf", {
                // ['hotkey-highlighted']: highlightedPath === path
            }, className)}
            button={buttonElement}>
            {!active && (
                <HoverHideable
                    open={_menuOpen}
                    className={"button-number-cf-settings"}
                    button={<div className="button-number-cf-settings-handler">
                        <div></div>
                    </div>}>
                    <SelectDrop
                        ref={selectDropRef}
                        onBlur={handleCFSelectDropBlur}
                        // onFocus={}
                        name={buttonNumberProps.name + '-select-cf'}
                        nullAble
                        nullText={'-'}

                        hkByValue={false}
                        hkLabel={hkLabel}
                        hkLabelFormatter={LabelFormatter.ChangeFunction}
                        hkData1={hkData1}
                        hkData2={hkData2}
                        hkData3={hkData3}

                        //     hkLabel,
                        // hkData1, hkData2, hkData3,
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
                </HoverHideable>
            )}
        </HoverHideable>
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