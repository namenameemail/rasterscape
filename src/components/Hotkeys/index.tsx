import * as React from "react";
import cn from "classnames";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../store";
import './styles.scss';
import {
    settingMode,
} from "../../store/hotkeys/actions";
import {Button} from "../_shared/buttons/simple/Button";
import {WithTranslation, withTranslation} from "react-i18next";
import {GlobalHotkeysTriggers} from "./GlobalHotkeysTriggers/GlobalHotkeysTriggers";
import {HotkeysPanel} from "./HotkeysPanel/HotkeysPanel";

export interface HotkeysStateProps {
    isSettingMode: boolean
}

export interface HotkeysActionProps {
    settingMode(state: boolean)
}

export interface HotkeysOwnProps {

}

export interface HotkeysProps extends HotkeysStateProps, HotkeysActionProps, HotkeysOwnProps, WithTranslation {

}

const HotkeysComponent: React.FC<HotkeysProps> = (props) => {

    const {
        settingMode,
        isSettingMode,
        t,
    } = props;

    const toggleHotkeys = React.useCallback(() => {
        settingMode(!isSettingMode);
    }, [isSettingMode, settingMode]);

    return (
        <div className={'hotkeys'}>
            {isSettingMode && (
                <HotkeysPanel onClose={toggleHotkeys}/>
            )}
            <GlobalHotkeysTriggers/>
            <Button
                autofocus
                className={cn("app-control-button", {
                    "app-control-button__selected": isSettingMode
                })}
                onClick={toggleHotkeys}>{t('globalHotkeys.hk')}</Button>
        </div>
    );
};

const mapStateToProps: MapStateToProps<HotkeysStateProps, HotkeysOwnProps, AppState> = state => ({
    isSettingMode: state.hotkeys.setting,
});

const mapDispatchToProps: MapDispatchToProps<HotkeysActionProps, HotkeysOwnProps> = {
    settingMode,
};

export const Hotkeys = connect<HotkeysStateProps, HotkeysActionProps, HotkeysOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(HotkeysComponent));