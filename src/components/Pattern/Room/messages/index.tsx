import * as React from 'react';
import {MessageData, MessageType} from "../../../../store/patterns/room/types";
import {BaseMessage} from "./BaseMessage";
import cn from "classnames";
import {MessageComponentType, translatedMessageWithClass, withT} from "./helpers";
import {ChannelPublicData} from "./ChannelPublicData";
import {ChannelData} from "./ChannelData";
import {LinkMessage} from "./Link";
import {UCImageSent} from "./UCImageSent";
import {SignScoresTable} from "./SignScoresTable";
import {ChannelScoresTable} from "./ChannelScoresTable";
import {Help} from "./Help";


export const getMessageComponent = (data: MessageData): React.ComponentType<any> => {
    if (typeof data === 'string') {
        return MessageComponentByType[MessageType._StringDefault];
    }

    console.log(MessageComponentByType, data.type);

    return (
        MessageComponentByType[data.type] || MessageComponentByType[MessageType.UserMessage]
    );
};


export const MessageComponentByType: {
    [type: string]: MessageComponentType
} = {
    //  зачем это STRING STRING STRING STRING STRING STRING STRING STRING STRING STRING STRING STRING STRING STRING

    [MessageType._StringDefault]: ({data, unreaded}) => (
        <BaseMessage unreaded={unreaded}>{data.text}</BaseMessage>
    ),

    // USER MESSAGE USER MESSAGE USER MESSAGE USER MESSAGE USER MESSAGE USER MESSAGE USER MESSAGE USER MESSAGE

    [MessageType.UserMessage]: ({data: {text, sign}, unreaded}) => (
        <BaseMessage
            unreaded={unreaded}
            className={'user-message'}
        >
            {!!sign && (
                <span className={'sign'}>{sign} </span>
            )}
            <span>{text}</span>
        </BaseMessage>
    ),

    // LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK  LINK

    [MessageType.Link]: LinkMessage,

    [MessageType.UCImageSent]: UCImageSent,


    // HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP
    [MessageType.Help]: Help,

    // SCORES  SCORES  SCORES  SCORES  SCORES  SCORES  SCORES
    [MessageType.SignScoresTable]: SignScoresTable,

    [MessageType.ChannelScoresTable]: ChannelScoresTable,

    // CHANNNEL   DATA   CHANNNEL   DATA   CHANNNEL   DATA   CHANNNEL   DATA

    [MessageType.ChannelData]: ChannelData,
    [MessageType.ChannelPublicData]: ChannelPublicData,

    // NOTIFICATIONS    NOTIFICATIONS    NOTIFICATIONS    NOTIFICATIONS    NOTIFICATIONS    NOTIFICATIONS

    [MessageType.UserMessageError]: translatedMessageWithClass('error notification'),
    [MessageType.AccessDenied]: translatedMessageWithClass('error notification'),
    [MessageType.CommandSuccess]: translatedMessageWithClass('success notification'),
    [MessageType.CommandError]: translatedMessageWithClass('error notification'),
    [MessageType.ImageSent]: translatedMessageWithClass('success notification'),
    [MessageType.UCAccessDenied]: translatedMessageWithClass('error notification'),
};