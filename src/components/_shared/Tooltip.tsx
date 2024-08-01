import * as React from "react";
import '../../styles/tooltip.scss';
import classNames from "classnames";

export interface TooltipProps {
    translate?: any
    children?
    message?
    secondaryMessage?
    offsetY?
    offsetX?
    getY?
    getX?
    component?
    componentProps?
    className?
}

export const Tooltip: React.FC<TooltipProps> = ({secondaryMessage, getX, getY, className, children, message, offsetY = 10, offsetX = 0, component: Component, componentProps}) => {
    const tooltip = React.useRef<any>(null);

    React.useEffect(() => {
        // tooltip.current.style.display = 'none';
        return () => {
            window.removeEventListener('mousemove', listener);
        }
    }, []);

    const listener = (e) => {
        if (!tooltip?.current) return;

        var x = e.clientX,
            y = e.clientY;
        tooltip.current.style.top = (getY ? getY(x, y) : (y + offsetY)) + 'px';
        tooltip.current.style.left = (getX ? getX(x, y) : (x + offsetX)) + 'px';
    };
    const enter = React.useCallback(() => {
        window.addEventListener('mousemove', listener);

        if (!tooltip?.current) return;
        tooltip.current.style.display = 'flex';
    }, [tooltip]);
    const leave = React.useCallback(() => {
        window.removeEventListener('mousemove', listener);

        if (!tooltip?.current) return;
        tooltip.current.style.display = 'none';
    }, [tooltip]);

    return (
        <div
            className={classNames('tooltip-wrapper')}
            onMouseEnter={enter}
            onMouseLeave={leave}>
            {children}
            <div
                className={classNames('tooltip', className)}
                ref={tooltip}>{Component
                ? <Component {...componentProps}/>
                : (<>
                    <div><span>{message}</span></div>
                    {secondaryMessage && <div className={'small-text-help subheader-help'}>{secondaryMessage}</div>}
                </>)
                }</div>
        </div>
    );
};