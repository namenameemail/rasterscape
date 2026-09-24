import * as React from "react";
import classNames from "classnames";
import "./hover-hideable.scss";
import {HoverHideableLockContext} from "./HoverHideableLockContext";

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
    const [childLocks, setChildLocks] = React.useState(0);
    const parentLock = React.useContext(HoverHideableLockContext);

    const lockApi = React.useMemo(() => ({
        lock: () => {
            setChildLocks(n => n + 1);
            parentLock?.lock();
        },
        unlock: () => {
            setChildLocks(n => Math.max(0, n - 1));
            parentLock?.unlock();
        },
    }), [parentLock]);

    const handleClick = React.useCallback(() => {
        onClick?.();
    }, [onClick]);

    const keepOpen = childLocks > 0;

    return (
        <HoverHideableLockContext.Provider value={lockApi}>
            <div
                onClick={handleClick}
                className={classNames("hover-hideable", {
                    ['hover-hideable-open']: _open || open || keepOpen
                },className)}
                {...otherProps}
            >
                {button}
                <div className={"hover-hideable-hidden-part"}>{children}</div>
            </div>
        </HoverHideableLockContext.Provider>
    );
});
