import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState, useDispatch} from "../store";
import {getPatternsSelectItems} from "../store/patterns/selectors";
import '../styles/patternSelect.scss';
import {ChannelImageData} from "./_shared/canvases/WebWorkerCanvas";
import {ButtonHK, ButtonHKImperativeHandlers} from "./_shared/buttons/hotkeyed/ButtonHK";
import {KeyTrigger} from "./Hotkeys/simple/KeyTrigger";
import {bindPreview, unbindPreview} from "../store/patterns/pattern/actions";
import {FC, useEffect} from "react";

export interface PatternsSelectStateProps {
    patternsSelectItems: any[]
}

export interface PatternsSelectActionProps {
}

export interface PatternsSelectOwnProps {
    nullable?: boolean
    name?: string
    value?: string | string []

    onChange(value: string | string [], added: string, removed: string)

    HK?: boolean
    path?: string
    hkLabel?: string

    blurOnClick?: boolean

    excludePatternId?: string
}

export interface PatternsSelectProps extends PatternsSelectStateProps, PatternsSelectActionProps, PatternsSelectOwnProps {

}

const PatternsSelectComponent: React.FC<PatternsSelectProps> = (props) => {
    const {
        patternsSelectItems,
        value,
        onChange,
        name,
        HK = true,
        hkLabel,
        path,
        nullable,
        blurOnClick,
        excludePatternId,
    } = props;

    const items = excludePatternId
        ? patternsSelectItems.filter(({id}) => id !== excludePatternId)
        : patternsSelectItems;

    const action = React.useCallback((id) => {
        const selected = Array.isArray(value) ? value?.includes(id) : (id === value);
        if (Array.isArray(value)) {

            if (selected) {
                onChange(
                    (value as string[]).filter(name => name !== id),
                    null, id
                );
            } else {
                onChange(
                    [...value as string[], id],
                    id, null
                );
            }

        } else {
            if (selected && nullable) {
                onChange(null, null, id);
            } else {
                onChange(id, id, null);
            }
        }
    }, [onChange, value, nullable]);

    return (
        <div className={'pattern-select'}>
            {items.map(({width, height, id}, i) => {
                return (
                    <PatternSelectItem
                        index={i}
                        name={name}
                        id={id}
                        HK={HK}
                        hkLabel={hkLabel}
                        width={width}
                        height={height}
                        selected={Array.isArray(value) ? value?.includes(id) : (id === value)}
                        blurOnClick={blurOnClick}
                        onSelect={action}
                    />
                );
            })}
        </div>
    );
};

export interface PatternSelectItemProps {
    id: string
    name: string
    HK?: boolean
    path?: string
    hkLabel?: string

    blurOnClick?: boolean

    width: number,
    height: number
    index: number
    selected: boolean
    rowBreak?: boolean
    onSelect(id: string): void
}

export const PatternSelectItem: FC<PatternSelectItemProps> = (props) => {
    const {id, HK, name, hkLabel, width, height, selected, index, onSelect, blurOnClick, rowBreak = true} = props;

    const previewId = id + ' ' + name + ' ' + index;

    const buttonRef = React.useRef<ButtonHKImperativeHandlers>(null);

    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);


    const dispatch = useDispatch();

    const handleCanvasRef = React.useCallback((canvas: HTMLCanvasElement) => {
        canvasRef.current = canvas;
        if (canvas) dispatch(bindPreview(id, previewId, canvas));
    }, [previewId]);

    useEffect(() => () => {
        dispatch(unbindPreview(id, previewId));
    }, [previewId])

    const handleClick = React.useCallback((data) => {
        const {value: id} = data;
        onSelect(id);

        if (blurOnClick)
            buttonRef.current?.blur();
    }, [blurOnClick, onSelect]);

    const handlePress = React.useCallback((e, id) => {
        onSelect(id);
    }, [onSelect]);
    return (
        <>
            <ButtonHK
                key={id}
                ref={buttonRef}
                path={HK ? `patternSelect.${name}.${id}` : null}
                hkLabel={hkLabel}
                hkData1={id}
                className={'pattern-select-button'}
                width={42} height={42}
                value={id}
                onClick={handleClick}
                maxKeysCount={2}
                selected={selected}
            >
                <canvas
                    width={40}
                    height={40}
                    ref={handleCanvasRef}/>
                {HK && (
                    <KeyTrigger
                        debug
                        keyValue={(index + 1).toString()}
                        codeValue={(index + 1).toString()}
                        name={id}
                        onPress={handlePress}
                    />
                )}
            </ButtonHK>
            {rowBreak && !((index + 1) % 5) ? <br/> : null}
        </>
    )
};

const mapStateToProps: MapStateToProps<PatternsSelectStateProps, PatternsSelectOwnProps, AppState> = state => ({
    patternsSelectItems: getPatternsSelectItems(state),
});

const mapDispatchToProps: MapDispatchToProps<PatternsSelectActionProps, PatternsSelectOwnProps> = {};

export const PatternsSelect = connect<PatternsSelectStateProps, PatternsSelectActionProps, PatternsSelectOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(PatternsSelectComponent);
