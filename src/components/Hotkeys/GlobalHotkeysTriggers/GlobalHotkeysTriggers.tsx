import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import {AppHotkeyTrigger} from "./AppHotkeyTrigger";
import {redo, undo} from "../../../store/patterns/history/actions";
import {settingMode} from "../../../store/hotkeys/actions";
import {setFullScreen} from "../../../store/fullscreen";
import {toggleDemonstration} from "../../../store/patterns/demonstration/actions";
import {offOptimization, onOptimization} from "../../../store/optimization";
import {getImageFromClipboard} from "../../../utils/clipboard";
import {load, save} from "../../../store/patterns/import/actions";
import {copyPatternToClipboard, doublePattern} from "../../../store/patterns/pattern/actions";
import {
    clearSelectionIn,
    cutSelectionInToClipboard,
    selectAll,
    updateSelection
} from "../../../store/patterns/selection/actions";
import {PatternConfig} from "../../../store/patterns/pattern/types";
import {addPattern} from "../../../store/patterns/actions";
import {setActivePattern} from "../../../store/activePattern";
import {imageToImageData} from "../../../utils/canvas/helpers/imageData";
import {Segments} from "../../../store/patterns/selection/types";

export interface GlobalHotkeysStateProps {
    activePatternId: string | null
    patternIds: string[]
    isSettingMode: boolean
    full: boolean
    optimization: boolean
}

export interface GlobalHotkeysActionProps {
    undo: typeof undo
    redo: typeof redo
    settingMode: typeof settingMode
    setFullScreen: typeof setFullScreen
    toggleDemonstration: typeof toggleDemonstration
    onOptimization: typeof onOptimization
    offOptimization: typeof offOptimization

    cutPatternSelection(id)

    addPattern(config?: PatternConfig)

    cutPatternSelectionToClipboard(id)

    selectAll(id)

    updateSelection: (id: string, value: Segments, bBox: SVGRect) => any
    load: typeof load
    save: typeof save
    doublePattern: (id: string) => void
    copyToClipboard
    setActivePattern: typeof setActivePattern
}

export interface GlobalHotkeysOwnProps {

}

export interface GlobalHotkeysProps extends GlobalHotkeysStateProps, GlobalHotkeysActionProps, GlobalHotkeysOwnProps {

}

