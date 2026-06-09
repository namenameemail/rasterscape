import * as React from "react";
import keyboardjs from "keyboardjs";
import {NodeType} from "../../../utils/consts";
import {profileHotkeyAltP} from "../../../utils/profileHotkeys";

function isProjectsPanelHotkey(keys: KeyProps['keys']): boolean {
    if (!keys) {
        return false;
    }

    const list = Array.isArray(keys) ? keys : [keys];
    return list.some(key => key === 'alt + p' || key === 'option + p');
}

export interface KeyProps {
    keys: string | string[]
    emptyKeys?: boolean

    onPress?(e?: any, keys?: string | string[], data?: any)

    onRelease?(e?: any, keys?: string | string[], data?: any)

    data?: any

    name?: string
}

export interface KeyState {
}

export const INPUT_WITH_HOTKEYS_DATA_ATTRIBUTE = 'data-hotkeys';

export class AppHotkeyTrigger extends React.PureComponent<KeyProps, KeyState> {

    handlePress = e => {
        const activeElement = document.activeElement;
        const {onPress, keys, data, name} = this.props;
        const isProjectsPanel = name === 'projectsPanel' || isProjectsPanelHotkey(keys);

        if (isProjectsPanel) {
            profileHotkeyAltP('keyboardjs handlePress', {
                name,
                keys,
                key: e?.key,
                code: e?.code,
                altKey: e?.altKey,
                activeElement: activeElement?.nodeName,
            });
        }

        if (activeElement.nodeName === NodeType.Input
            && (!document.activeElement.getAttribute(INPUT_WITH_HOTKEYS_DATA_ATTRIBUTE)
                || this.props.keys.length === 1)
        ) {
            if (isProjectsPanel) {
                profileHotkeyAltP('blocked focus in input', {
                    activeElement: activeElement.nodeName,
                    hasHotkeysAttr: !!document.activeElement.getAttribute(INPUT_WITH_HOTKEYS_DATA_ATTRIBUTE),
                });
            }
            return;
        }

        e.preventRepeat();
        onPress && onPress(e, keys, data);
    };

    handleRelease = e => {
        const activeElement = document.activeElement;

        if (activeElement.nodeName === NodeType.Input
            && (!document.activeElement.getAttribute(INPUT_WITH_HOTKEYS_DATA_ATTRIBUTE)
                || this.props.keys.length === 1)
        ) {
            return;
        }

        const {onRelease, keys, data} = this.props;
        onRelease && onRelease(e, keys, data);
    };

    componentDidMount() {
        const {keys, emptyKeys, name} = this.props;

        if (name === 'projectsPanel' || isProjectsPanelHotkey(keys)) {
            profileHotkeyAltP('keyboardjs bind', {name, keys});
        }

        if (keys || emptyKeys) {
            keyboardjs.bind(keys, this.handlePress, this.handleRelease);
        }
    }

    componentDidUpdate(prevProps) {
        const {keys, emptyKeys, name} = this.props;

        if (prevProps.keys !== keys) {
            if (prevProps.name === 'projectsPanel' || isProjectsPanelHotkey(prevProps.keys)) {
                profileHotkeyAltP('keyboardjs unbind', {name: prevProps.name, keys: prevProps.keys});
            }

            keyboardjs.unbind(prevProps.keys, this.handlePress, this.handleRelease);

            if (keys || emptyKeys) {
                if (name === 'projectsPanel' || isProjectsPanelHotkey(keys)) {
                    profileHotkeyAltP('keyboardjs bind', {name, keys});
                }
                keyboardjs.bind(keys, this.handlePress, this.handleRelease);
            }
        }
    }

    componentWillUnmount() {
        keyboardjs.unbind(this.props.keys, this.handlePress, this.handleRelease);
    }

    render() {
        return <></>;
    }
}