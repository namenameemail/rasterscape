import * as React from "react";
import cn from "classnames";
import "./hiddenScroll.scss";

export interface HiddenScrollProps {
    children?: React.ReactNode
    className?: string
}

export const HiddenScroll = React.forwardRef<HTMLDivElement, HiddenScrollProps>(({children, className}, ref) => (
    <div ref={ref} className={cn("hidden-scroll", className)}>
        {children}
    </div>
));
