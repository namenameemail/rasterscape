import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {AppState} from "../../../store";
import classNames from "classnames";

export interface AddPatternHelpStateProps {
    thereIsPattern: boolean
    tutorial: boolean
}

export interface AddPatternHelpActionProps {
}

export interface AddPatternHelpOwnProps {

}

export interface AddPatternHelpProps extends AddPatternHelpStateProps, AddPatternHelpActionProps, AddPatternHelpOwnProps {

}

const AddPatternHelpComponent: React.FC<AddPatternHelpProps> = ({thereIsPattern, tutorial}) => {

    return !thereIsPattern && tutorial ? (
        <div className={classNames('add-help')}>
            press the button to add canvas
        </div>
    ) : null;
};

const mapStateToProps: MapStateToProps<AddPatternHelpStateProps, AddPatternHelpOwnProps, AppState> = state => ({
    thereIsPattern: Object.keys(state.patterns).length > 0,
    tutorial: state.tutorial.on
});

const mapDispatchToProps: MapDispatchToProps<AddPatternHelpActionProps, AddPatternHelpOwnProps> = {};

export const AddPatternHelp = connect<AddPatternHelpStateProps, AddPatternHelpActionProps, AddPatternHelpOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(AddPatternHelpComponent);