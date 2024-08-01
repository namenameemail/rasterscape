import * as React from "react";
import {Button, ButtonEventData, ButtonProps} from '../Button';
import classNames from "classnames";

export const defaultGetValue = ({value}) => value;
export const defaultGetText = ({text}) => text;

export interface CycledToggleEventData extends ButtonEventData {

    item: any
    items: any[]
}

export interface CycledToggleProps extends ButtonProps {


    className?: string
    name?: string
    items: any[]
    value?: any

    nullText?: string

    nullAble?: boolean

    br?: number
    width?: number

    onChange(data?: CycledToggleEventData)

    getValue?(item: any)

    getText?(item: any)
}

export interface CycledToggleImperativeHandlers {
    click(e: any)
}

export const CycledToggle = React.forwardRef<CycledToggleImperativeHandlers, CycledToggleProps>((props, ref) => {

    const {
        value, items,
        getValue = defaultGetValue,
        getText = defaultGetText,
        className,
        nullText = '-',
        pressed,
        autofocus,
        autoblur,
    } = props;

    const [valueMap, setValueMap] = React.useState({});

    React.useImperativeHandle(ref, () => ({
        click: (e) => {
            console.log('CLICK');
            handleClick({value, e});
        }
    }), [value]);

    React.useEffect(() => {
        const {name, items, onChange, getValue = defaultGetValue, nullAble} = props;

        setValueMap(items.reduce((res, item) => {
            res[getValue(item)] = item;
            return res;
        }, {}));

        if (!value && !nullAble) {
            onChange({
                value: getValue(items[0]),
                item: items[0],
                items, name
            });
        }
    }, []);

    React.useEffect(() => {
        setValueMap(items.reduce((res, item) => {
            res[getValue(item)] = item;
            return res;
        }, {}))
    }, [items, getValue]);

    const handleClick = React.useCallback(({value, e}) => {
        const {name, items, onChange, getValue = defaultGetValue, nullAble} = props;

        const nextIndex = items.findIndex(item => getValue(item) === value) + 1;
        let newItem;

        if (items[nextIndex]) {
            newItem = items[nextIndex];
        } else {
            if (nullAble) {
                newItem = null
            } else {
                newItem = items[0];
            }
        }

        let newValue = newItem ? getValue(newItem) : null;


        onChange && onChange({
            value: newValue,
            item: newItem,
            e, items, name
        });
    }, [getValue]);

    const valueItem = valueMap[value];

    return (
        <Button
            className={classNames(className, "cycled-toggle")}
            value={value}
            onClick={handleClick}
            pressed={pressed}

            autofocus={autofocus}
            autoblur={autoblur}
        >{valueItem ? getText(valueItem) : nullText}</Button>
    );
});