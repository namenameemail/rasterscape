import * as React from "react";
import "../styles/layout.scss";
import {Patterns} from "./Patterns";
import {Tools} from "./Tools";
import {ChangeF} from "./ChangeF";
import {connect} from "react-redux";
import {setFullScreen} from "../store/fullscreen";
import {AppState} from "../store";
import {FullScreen, useFullScreenHandle} from "react-full-screen";
import {AppControls} from "./AppControls";
import {ProjectsInitializer} from "./Projects/ProjectsInitializer";

export interface LayoutStateProps {
    full: boolean
}

export interface LayoutActionProps {
    setFullScreen(value: boolean)
}

export interface LayoutProps extends LayoutStateProps, LayoutActionProps {
}

export const LayoutComponent: React.FC<LayoutProps> = ({full, setFullScreen}) => {

    const handle = useFullScreenHandle();

    React.useEffect(() => {

            if (!!full !== !!handle.active) {
                try {
                if (full) {
                    handle.enter();
                } else {
                    handle.exit();
                }} catch (e) {
                    console.log(e);
                }
            }

    }, [full])

    return (
        <FullScreen handle={handle} onChange={setFullScreen}>
            <ProjectsInitializer/>
            <div className={"layout-container"}>
                <div className="layout">
                    <AppControls/>
                    <div className="tools-panel">
                        <Tools/>
                        <ChangeF/>
                    </div>
                    <div className="windows">
                        <Patterns/>
                    </div>
                </div>
            </div>
        </FullScreen>
    );
};

export const Layout = connect<LayoutStateProps, LayoutActionProps, {}, AppState>(state => ({
    full: state.fullScreen
}), {
    setFullScreen
})(LayoutComponent);