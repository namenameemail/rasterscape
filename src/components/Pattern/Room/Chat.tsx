import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import {InputText} from "../../_shared/inputs/InputText";
import {WithTranslation, withTranslation} from "react-i18next";
import {resetUnreaded, sendMessage, SendMessageAction, setDrawer} from "../../../store/patterns/room/actions";
import classNames from "classnames";
import {Resizable} from "../../_shared/Resizable";
import {ButtonHK} from "../../_shared/buttons/hotkeyed/ButtonHK";
import {Message} from "../../../store/patterns/room/types";
import {getMessageComponent} from "./messages";

export interface ChatStateProps {
    messages: Message[]
    meDrawer: boolean
    drawer: string
    unreaded: boolean
    persistentMessagePart: string
}

export interface ChatActionProps {
    sendMessage(id: string, message: string)

    setDrawer(patternId: string, persist?: boolean)

    resetUnreaded(patternId: string)
}

export interface ChatOwnProps {
    patternId: string
    members: number
}

export interface ChatProps extends ChatStateProps, ChatActionProps, ChatOwnProps, WithTranslation {

}

const ChatComponent: React.FC<ChatProps> = (props) => {

    const {
        t, patternId, members,
        sendMessage,
        messages,
        meDrawer,
        drawer,
        setDrawer,
        unreaded,
        resetUnreaded,
        persistentMessagePart
    } = props;

    const inputRef = React.useRef<any>(null);

    const [leftHistory, setLeftHistory] = React.useState([]);
    const [historyN, setHistoryN] = React.useState(-1);

    React.useEffect(() => {
        setTimeout(inputRef.current?.focus, 0);
    }, [inputRef]);

    const [message, setMessage] = React.useState(persistentMessagePart);

    const handleSend = React.useCallback(() => {

        const {leftPersistent, left}: SendMessageAction = sendMessage(patternId, message);

        if (left) {
            setLeftHistory([
                left,
                ...leftHistory.filter(item => item !== left),
            ]);
        }
        setHistoryN(-1);

        setMessage('');
        setTimeout(setMessage, 0, leftPersistent);

    }, [patternId, message, leftHistory]);

    const handleKeyPress = React.useCallback((e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    }, [handleSend]);

    const handleKeyDown = React.useCallback((e) => {
        if (e.keyCode === 38) {
            e.preventDefault();

            const command = leftHistory[historyN + 1];
            if (command) {
                setMessage(command + ' >');
                setHistoryN(historyN + 1)
            }

        }
        else if (e.keyCode === 40) {
            e.preventDefault();

            if (historyN > 0) {
                const command = leftHistory[historyN - 1];
                if (command) {
                    setMessage(command + ' >');
                    setHistoryN(historyN - 1)
                }
            } else if (historyN === 0) {
                setMessage(persistentMessagePart);
                setHistoryN(historyN - 1)
            }
        }
    }, [historyN, leftHistory, message, persistentMessagePart]);

    const handleSetDrawer = React.useCallback(() => {

        // if (meDrawer) {
        //     setTimeout(() => inputRef.current?.focus(), 10);
        // }

        setDrawer(patternId, true);
    }, [setDrawer, patternId, meDrawer, inputRef]);

    const handleMouseEnter = React.useCallback(() => {
        unreaded && resetUnreaded(patternId);
    }, [resetUnreaded, patternId, unreaded]);

    return (
        <Resizable
            height={60}
            minHeight={60}
            wrapperClassName={classNames('room', {unread: unreaded})}
            renderOnMinHeight
        >
            <div
                className='room-chat'
                onMouseEnter={handleMouseEnter}>
                <div className={'chat-controls'}>
                    {!meDrawer && (<div className={'room-chat-new-message'}>
                        <InputText
                            ref={inputRef}
                            disabled={meDrawer}
                            maxLength={99}
                            className='room-chat-message-input'
                            value={message}
                            onChange={setMessage}
                            onKeyPress={handleKeyPress}
                            onKeyDown={handleKeyDown}
                        />
                    </div>)}
                    <ButtonHK
                        path={`p${patternId}.room.draw`}
                        hkLabel={'room.hotkeysDescription.draw'}
                        hkData1={patternId}
                        className={'draw-button'}
                        disabled={(!!drawer && !meDrawer) || !members}
                        selected={meDrawer}
                        onClick={handleSetDrawer}
                    >{t('room.draw')}</ButtonHK>
                </div>

                <div className='room-chat-messages'>

                    <div className='room-chat-messages-container'>
                        {messages.map((message, index) => {

                            const Message = getMessageComponent(message.data);
                            return (
                                <Message
                                    key={index}
                                    data={message.data}
                                    unreaded={message.unreaded}
                                    // t={t}
                                />
                            );
                        })}
                    </div>
                </div>

                {/*{(unreaded) ? (*/}
                {/*    <div className={'message-counter'}>{unreaded}</div>*/}
                {/*) : null}*/}
            </div>
        </Resizable>
    );
};

const mapStateToProps: MapStateToProps<ChatStateProps, ChatOwnProps, AppState> = (state, {patternId}) => ({
    messages: state.patterns[patternId].room.value?.messages || [],
    meDrawer: state.patterns[patternId].room?.value?.meDrawer,
    drawer: state.patterns[patternId].room?.value?.drawer,
    unreaded: state.patterns[patternId].room?.value?.unreaded,
    persistentMessagePart: state.patterns[patternId].room?.value?.persistentMessagePart,
});

const mapDispatchToProps: MapDispatchToProps<ChatActionProps, ChatOwnProps> = {
    sendMessage,
    setDrawer,
    resetUnreaded
};

export const Chat = connect<ChatStateProps, ChatActionProps, ChatOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(ChatComponent));