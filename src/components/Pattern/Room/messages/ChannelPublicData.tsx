import * as React from "react";
import cn from "classnames";
import {MessageComponentType, withT} from "./helpers";

export const ChannelPublicData: MessageComponentType = withT((props) => {
    const {unreaded, data, t} = props;
    const {
        owner,
        channelSign,
        isPrivate,
        members,
        description,
        isMeMember,
        isMeAdmin,
        rank, score,
    } = data.channelPublicData;
    return (
        <div
            className={'channelData-container'}
        >
            <div className={'channelData'}>
                <div className={'channelData-sign'}>
                    {isPrivate
                        ? <div className={cn('private', {
                            ['public']: isMeMember
                        })}>{t('channel.data.private')}</div>
                        : <div className={'private public'}>{t('channel.data.public')}</div>
                    }
                    <div className={'sign'}>{channelSign}</div>

                </div>
                <div className={'channelData-values-table'}>
                    <div className={'description'}>
                        <span>{description}</span>
                        {/*<div>description</div>*/}
                        {/*<div><span>{description}</span></div>*/}
                    </div>
                    <div>
                        <div>{t('channel.data.admin')}</div>
                        <div className={'long'}><span>{owner}</span></div>
                    </div>
                    <div>
                        <div>{t('channel.data.score')}</div>
                        <div className={'long'}><span>{rank}/{score}</span></div>
                    </div>
                    {!!(isPrivate || members.length) && (
                        <div>
                            <div>{t('channel.data.members')}</div>
                            <div className={'tall'}><span>{(members || []).join(', ')}</span></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});