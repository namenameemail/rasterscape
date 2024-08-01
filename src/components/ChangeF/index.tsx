import * as React from "react";
import classNames from "classnames";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../store";
import {ChangeFunctions} from "../../store/changeFunctions/reducer";
import {addCF, changeCFParams, removeCF} from "../../store/changeFunctions/actions";
import {ECFType} from "../../store/changeFunctions/types";
import {Button} from "../_shared/buttons/simple/Button";
import {setChangingMode, startChanging, stopChanging} from "../../store/changing/actions";
import {ChangingMode} from "../../store/changing/types";
import {FxyCF} from "./Fxy";
import {getCFs} from "../../store/changeFunctions/selectors";
import {DepthCF} from "./Depth/DeepthCF";
import {WaveCF} from "./Wave";
import {enumToSelectItems} from "../../utils/utils";
import {SelectButtons} from "../_shared/buttons/complex/SelectButtons";
import {WithTranslation, withTranslation} from "react-i18next";
import {ChangeFItem} from "./ChangeFItem";
import './styles.scss';

export interface ChangeFStateProps {
    cfs: string[]
    changingMode: ChangingMode
    tutorial: boolean
    highlighted: string
    typeHighlighted: ECFType[]
}

export interface ChangeFActionProps {
    changeCFParams(id: string, params: any)

    addCF(cfType: ECFType)

    removeCF(id: string)

    startChanging()

    stopChanging()

    setChangingMode(mode: ChangingMode)
}

export interface ChangeFOwnProps {

}

export interface ChangeFProps extends ChangeFStateProps, ChangeFActionProps, ChangeFOwnProps, WithTranslation {

}

export interface ChangeFState {

}

const CFComponentByType = {
    [ECFType.WAVE]: WaveCF,
    [ECFType.FXY]: FxyCF,
    [ECFType.DEPTH]: DepthCF,
};

const modesItems = enumToSelectItems(ChangingMode);

const getTypeClassName = typeHighlighted => type => classNames({['highlighted']: typeHighlighted.includes(type)});
const typesItems = Object.values(ECFType);

const ChangeFComponent: React.FC<ChangeFProps> = (props) => {

    const {
        cfs,
        changingMode,
        highlighted,
        typeHighlighted,
        changeCFParams,
        removeCF,
        addCF,
        setChangingMode,
        t,
    } = props;

    const handleChange = React.useCallback((value, name) => {
        changeCFParams(name, value);

    }, [changeCFParams]);

    const handleDelete = React.useCallback(({value}) => {
        removeCF(value);
    }, [removeCF]);

    const handleAddCF = React.useCallback((data) => {
        addCF(data.value);
    }, [addCF]);

    const handleModeChange = React.useCallback(({value}) => {
        setChangingMode(value);
    }, [setChangingMode]);

    const getTypeValue = React.useMemo(() => type => type, []);
    const getTypeText = React.useMemo(() => type => t('cf.type.' + type), [t]);
    const getModeText = React.useMemo(() => ({value}) => t('cf.mode.' + value), [t]);

    console.log('CF RENDERR CF RENDERR CF RENDERR CF RENDERR CF RENDERR CF RENDERR CF RENDERR ');

    return (
        <div className="change-functions">
            <div className="control-buttons">
                <SelectButtons
                    itemClassName={getTypeClassName(typeHighlighted)}
                    items={typesItems}
                    getText={getTypeText}
                    getValue={getTypeValue}
                    hkLabel={'cf.type'}
                    onItemClick={handleAddCF}
                />
                {!!cfs.length && (
                    <SelectButtons
                        className={classNames('modes', changingMode)}
                        items={modesItems}
                        value={changingMode}
                        hkLabel={'cf.mode'}
                        getText={getModeText}
                        onChange={handleModeChange}
                        maxKeysCount={1}
                    />
                )}
            </div>
            <div className="functions-list">
                {cfs.slice().reverse().map(cf => {
                    return <ChangeFItem
                        id={cf}
                        highlighted={highlighted === cf}
                    />
                })}
            </div>
        </div>
    );

};

// const cfsSelector

const mapStateToProps: MapStateToProps<ChangeFStateProps, {}, AppState> = (state) => ({
    cfs: state.changeFunctions.namesList,
    changingMode: state.changing.mode,
    tutorial: state.tutorial.on,
    highlighted: state.changeFunctionHighlights.highlighted,
    typeHighlighted: state.changeFunctionHighlights.typeHighlighted,
});

const mapDispatchToProps: MapDispatchToProps<ChangeFActionProps, ChangeFOwnProps> = {
    changeCFParams, addCF, startChanging, stopChanging, setChangingMode, removeCF
};

export const ChangeF = connect<ChangeFStateProps, ChangeFActionProps, ChangeFOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation("common")(ChangeFComponent));