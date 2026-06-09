import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../store";
import {ButtonHK} from "./_shared/buttons/hotkeyed/ButtonHK";
import {DragAndDrop} from "./_shared/File/DragAndDrop/DragAndDrop";
import {PatternSelectItem} from "./PatternsSelect";
import {getPatternsSelectItems, patternHasBackgroundActivity} from "../store/patterns/selectors";
import {setActivePattern, PATTERN_DELETE_HOLD_MS} from "../store/activePattern";
import {addPattern} from "../store/patterns/actions";
import {PatternConfig} from "../store/patterns/pattern/types";
import {HiddenScroll} from "./_shared/HiddenScroll";
import {readImageFile} from "./_shared/File/helpers";
import {imageToImageData} from "../utils/canvas/helpers/imageData";
import {withTranslation, WithTranslation} from "react-i18next";
import '../styles/patternNavigationBar.scss';

export interface PatternNavigationBarStateProps {
    patternsSelectItems: ReturnType<typeof getPatternsSelectItems>
    activePatternId: string | null
    deleteHoldPatternId: string | null
    backgroundActivityById: Record<string, boolean>
}

export interface PatternNavigationBarActionProps {
    setActivePattern: typeof setActivePattern
    addPattern(config?: PatternConfig)
}

export interface PatternNavigationBarOwnProps {
}

export interface PatternNavigationBarProps
    extends PatternNavigationBarStateProps,
        PatternNavigationBarActionProps,
        PatternNavigationBarOwnProps,
        WithTranslation {
}

const PatternNavigationBarComponent: React.FC<PatternNavigationBarProps> = (props) => {
    const {
        patternsSelectItems,
        activePatternId,
        deleteHoldPatternId,
        backgroundActivityById,
        setActivePattern,
        addPattern,
    } = props;

    const handleSelect = React.useCallback((id: string) => {
        setActivePattern(id);
    }, [setActivePattern]);

    const handleAddClick = React.useCallback(() => {
        addPattern({history: true, selection: true, repeating: false});
    }, [addPattern]);

    const handleCreatePatternFromFile = React.useCallback(async (files) => {
        const image = await readImageFile(files?.[0]);
        addPattern?.({
            startImage: imageToImageData(image),
            history: true,
            selection: true,
            repeating: false
        });
    }, [addPattern]);

    const scrollRef = React.useRef<HTMLDivElement>(null);
    const prevPatternCountRef = React.useRef(patternsSelectItems.length);
    const [showOverflowCount, setShowOverflowCount] = React.useState(false);

    const updateScrollState = React.useCallback(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) {
            return;
        }

        const hasOverflow = scrollEl.scrollHeight > scrollEl.clientHeight + 1;
        const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;
        setShowOverflowCount(hasOverflow && !atBottom);
    }, []);

    const scrollToEnd = React.useCallback(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) {
            return;
        }

        scrollEl.scrollTop = scrollEl.scrollHeight;
        updateScrollState();
    }, [updateScrollState]);

    React.useLayoutEffect(() => {
        if (patternsSelectItems.length > prevPatternCountRef.current) {
            scrollToEnd();
        }
        prevPatternCountRef.current = patternsSelectItems.length;
    }, [patternsSelectItems.length, scrollToEnd]);

    React.useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) {
            return;
        }

        updateScrollState();

        scrollEl.addEventListener('scroll', updateScrollState, {passive: true});

        const resizeObserver = new ResizeObserver(updateScrollState);
        resizeObserver.observe(scrollEl);
        if (scrollEl.firstElementChild) {
            resizeObserver.observe(scrollEl.firstElementChild);
        }

        return () => {
            scrollEl.removeEventListener('scroll', updateScrollState);
            resizeObserver.disconnect();
        };
    }, [patternsSelectItems.length, updateScrollState]);

    return (
        <div className="pattern-nav-bar">
            <HiddenScroll ref={scrollRef} className="pattern-nav-scroll">
                <DragAndDrop
                    onDrop={handleCreatePatternFromFile}
                    className="pattern-nav-thumbnails"
                >
                    {patternsSelectItems.map(({width, height, id}, index) => (
                        <div key={id} className="pattern-nav-item">
                            <span className="pattern-nav-number">{index + 1}</span>
                            <div className="pattern-nav-thumb">
                                <PatternSelectItem
                                    index={index}
                                    name="navigation"
                                    id={id}
                                    HK={false}
                                    rowBreak={false}
                                    width={width}
                                    height={height}
                                    selected={id === activePatternId}
                                    onSelect={handleSelect}
                                />
                                {backgroundActivityById[id] && <span className="pattern-nav-dot"/>}
                                {deleteHoldPatternId === id && (
                                    <span
                                        className="pattern-nav-delete-hold"
                                        style={{animationDuration: `${PATTERN_DELETE_HOLD_MS}ms`}}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </DragAndDrop>
            </HiddenScroll>
            <div className="pattern-nav-add">
                {showOverflowCount ? (
                    <span className="pattern-nav-total">{patternsSelectItems.length}</span>
                ) : (
                    <span className="pattern-nav-number pattern-nav-number--spacer" aria-hidden="true"/>
                )}
                <ButtonHK
                    className="pattern-nav-add-button"
                    width={42}
                    onClick={handleAddClick}
                >
                    +
                </ButtonHK>
            </div>
        </div>
    );
};

const mapStateToProps: MapStateToProps<PatternNavigationBarStateProps, PatternNavigationBarOwnProps, AppState> = state => {
    const patternsSelectItems = getPatternsSelectItems(state);
    const backgroundActivityById: Record<string, boolean> = {};

    patternsSelectItems.forEach(({id}) => {
        backgroundActivityById[id] = patternHasBackgroundActivity(state.patterns[id]);
    });

    return {
        patternsSelectItems,
        activePatternId: state.activePattern.patternId,
        deleteHoldPatternId: state.activePattern.deleteHoldPatternId,
        backgroundActivityById,
    };
};

const mapDispatchToProps: MapDispatchToProps<PatternNavigationBarActionProps, PatternNavigationBarOwnProps> = {
    setActivePattern,
    addPattern,
};

export const PatternNavigationBar = connect<PatternNavigationBarStateProps, PatternNavigationBarActionProps, PatternNavigationBarOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation("common")(PatternNavigationBarComponent));
