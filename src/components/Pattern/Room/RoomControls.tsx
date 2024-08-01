import * as React from "react";
import cn from "classnames";
import {InputText} from "../../_shared/inputs/InputText";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import {createRoom, leaveRoom, setDrawer} from "../../../store/patterns/room/actions";
import './roomControls.scss';
import {WithTranslation, withTranslation} from "react-i18next";
import {Chat} from "./Chat";
import {ButtonHK} from "../../_shared/buttons/hotkeyed/ButtonHK";

export interface RoomControlsStateProps {
    connected: string
    drawer: string
    meDrawer: boolean
    members: number
}

export interface RoomControlsActionProps {
    createRoom(patternId: string, roomName: string)

    leaveRoom(patternId: string)

    setDrawer(patternId: string)
}

export interface RoomControlsOwnProps {
    patternId: string
}

export interface RoomControlsProps extends RoomControlsStateProps, RoomControlsActionProps, RoomControlsOwnProps, WithTranslation {

}

export interface RoomControlsState {

}

export interface RoomControlsProps {

}

export interface RoomControlsState {
    roomName?: string
}

export class RoomControlsComponent extends React.PureComponent<RoomControlsProps, RoomControlsState> {
    state = {
        roomName: "",
    };

    handleCreateRoom = () => {
        const {createRoom, patternId} = this.props;
        createRoom(patternId, this.state.roomName);
    };

    handleLeaveRoom = () => {
        const {leaveRoom, patternId} = this.props;
        leaveRoom(patternId);
    };

    handleSetDrawer = () => {
        const {setDrawer, patternId} = this.props;
        setDrawer(patternId);
    };

    passInputRef;

    constructor(props) {
        super(props);

        this.passInputRef = React.createRef();
    }

    componentDidMount() {
        setTimeout(this.passInputRef.current.focus, 0);
    }

    componentWillUnmount() {
        this.handleLeaveRoom();
    }

    handleKeyPress = (e) => {
        if (e.key === 'Enter' && this.state.roomName) {
            this.handleCreateRoom();
        }
    }

    render() {
        const {connected, t, patternId, meDrawer, members} = this.props;
        return (
            <div className={cn('room-controls', {
                'me-drawer': meDrawer
            })}>
                {connected && (<>
                    <Chat
                        members={members}
                        patternId={patternId}
                    />
                </>)}
                <div className={'room-enter'}>
                    {!connected ? (<>
                        <InputText
                            ref={this.passInputRef}
                            disabled={!!connected}
                            value={this.state.roomName}
                            onKeyPress={this.handleKeyPress}
                            onChange={roomName => this.setState({roomName})}/>
                        <ButtonHK
                            disabled={!this.state.roomName}
                            onClick={this.handleCreateRoom}
                        >{t('room.enter')}</ButtonHK>
                    </>) : (<>

                        <div
                            className={'room-name'}>
                            <span>{this.state.roomName}</span> {members ? <small>({members})</small> : <small>{t('room.connecting')}...</small>}
                        </div>
                        <ButtonHK
                            className={'room-delete'}
                            disabled={!this.state.roomName}
                            onDoubleClick={this.handleLeaveRoom}
                        >{t('room.leave')}</ButtonHK>
                    </>)}
                </div>
            </div>
        );
    }
}

const mapStateToProps: MapStateToProps<RoomControlsStateProps, RoomControlsOwnProps, AppState> = (state, {patternId}) => ({
    connected: state.patterns[patternId].room?.value?.connected,
    drawer: state.patterns[patternId].room?.value?.drawer,
    meDrawer: state.patterns[patternId].room?.value?.meDrawer,
    members: state.patterns[patternId].room?.value?.members,
});

const mapDispatchToProps: MapDispatchToProps<RoomControlsActionProps, RoomControlsOwnProps> = {
    createRoom,
    leaveRoom,
    setDrawer
};

export const RoomControls = connect<RoomControlsStateProps, RoomControlsActionProps, RoomControlsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation("common")(RoomControlsComponent));
