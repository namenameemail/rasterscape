import * as React from "react";
import cn from "classnames";
import {Button, ButtonProps} from "../../simple/Button";
import {WithTranslation, withTranslation} from "react-i18next";
import './styles.scss';

export interface DeleteButtonProps extends WithTranslation, ButtonProps {
    title: string
    deleteText: string
}

export const DeleteButtonComponent: React.FC<DeleteButtonProps> = (props) => {

    const {
        title,
        deleteText,
        className,
        ...buttonProps
    } = props;

    return (
        <div className={cn('delete-title-button')}>
            <Button className={'delete-title'}>{title}</Button>
            <Button
                {...buttonProps}
                className={'delete-button'}>{deleteText}</Button>
        </div>
    );
};

export const DeleteButton = withTranslation('common')(DeleteButtonComponent);