import * as React from "react";
import {
    defaultGetText,
    defaultGetValue,
    SelectButtons, SelectButtonsEventData,
    SelectButtonsImperativeHandlers,
    SelectButtonsProps
} from "../SelectButtons";
import classNames from "classnames";
import "./styles.scss";
import {Button, ButtonImperativeHandlers} from "components/_shared/buttons/simple/Button";

export interface SelectDropProps extends SelectButtonsProps {
    open?: boolean

    onValueMouseEnter?()

    onValueMouseLeave?()

    nullText?: string;

    onValueBlur?()

    onSelectBlur?()
}

export interface SelectDropImperativeHandlers {
    open()

    focus()
}


export const SelectDrop = React.forwardRef<SelectDropImperativeHandlers, SelectDropProps>((_props, ref) => {

    const {
        className, nullText, onChange,
        onBlur, onFocus,
        onValueBlur, onSelectBlur,
        open,
        ...props
    } = _props;

    const selectButtonsRef = React.useRef<SelectButtonsImperativeHandlers>(null);
    const valueButtonRef = React.useRef<ButtonImperativeHandlers>(null);
    const containerRef = React.useRef(null);
    const [_open, setOpen] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
        open: () => {
            handleOpen();
        },
        focus: () => {
            valueButtonRef.current.focus();
        },
    }))

    const handleOpen = React.useCallback((e?) => {
        setOpen(true);
        setTimeout(() => {
            const resp = selectButtonsRef.current.focus();
            if (!resp) {
                setOpen(false);
                setTimeout(valueButtonRef.current?.focus, 0);
            }
        }, 0);
    }, [setOpen, valueButtonRef]);


    const handleChange = React.useCallback((data: SelectButtonsEventData) => {

        onChange && onChange(data);


        if (_open && !(data.isNextValue || data.isPrevValue)) {
            setOpen(false);
            setTimeout(valueButtonRef.current?.focus, 0);
        }

        setNeedFocusValue(true);
    }, [onChange, _open]);


    // FOCUS

    const timer = React.useRef(null);


    const handleKeyPress = React.useCallback((e) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            handleOpen();
        }
    }, [handleOpen]);

    const handleValueButtonFocus = React.useCallback(() => {
        timer.current && clearTimeout(timer.current);
        onFocus?.();
    }, [setOpen, onFocus]);

    const handleValueButtonBlur = React.useCallback(() => {
        timer.current = setTimeout(() => {
            setOpen(false);
            onBlur?.();
        }, 0);
    }, [setOpen, onBlur]);


    const handleSelectButtonBlur = React.useCallback(() => {

        const isActiveInside = containerRef.current?.contains(document.activeElement);

        const isValueButtonActive = document.activeElement === valueButtonRef.current.getElement()

        // console.log(isActiveInside, isValueButtonActive, document.activeElement);
        if (!isActiveInside || isValueButtonActive) {

            setOpen(false);
            onSelectBlur?.();
            setTimeout(() => {
                const isValueButtonActive = document.activeElement === valueButtonRef.current?.getElement();
                if (!isValueButtonActive) {
                    setOpen(false);
                    onBlur?.();
                }
            }, 0);
        }

    }, [setOpen, onSelectBlur, onBlur, valueButtonRef]);

    const handleSelectButtonFocus = React.useCallback(() => {
        timer.current && clearTimeout(timer.current);
    }, [setOpen]);


    const handleKeyDown = React.useCallback((e) => {
        let i = 0;
        if (e.keyCode === 38 || e.keyCode === 37) {
            i = 1;
        } else if (e.keyCode === 40 || e.keyCode === 39) {
            i = -1
        }

        if (!i) return;

        if (i < 0)
            !_open && !open && selectButtonsRef.current.nextValue()
        else
            !_open && !open && selectButtonsRef.current.prevValue()
    }, [selectButtonsRef, _open, open]);

    const {
        value,
        getValue = defaultGetValue,
        getText = defaultGetText,
        items,
        onValueMouseEnter,
        onValueMouseLeave,
    } = props;

    const [needFocusValueButton, setNeedFocusValue] = React.useState<boolean>(false);

    const handleMouseLeave = React.useCallback(() => {
        if (needFocusValueButton) {
            setNeedFocusValue(false);
            setTimeout(valueButtonRef.current?.focus, 0);

        }
    }, [valueButtonRef, needFocusValueButton]);

    const valueItem = items.find(item => getValue(item) === value);
    return (
        <div
            ref={containerRef}
            className={classNames(className, "select-drop", {
                'select-drop-open': open || _open,
            })}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
        >
            <Button
                ref={valueButtonRef}
                onMouseEnter={onValueMouseEnter}
                onMouseLeave={onValueMouseLeave}
                className={"select-drop-value"}
                onKeyPress={handleKeyPress}
                onBlur={handleValueButtonBlur}
                onFocus={handleValueButtonFocus}
            >
                {valueItem ? getText(valueItem) : (nullText || "null")}
            </Button>
            <SelectButtons
                ref={selectButtonsRef}
                {...props}
                onChange={handleChange}
                onFocus={handleSelectButtonFocus}
                onBlur={handleSelectButtonBlur}
                className={"select-drop-items"}
            />
        </div>
    );
});
