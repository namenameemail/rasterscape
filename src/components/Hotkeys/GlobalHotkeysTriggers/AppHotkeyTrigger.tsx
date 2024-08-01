import * as React from "react";
import keyboardjs from "keyboardjs";
import {NodeType} from "../../../utils/consts";
import {coordHelper} from "../../Area/canvasPosition.servise";


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
        console.log(this.props, e);

        if (activeElement.nodeName === NodeType.Input
            && (!document.activeElement.getAttribute(INPUT_WITH_HOTKEYS_DATA_ATTRIBUTE)
                || this.props.keys.length === 1)
        ) {
            return;
        }

        e.preventRepeat();
        const {onPress, keys, data} = this.props;
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
        const {keys, emptyKeys} = this.props;
        console.log(keys);
        if (keys || emptyKeys)
            keyboardjs.bind(keys, this.handlePress, this.handleRelease)
    }

    componentDidUpdate(prevProps) {
        const {keys, name, emptyKeys} = this.props;


        console.log(keys);
        if (prevProps.keys !== keys) {
            keyboardjs.unbind(prevProps.keys, this.handlePress, this.handleRelease);

            if (keys || emptyKeys)
                keyboardjs.bind(keys, this.handlePress, this.handleRelease);
        }
    }

    componentWillUnmount() {
        keyboardjs.unbind(this.props.keys, this.handlePress, this.handleRelease);
    }

    render() {
        return <></>;
    }
}