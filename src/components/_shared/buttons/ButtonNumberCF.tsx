import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import * as classNames from "classnames";
import {ButtonNumber, ButtonNumberProps} from "./ButtonNumber";
import {SelectItem} from "../../../utils/utils";
import {SelectDrop} from "./SelectDrop";
import {
    activateValueChanging,
    deactivateValueChanging,
    setValueInChangingList,
    setStartValue
} from "../../../store/changingValues/actions";
import {ChangingValuesState} from "../../../store/changingValues/reducer";
import {toStartValue} from "../../../store/change/actions";
import "../../../styles/buttonNumberCF.scss";
import {HoverHideable} from "../HoverHideable";
import {ShortcutInput} from "../ShortcutInput";
import {getChangeFunctionsSelectItemsNumber} from "../../../store/changeFunctions/selectors";
import {ChangeFunction} from "../../../store/changeFunctions/types";
import {addHotkey} from "../../../store/hotkeys";
import {HelpTooltip} from "../../tutorial/HelpTooltip";
import {HotkeyHelp} from "../../tutorial/tooltips/HotkeyHelp";
import {ChangeFunctionsHelp} from "../../tutorial/tooltips/ChangeFunctionHelp";
import {ChangingValue} from "../../../store/changingValues/types";
import {coordHelper2} from "../../Area/canvasPosition.servise";

export interface ButtonNumberCFStateProps {
    changeFunctionsSelectItems: SelectItem[]
    changeFunction: ChangeFunction
    changingValue: ChangingValue
    hotkey: string
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

    addHotkey(path: string, value: string)
}

export interface ButtonNumberCFOwnProps extends ButtonNumberProps {
    path: string
    buttonWrapper?
}

export interface ButtonNumberCFProps extends ButtonNumberCFStateProps, ButtonNumberCFActionProps, ButtonNumberCFOwnProps {

}

const ButtonNumberCFComponent: React.FunctionComponent<ButtonNumberCFProps> = React.memo((props) => {

    const {
        onChange,
        setStartValue, path, value,
        deactivateValueChanging,
        activateValueChanging,
        addHotkey,
        setValueInChangingList, range
    } = props;

    const {
        changeFunction,
        changeFunctionsSelectItems,
        changingValue,
        // path,
        className,
        hotkey,
        buttonWrapper: ButtonWrapper,
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

    const [active, setActive] = React.useState();

    const handleCFChange = React.useCallback(({value: changeFunctionId}) => {

        setValueInChangingList(path, changeFunctionId, range, value);

    }, [setValueInChangingList, path, range, value]);

    const handleChange = React.useCallback((data) => {

        onChange(data);

        setStartValue(path, value);
    }, [onChange, setStartValue, path, value]);

    const handleStartManualChanging = React.useCallback(() => {
        deactivateValueChanging(path);
        setActive(true);
    }, [deactivateValueChanging, path]);

    const handleStopManualChanging = React.useCallback(() => {
        activateValueChanging(path);
        setActive(false);
        // console.log('-----------------------------------------',this);
    }, [activateValueChanging, path]);

    const handleShortcutChange = React.useCallback((shortcut, e) => {
        if (shortcut === null || shortcut.length === 1) {
            addHotkey(path, shortcut);
            e.target.blur();
        }
    }, [addHotkey, path]);





    console.log("render b cf", buttonNumberProps.name, changeFunctionsSelectItems);

    const changingValueData = changingValue;
    const changingStartValue = changingValueData && changingValueData.startValue;
    const changeFunctionId = changingValueData && changingValue.changeFunctionId;
    const changingParams = changingValueData && changeFunction.params;
    const changingType = changingValueData && changeFunction.type;


    const buttonClassName = React.useMemo(() => classNames('button-number-cf-value', {
        ["button-number-cf-value-active"]: active
    }), [active]);

    const button = (
        <ButtonNumber
            {...othersButtonNumberProps}

            shortcut={hotkey}

            className={buttonClassName}

            changeFunctionId={changeFunctionId}
            changeFunctionType={changingType}
            changingStartValue={changingStartValue}
            changeFunctionParams={changingParams}

            onChange={handleChange}
            onMouseDown={handleStartManualChanging}
            onPress={handleStartManualChanging}
            onMouseUp={handleStopManualChanging}
            onRelease={handleStopManualChanging}/>
    );

    const buttonElement = React.useMemo(() => ButtonWrapper ? <ButtonWrapper button={button}/> : button, [ButtonWrapper, button]);

    return (
        <HoverHideable
            className={classNames("button-number-cf", className)}
            button={buttonElement}>
            {!active &&
            <HoverHideable
                className={"button-number-cf-settings"}
                button={<div className="button-number-cf-settings-handler">
                    <div></div>
                </div>}>

                <HelpTooltip component={HotkeyHelp}>
                    <ShortcutInput
                        placeholder={'hotkey'}
                        value={hotkey}
                        onChange={handleShortcutChange}/>
                </HelpTooltip>

                <HelpTooltip component={ChangeFunctionsHelp} componentProps={{path}}>
                    <SelectDrop
                        name={buttonNumberProps.name + '-select-cf'}
                        nullAble
                        className={"button-number-cf-select"}
                        value={changingValue?.changeFunctionId}
                        onChange={handleCFChange}
                        items={changeFunctionsSelectItems}/>
                </HelpTooltip>
            </HoverHideable>
            }
        </HoverHideable>
    );

});

const mapStateToProps: MapStateToProps<ButtonNumberCFStateProps, ButtonNumberCFOwnProps, AppState> = (state, {path}) => ({
    changeFunctionsSelectItems: getChangeFunctionsSelectItemsNumber(state),
    changeFunction: state.changeFunctions?.functions?.[state.changingValues?.[path]?.changeFunctionId],
    changingValue: state.changingValues?.[path],
    hotkey: state.hotkeys?.keys?.[path],
});

const mapDispatchToProps: MapDispatchToProps<ButtonNumberCFActionProps, ButtonNumberCFOwnProps> = {
    setValueInChangingList, deactivateValueChanging, activateValueChanging, toStartValue, setStartValue, addHotkey
};

export const ButtonNumberCF = connect<ButtonNumberCFStateProps, ButtonNumberCFActionProps, ButtonNumberCFOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(ButtonNumberCFComponent);