const GlobalHotkeysComponent: React.FC<GlobalHotkeysProps> = (props) => {

    const {
        activePatternId,
        patternIds,
        undo,
        redo,
        isSettingMode,
        settingMode,
        full,
        setFullScreen,
        toggleDemonstration,

        optimization,
        onOptimization,
        offOptimization,
        cutPatternSelection,
        cutPatternSelectionToClipboard,
        updateSelection,
        load,
        save,
        doublePattern,
        addPattern,
        copyToClipboard,
        selectAll,
        setActivePattern,
    } = props;

    const receiveImageFromClipboard = React.useCallback((event) => {
        getImageFromClipboard(event, (image) => {
            if (activePatternId) {
                load(activePatternId, image);
            } else {
                addPattern?.({
                    startImage: imageToImageData(image),
                    history: true,
                    selection: true,
                    repeating: false
                });
            }
        })
    }, [activePatternId, load, addPattern])

    React.useEffect(() => {
        document.addEventListener('paste', receiveImageFromClipboard);
        return () => {
            document.removeEventListener('paste', receiveImageFromClipboard);
        };
    }, [activePatternId]);

    const copyImageToClipboard = React.useCallback((e) => {
        console.log(!window.getSelection().toString());
        if (!window.getSelection().toString()) {
            activePatternId && copyToClipboard(activePatternId);
        }
    }, [activePatternId, copyToClipboard])

    React.useEffect(() => {
        document.addEventListener('copy', copyImageToClipboard);
        return () => {
            document.removeEventListener('copy', copyImageToClipboard);
        };
    }, [activePatternId]);

    const cutImageToClipboard = React.useCallback((e) => {
        if (!window.getSelection().toString()) {
            activePatternId && cutPatternSelectionToClipboard(activePatternId);
        }
    }, [activePatternId, cutPatternSelectionToClipboard])

    React.useEffect(() => {
        document.addEventListener('cut', cutImageToClipboard);
        return () => {
            document.removeEventListener('cut', cutImageToClipboard);
        };
    }, [activePatternId]);

    const handleUndo = React.useCallback((e, keys) => {
        e.preventDefault();
        activePatternId && undo(activePatternId);
    }, [activePatternId, undo]);

    const handleRedo = React.useCallback((e, keys) => {
        e.preventDefault();
        activePatternId && redo(activePatternId);
    }, [activePatternId, redo]);

    const toggleHotkeys = React.useCallback((e) => {
        e.preventDefault();
        settingMode(!isSettingMode);
    }, [isSettingMode, settingMode]);

    const toggleFullscreen = React.useCallback((e) => {
        e.preventDefault();
        try {
            setFullScreen(!full);
        } catch (e) {
            console.error(e);
        }
    }, [full, setFullScreen]);

    const handleToggleDemonstration = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDemonstration(activePatternId);
    }, [activePatternId, toggleDemonstration]);

    const handleToggleOptimization = React.useCallback((e) => {
        e.preventDefault();
        optimization ? offOptimization() : onOptimization();
    }, [onOptimization, offOptimization, optimization]);

    const handleDeleteSelected = React.useCallback((e) => {
        e.preventDefault();
        cutPatternSelection(activePatternId);
    }, [cutPatternSelection, activePatternId]);

    const handleClearSelection = React.useCallback((e) => {
        e.preventDefault();
        updateSelection(activePatternId, [], null);
    }, [updateSelection, activePatternId]);

    const handleSave = React.useCallback((e) => {
        e.preventDefault();
        save(activePatternId);
    }, [save, activePatternId]);

    const handleCopy = React.useCallback((e) => {
        e.preventDefault();
        doublePattern(activePatternId);
    }, [doublePattern, activePatternId]);

    const handleSelectAll = React.useCallback((e) => {
        e.preventDefault();
        activePatternId && selectAll(activePatternId);
    }, [selectAll, activePatternId]);

    const handleSwitchToPattern = React.useCallback((e) => {
        e.preventDefault();
        const index = +e.key - 1;
        const patternId = patternIds[index];
        if (patternId) {
            setActivePattern(patternId);
        }
    }, [patternIds, setActivePattern]);

    return (
        <>
            <AppHotkeyTrigger
                keys={['command + z', 'ctrl + z']}
                onPress={handleUndo}
            />
            <AppHotkeyTrigger
                keys={['command + shift + z', 'ctrl + shift + z']}
                onPress={handleRedo}
            />
            <AppHotkeyTrigger
                keys={['option + k', 'alt + k']}
                onPress={toggleHotkeys}
            />
            {/*<AppHotkeyTrigger*/}
            {/*    buttons={['option + f', 'alt + f']}*/}
            {/*    onPress={toggleFullscreen}*/}
            {/*/>*/}
            <AppHotkeyTrigger
                keys={['option + w', 'alt + w']}
                onPress={handleToggleDemonstration}
            />
            <AppHotkeyTrigger
                // buttons={['alt + 5']}
                keys={['option + o', 'alt + o']}
                onPress={handleToggleOptimization}
            />
            <AppHotkeyTrigger
                keys={['backspace', 'del']}
                onPress={handleDeleteSelected}
            />
            <AppHotkeyTrigger
                keys={['option + d', 'alt + d']}
                onPress={handleClearSelection}
            />
            <AppHotkeyTrigger
                keys={['option + a', 'alt + a']}
                onPress={handleSelectAll}
            />
            <AppHotkeyTrigger
                keys={['option + s', 'alt + s']}
                onPress={handleSave}
            />
            <AppHotkeyTrigger
                keys={['option + c', 'alt + c']}
                onPress={handleCopy}
            />
            <AppHotkeyTrigger
                keys={[
                    ...'123456789'.split('').map(n => 'option + ' + n),
                    ...'123456789'.split('').map(n => 'alt + ' + n),
                ]}
                onPress={handleSwitchToPattern}
            />
        </>
    );
};

const mapStateToProps: MapStateToProps<GlobalHotkeysStateProps, GlobalHotkeysOwnProps, AppState> = state => ({
    activePatternId: state.activePattern.patternId,
    patternIds: Object.keys(state.patterns),
    isSettingMode: state.hotkeys.setting,
    full: state.fullScreen,
    optimization: state.optimization.on,
});

const mapDispatchToProps: MapDispatchToProps<GlobalHotkeysActionProps, GlobalHotkeysOwnProps> = {
    undo,
    redo,
    settingMode,
    setFullScreen,
    toggleDemonstration,
    onOptimization,
    offOptimization,
    load,
    copyToClipboard: copyPatternToClipboard,
    cutPatternSelection: clearSelectionIn,
    addPattern: addPattern,
    updateSelection: updateSelection,
    cutPatternSelectionToClipboard: cutSelectionInToClipboard,
    selectAll,
    save,
    doublePattern,
    setActivePattern,
};

export const GlobalHotkeysTriggers = connect<GlobalHotkeysStateProps,
    GlobalHotkeysActionProps,
    GlobalHotkeysOwnProps,
    AppState>(
    mapStateToProps,
    mapDispatchToProps
)(GlobalHotkeysComponent);