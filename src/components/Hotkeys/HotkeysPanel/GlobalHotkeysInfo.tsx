import * as React from "react";
import cn from "classnames";
import './GlobalHotkeysInfo.scss'
import {WithTranslation, withTranslation} from "react-i18next";

const CMD_KEY = navigator.userAgent.indexOf('Mac OS X') !== -1
    ? '⌘'
    : 'ctrl'
const ALT_KEY = navigator.userAgent.indexOf('Mac OS X') !== -1
    ? '⌥'
    : 'alt'

export interface GlobalHotkeysProps extends WithTranslation{

}

const UnchangableKey: React.FC<{
    big?: boolean
    one?: boolean
    digits?: boolean
    value: string
}> = ({big, digits, one, value}) => (
    <input
        disabled
        className={cn({
            'one-key': one,
            'big-key': big,
            'digits': digits,
        })}
        value={value}
    />
);

const Plus = () => (
    <div className={'separator'}>+</div>
);

const Item: React.FC<{
    children?: any
    desc: string
}> = ({desc, children}) => (
    <div className={'global-hotkeys-item'}>
        <div className={'global-hotkeys-item_buttons'}>
            {children}
        </div>
        <div className={'global-hotkeys-item_description'}>
            {desc}
        </div>
    </div>
);

const GlobalHotkeysComponent: React.FC<GlobalHotkeysProps> = (props) => {

    const {t} = props;

    return (
        <div className={'global-hotkeys-info'}>

            <Item desc={t('globalHotkeys.patternSelect')}>
                <UnchangableKey digits value={'1..9'} />
            </Item>

            {/*<Item desc={t('globalHotkeys.patternGoTo')}>*/}
            {/*    <ButtonHotkeyTrigger big value={ALT_KEY} /><Plus/><ButtonHotkeyTrigger digits value={'1..9'} />*/}
            {/*</Item>*/}



            <Item desc={t('globalHotkeys.patternWindow')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'w'}/>
            </Item>

            <Item desc={t('globalHotkeys.savePattern')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'s'}/>
            </Item>
            <Item desc={t('globalHotkeys.doublePattern')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'c'}/>
            </Item>

            <Item desc={t('globalHotkeys.selectClear')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'d'}/>
            </Item>
            <Item desc={t('globalHotkeys.selectAll')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'a'}/>
            </Item>

            <Item desc={t('globalHotkeys.hotkeys')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'k'}/>
            </Item>

            <Item desc={t('globalHotkeys.hotkeyInvert')}>
                <UnchangableKey big value={ALT_KEY} /><Plus/><UnchangableKey one value={'i'}/>
            </Item>
            {/*<Item*/}
            {/*    desc={'новый паттерн'}*/}
            {/*>*/}
            {/*    <ButtonHotkeyTrigger big value={CMD_KEY} />*/}
            {/*    <Plus/>*/}
            {/*    <ButtonHotkeyTrigger value={'n'}/>*/}
            {/*</Item>*/}
        </div>
    );
};

export const GlobalHotkeysInfo = withTranslation('common')(GlobalHotkeysComponent);
