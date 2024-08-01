import * as React from "react";
import './styles.scss';
import cn from "classnames";

export interface BaseMessageProps {
    children?: React.ReactNode
    unreaded?: boolean
    className?: string
}

export const BaseMessage: React.FC<BaseMessageProps> = (props) => {

    const {
        className,
        unreaded,
        children
    } = props;

    return (
        <div
            className={cn('room-chat-message', {
                ['unreaded']: unreaded
            }, className)}
        >
            <span>{children}</span>
        </div>
    );
};