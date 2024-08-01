import * as React from "react";
import './styles.scss';
import cn from "classnames";

export interface ResizableProps {
    children: any
    height: number
    minHeight: number
    maxHeight?: number
    className?: string
    wrapperClassName?: string
    renderOnMinHeight?: boolean
    renderOnZeroHeight?: boolean
}

export const Resizable: React.FC<ResizableProps> = (props) => {

    const {children, height, className, wrapperClassName, renderOnZeroHeight, renderOnMinHeight, minHeight, maxHeight} = props;

    const [_height, setHeight] = React.useState(height);
    const startEvent = React.useRef(null);

    React.useEffect(() => {
        setHeight(height)
    }, [height]);

    const containerStyle = React.useMemo(() => {
        return ({
            height: _height
        })
    }, [_height]);

    const moveHandler = React.useCallback((e) => {
        const newHeight = _height + startEvent.current - e.pageY;
        if (((minHeight === undefined || minHeight === null) ? true : newHeight >= minHeight)
            && ((maxHeight === undefined || maxHeight === null) ? true : newHeight <= maxHeight)) {
            setHeight(_height + startEvent.current - e.pageY);
        }
        if (newHeight < minHeight) {
            setHeight(minHeight);
        }
        if (newHeight > maxHeight) {
            setHeight(maxHeight);
        }
    }, [_height, minHeight, maxHeight]);

    const upHandler = React.useCallback(() => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        startEvent.current = null;
    }, [moveHandler]);

    const handlerDown = React.useCallback((e) => {
        startEvent.current = e.pageY;
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }, [_height]); //?

    return (
        <div className={cn('resizable-wrapper', wrapperClassName)}>
            <div
                className={'resizable-handler-top'}
                onMouseDown={handlerDown}
            />
            <div
                className={cn('resizable', className)}
                style={containerStyle}
            >
                {
                    (_height || renderOnZeroHeight)
                    && (_height !== minHeight || renderOnMinHeight)
                    && children
                }
            </div>
        </div>
    );
};
