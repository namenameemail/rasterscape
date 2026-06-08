import * as React from "react";
import cn from "classnames";
import "./hiddenScroll.scss";

export interface HiddenScrollProps {
    children?: React.ReactNode
    className?: string
}

export const HiddenScroll: React.FC<HiddenScrollProps> = ({children, className}) => (
    <div className={cn("hidden-scroll", className)}>
        {children}
    </div>
);
