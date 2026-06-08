import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../store";
import {
    addPattern,
    removePattern
} from "../store/patterns/actions";
import {Pattern} from "./Pattern/";
import {PatternConfig} from "../store/patterns/pattern/types";
import {setMaskParams} from "../store/patterns/mask/actions";
import {updateSelection} from "../store/patterns/selection/actions";
import {load, save} from "../store/patterns/import/actions";
import {setHeight, setWidth} from "../store/patterns/pattern/actions";
import {MaskParams} from "../store/patterns/mask/types";
import {Segments} from "../store/patterns/selection/types";
import {withTranslation, WithTranslation} from "react-i18next";
import {setActivePattern} from "../store/activePattern";
import {PatternNavigationBar} from "./PatternNavigationBar";
import cn from "classnames";
import '../styles/patternWorkspace.scss';

export interface PatternsStateProps {
    patternsIds: string[]
    activePatternId: string | null
}

export interface PatternsActionProps {
    addPattern(config?: PatternConfig)

    removePattern(id: string)

    setMaskParams(id: string, params: MaskParams)

    updateSelection(id: string, value: Segments, bBox: SVGRect)

    setWidth(id: string, value: number)

    setHeight(id: string, value: number)


    save(id: string)

    load(id: string, image)

    setActivePattern: typeof setActivePattern

}

export interface PatternsOwnProps {

}

export interface PatternsProps extends PatternsStateProps, PatternsActionProps, PatternsOwnProps, WithTranslation {

}

export interface PatternsState {

}

class PatternsComponent extends React.PureComponent<PatternsProps, PatternsState> {

    componentDidMount(): void {
        this.ensureActivePattern(this.props);
    }

    componentDidUpdate(prevProps: Readonly<PatternsProps>): void {
        if (
            prevProps.patternsIds !== this.props.patternsIds ||
            prevProps.activePatternId !== this.props.activePatternId
        ) {
            this.ensureActivePattern(this.props);
        }
    }

    ensureActivePattern = ({patternsIds, activePatternId, setActivePattern}: PatternsProps) => {
        if (!patternsIds.length) {
            if (activePatternId !== null) {
                setActivePattern(null);
            }
            return;
        }

        if (!activePatternId || !patternsIds.includes(activePatternId)) {
            setActivePattern(patternsIds[0]);
        }
    };

    render() {
        const {
            patternsIds, removePattern,
            updateSelection, setWidth,
            setHeight,
            save, load,
            activePatternId,
            t,
        } = this.props;
        return (
            <div className="pattern-workspace">
                <div className="pattern-stage">
                    {patternsIds.length === 0 && (
                        <div className="pattern-stage-empty">{t("add")}</div>
                    )}
                    {patternsIds.map((id, index) => {
                        return (
                            <div
                                key={id}
                                className={cn('pattern-slot', {
                                    'pattern-slot--active': id === activePatternId,
                                })}
                            >
                                <Pattern
                                    id={id}
                                    index={index}

                                    onSelectionChange={updateSelection}
                                    onRemove={removePattern}
                                    onSetWidth={setWidth}
                                    onSetHeight={setHeight}

                                    onSave={save}
                                    onLoad={load}
                                />
                            </div>
                        );
                    })}
                </div>
                <PatternNavigationBar/>
            </div>
        );
    }
}


const mapStateToProps: MapStateToProps<PatternsStateProps, {}, AppState> = state => ({
    patternsIds: Object.keys(state.patterns),
    activePatternId: state.activePattern.patternId,
});

const mapDispatchToProps: MapDispatchToProps<PatternsActionProps, PatternsOwnProps> = {
    setMaskParams,
    addPattern,
    removePattern,
    updateSelection,
    setWidth,
    setHeight,
    save,
    load,
    setActivePattern,
};

export const Patterns = connect<PatternsStateProps, PatternsActionProps, PatternsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation("common")(PatternsComponent));
