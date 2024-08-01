import * as React from "react";
import {connect, MapDispatchToProps, MapStateToProps} from "react-redux";
import {withTranslation, WithTranslation} from 'react-i18next';
import {AppState} from "../../store";
import {EToolType} from "../../store/tool/types";
import {setCurrentTool} from "../../store/tool/actions";
import {Brush} from "./Brush";
import {Line} from "./Line";
import {SelectTool} from "./SelectTool";
import {reverseFullScreen} from "../../store/fullscreen";
import classNames from "classnames";
import "../../styles/tools.scss";
import {ButtonHK} from "../_shared/buttons/hotkeyed/ButtonHK";

export const ToolsParams = {
    [EToolType.Brush]: {component: Brush, type: EToolType.Brush},
    [EToolType.Line]: {component: Line, type: EToolType.Line},
    [EToolType.Select]: {component: SelectTool, type: EToolType.Select},
};

export interface ToolsStateProps {
    currentTool: EToolType
}

export interface ToolsActionProps {
    setCurrentTool(tool: EToolType)

    reverseFullScreen()
}

export interface ToolsOwnProps {
    className?: string
}

export interface ToolsProps extends ToolsStateProps, ToolsActionProps, ToolsOwnProps, WithTranslation {

}

const ToolsComponent: React.FC<ToolsProps> = (props) => {
    const {t, i18n, currentTool, setCurrentTool, reverseFullScreen, className} = props;

    const ToolControls = ToolsParams[currentTool].component;

    const handleToolClick = React.useCallback((data) => {
        console.log('handleToolClick', data);
        setCurrentTool(ToolsParams[data.value].type)
    }, [setCurrentTool]);

    return (
        <div className={classNames("tools", className)}>
            <div className={'tools-select'}>
                {Object.keys(ToolsParams).map(toolType => (
                    <ButtonHK
                        path={'tool.' + toolType.toLowerCase()}
                        name={'tool.' + toolType.toLowerCase()}
                        hkLabel={`tools.hotkeysDescription.${toolType.toLowerCase()}`}
                        key={toolType}
                        value={toolType}
                        selected={toolType === currentTool}
                        onClick={handleToolClick}>
                        {t(`tools.${toolType.toLowerCase()}`)}
                    </ButtonHK>
                ))}
            </div>
            <ToolControls/>
        </div>
    );
};

const mapStateToProps: MapStateToProps<ToolsStateProps, ToolsOwnProps, AppState> = state => ({
    currentTool: state.tool.current
});

const mapDispatchToProps: MapDispatchToProps<ToolsActionProps, ToolsOwnProps> = {
    setCurrentTool, reverseFullScreen
};

export const Tools = connect<ToolsStateProps, ToolsActionProps, ToolsOwnProps, AppState>(
    mapStateToProps,
    mapDispatchToProps
)(withTranslation('common')(ToolsComponent));