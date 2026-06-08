import * as React from "react";
import {Button} from "../_shared/buttons/simple/Button";
import {HistoryValue} from "../../store/patterns/history/types";
import {useTranslation} from 'react-i18next';
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../store";
import {redo, undo} from "../../store/patterns/history/actions";
import {isMeDrawer} from "../../store/patterns/room/helpers";
import {ButtonHK} from "../_shared/buttons/hotkeyed/ButtonHK";

export interface HistoryControlsStateProps {
    history: HistoryValue
    isVideoPlaying: boolean
    isPlatformerPlaying: boolean
    meDrawer: boolean
}

export interface HistoryControlsActionProps {

    redo(id: string)

    undo(id: string)

}

export interface HistoryControlsOwnProps {
    patternId: string

}

export interface HistoryControlsProps extends HistoryControlsStateProps, HistoryControlsActionProps, HistoryControlsOwnProps {

}

export const HistoryControlsComponent: React.FC<HistoryControlsProps> = (props) => {

    const {
        meDrawer,
        undo,
        redo,
        history,
        isVideoPlaying,
        isPlatformerPlaying,
        patternId,
    } = props;

    const isPlaybackActive = isVideoPlaying || isPlatformerPlaying;

    const onUndo = React.useCallback(() => {
        undo(patternId);
    }, [patternId]);

    const onRedo = React.useCallback(() => {
        redo(patternId);
    }, [patternId]);

    const {t} = useTranslation("common");
    return (
        <div className={'flex-col history-controls'}>
            <ButtonHK
                onClick={onUndo}
                disabled={!history.before.length || isPlaybackActive || !meDrawer}
                width={70}>
                <span>{t('patternControls.undo')}</span> <small>{history.before.length ? `(${history.before.length})` : ""}</small>
            </ButtonHK>
            <ButtonHK
                onClick={onRedo}
                disabled={!history.after.length || isPlaybackActive || !meDrawer}
                width={70}>
                <span>{t('patternControls.redo')}</span> <small>{history.after.length ? `(${history.after.length})` : ""}</small>
            </ButtonHK>
        </div>
    );
};

const mapStateToProps: MapStateToProps<HistoryControlsStateProps, HistoryControlsOwnProps, AppState> = (state, {patternId}) => ({
    history: state.patterns[patternId]?.history.value,
    isVideoPlaying: state.patterns[patternId]?.video?.params.updatingOn,// && !state.patterns[patternId]?.video?.params.pause,
    isPlatformerPlaying: state.patterns[patternId]?.platformer?.params.playingOn,
    meDrawer: isMeDrawer(state.patterns[patternId].room?.value)
});

const mapDispatchToProps: MapDispatchToProps<HistoryControlsActionProps, HistoryControlsOwnProps> = {
    redo,
    undo,
};

export const HistoryControls = connect<HistoryControlsStateProps, HistoryControlsActionProps, HistoryControlsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(HistoryControlsComponent);
