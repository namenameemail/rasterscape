import * as React from "react";
import classNames from "classnames";
import {Button} from "../_shared/buttons/simple/Button";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../store";
import {removeCF} from "../../store/changeFunctions/actions";
import {withTranslation, WithTranslation} from "react-i18next";
import {ChangeFunctionState, ECFType} from "../../store/changeFunctions/types";
import {WaveCF} from "./Wave";
import {FxyCF} from "./Fxy";
import {DepthCF} from "./Depth/DeepthCF";
import {DeleteButton, DeleteButtonComponent} from "../_shared/buttons/complex/DeleteButton/DeleteButton";

export interface ChangeFItemStateProps {
    changeFunction: ChangeFunctionState
}

export interface ChangeFItemActionProps {

    removeCF(name: string)
}

export interface ChangeFItemOwnProps {
    id: string
    highlighted: boolean
}

export interface ChangeFItemProps extends ChangeFItemStateProps, ChangeFItemActionProps, ChangeFItemOwnProps, WithTranslation {

}

const CFComponentByType = {
    [ECFType.WAVE]: WaveCF,
    [ECFType.FXY]: FxyCF,
    [ECFType.DEPTH]: DepthCF,
};


const ChangeFItemComponent: React.FC<ChangeFItemProps> = (props) => {
    const {
        t,
        id,
        highlighted,
        changeFunction,
        removeCF,
    } = props;

    const {
        type,
        number,
    } = changeFunction;

    const Component = CFComponentByType[type];

    const handleDelete = React.useCallback(({value}) => {
        removeCF(value);
    }, [removeCF]);

    return (
        <div
            className={classNames('function-container', {
                ['highlighted']: highlighted
            })}
            key={id}
        >
            <DeleteButton
                title={t('cf.hotkeysDescription.type.' + type) + number}
                deleteText={t('utils.delete')}
                value={id}
                onDoubleClick={handleDelete}
            />
            {Component && <Component name={id}/>}

        </div>
    )
};


const mapStateToProps: MapStateToProps<ChangeFItemStateProps, ChangeFItemOwnProps, AppState> = (state, {id}) => ({
    changeFunction: state.changeFunctions.functions[id]
});

const mapDispatchToProps: MapDispatchToProps<ChangeFItemActionProps, ChangeFItemOwnProps> = {
    removeCF
};

export const ChangeFItem = connect<ChangeFItemStateProps, ChangeFItemActionProps, ChangeFItemOwnProps, AppState>(
    mapStateToProps, mapDispatchToProps
)(withTranslation('common')(ChangeFItemComponent));
