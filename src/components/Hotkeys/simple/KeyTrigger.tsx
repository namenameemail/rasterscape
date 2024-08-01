import * as React from "react";
import keyboardjs from "keyboardjs";
import {NodeType} from "../../../utils/consts";
import {coordHelper} from "../../Area/canvasPosition.servise";

export interface UserHotkeyTriggerProps {
    keyValue?: string
    codeValue?: string

    onPress?(e?: any, name?: any, key?: string, code?: string)

    onRelease?(e?: any, name?: any, key?: string, code?: string)

    name?: any

    debug?: boolean;

    withInputs?: boolean
}

export const INPUT_WITH_HOTKEYS_DATA_ATTRIBUTE = 'data-hotkeys';

export class KeyTrigger extends React.PureComponent<UserHotkeyTriggerProps> {

    getKey = (props: UserHotkeyTriggerProps) => {
        const { keyValue } = props;
        return keyValue;
    };
    getCode = (props: UserHotkeyTriggerProps) => {
        const { codeValue } = props;
        return codeValue;
    };
    handlePress = e => {
        const { keyValue, codeValue, withInputs } = this.props;

        this.props.debug && coordHelper.writeln(e.key, keyValue, codeValue);
        if (keyValue && e.key !== keyValue) {
            return;
        }

        if (document.activeElement.nodeName === NodeType.Input && !withInputs) {
            return;
        }

        e.preventRepeat();
        const {onPress, name} = this.props;
        onPress && onPress(e, name, keyValue, codeValue);
    };

    handleRelease = e => {
        const { keyValue, codeValue, withInputs } = this.props;

        if (keyValue && e.key !== keyValue) {
            return;
        }
        if (document.activeElement.nodeName === NodeType.Input && !withInputs) {
            return;
        }

        const {onRelease, name} = this.props;
        onRelease && onRelease(e, name, keyValue, codeValue);
    };

    componentDidMount() {
        const code = this.getCode(this.props);
        this.props.debug && coordHelper.writeln('mount - code', code)
        if (code) {
            keyboardjs.bind(code, this.handlePress, this.handleRelease)
            this.props.debug && coordHelper.writeln('BIND', code)
        }
    }

    componentDidUpdate(prevProps) {
        const {codeValue} = this.props;
        const prevCode = prevProps.codeValue;

        this.props.debug && coordHelper.writeln('update - code', codeValue, prevCode !== codeValue)

        if (prevCode !== codeValue) {
            if (prevCode) {
                keyboardjs.unbind(prevCode, this.handlePress, this.handleRelease);
                this.props.debug && coordHelper.writeln('UNBIND', prevCode)
            }

            if (codeValue) {
                keyboardjs.bind(codeValue, this.handlePress, this.handleRelease);

                this.props.debug && coordHelper.writeln('BIND', codeValue)
            }
        }
    }



    componentWillUnmount() {

        this.props.codeValue && keyboardjs.unbind(this.props.codeValue, this.handlePress, this.handleRelease);
        this.props.debug && coordHelper.writeln('unmount UNBIND', this.props.codeValue)
    }

    render() {
        return <></>;
    }
}
