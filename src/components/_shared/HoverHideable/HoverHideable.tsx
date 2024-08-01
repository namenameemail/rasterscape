import * as React from "react";
import classNames from "classnames";
import "./hover-hideable.scss";

export interface HoverHideableProps {
    open?: boolean
    children?: React.ReactNode
    button?: React.ReactNode
    className?: string
    onClick?()
    [prop: string]: any
}

export interface HoverHideableImperativeHandlers {

}

export const HoverHideable: React.FC<HoverHideableProps> = ((props, ) => {

    const {children, button, className, onClick, open, ...otherProps} = props;

    const [_open, setOpen] = React.useState<boolean>(false);

    const handleClick = React.useCallback(() => {
        onClick?.();
    }, [onClick]);

    // const hadleEscape
    // const handleKeyPress = React.useCallback((e) => {
    //     if (e.key === 'Enter') {
    //         setOpen(true);
    //
    //
    //         // document.get
    //         document.addEventListener('keypress', (e) => {
    //             if (e.key === 'Escape') {
    //
    //             }
    //         });
    //     }
    // }, [setOpen]);

    return (
        <div
            onClick={handleClick}
            // onKeyPress={handleKeyPress}
            className={classNames("hover-hideable", {
                ['hover-hideable-open']: _open || open
            },className)}
            {...otherProps}
        >
            {button}
            <div className={"hover-hideable-hidden-part"}>{children}</div>
        </div>
    );
});