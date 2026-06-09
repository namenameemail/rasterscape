import * as React from 'react';
import {createPortal} from 'react-dom';
import cn from 'classnames';
import {connect, MapDispatchToProps, MapStateToProps} from 'react-redux';
import {withTranslation, WithTranslation} from 'react-i18next';
import {AppState} from '../../store';
import {Button} from '../_shared/buttons/simple/Button';
import {ProjectsPanel} from './ProjectsPanel';
import {
    setProjectsPanelOpen,
} from '../../store/projects/actions';
import './projectsPanel.scss';

export interface ProjectsControlStateProps {
    isPanelOpen: boolean
    isLoading: boolean
    loadingMessageKey: string
    isSaving: boolean
    isDirty: boolean
    currentProjectId: string | null
    list: AppState['projects']['list']
}

export interface ProjectsControlActionProps {
    setProjectsPanelOpen: typeof setProjectsPanelOpen
}

export interface ProjectsControlProps
    extends ProjectsControlStateProps,
        ProjectsControlActionProps,
        WithTranslation {
}

const ProjectsControlComponent: React.FC<ProjectsControlProps> = ({
    isPanelOpen,
    isLoading,
    loadingMessageKey,
    isSaving,
    isDirty,
    currentProjectId,
    list,
    setProjectsPanelOpen,
    t,
}) => {
    const currentProject = list.find(item => item.id === currentProjectId);
    const projAnchorRef = React.useRef<HTMLSpanElement>(null);
    const [projButtonRect, setProjButtonRect] = React.useState<DOMRect | null>(null);

    const updateProjButtonRect = React.useCallback(() => {
        const button = projAnchorRef.current?.querySelector('button');
        if (button) {
            setProjButtonRect(button.getBoundingClientRect());
        }
    }, []);

    React.useLayoutEffect(() => {
        if (!isPanelOpen) {
            setProjButtonRect(null);
            return;
        }

        updateProjButtonRect();
        window.addEventListener('resize', updateProjButtonRect);

        return () => window.removeEventListener('resize', updateProjButtonRect);
    }, [isPanelOpen, updateProjButtonRect]);

    const togglePanel = React.useCallback(() => {
        setProjectsPanelOpen(!isPanelOpen);
    }, [isPanelOpen, setProjectsPanelOpen]);

    return (
        <>
            {isLoading && createPortal(
                <div className="projects-preloader">
                    <div className="projects-preloader-spinner"/>
                    <span className="projects-preloader-text">{t(loadingMessageKey)}</span>
                </div>,
                document.body,
            )}
            <div className="projects-control">
                {isPanelOpen && (
                    <ProjectsPanel onClose={() => setProjectsPanelOpen(false)}/>
                )}
                {isPanelOpen && projButtonRect && createPortal(
                    <Button
                        autofocus
                        className={cn(
                            'app-control-button',
                            'projects-panel-close',
                        )}
                        style={{
                            position: 'fixed',
                            top: projButtonRect.top,
                            left: projButtonRect.left,
                            width: projButtonRect.width,
                            height: projButtonRect.height,
                            zIndex: 101,
                        }}
                        onClick={() => setProjectsPanelOpen(false)}
                        title={t('projects.close')}
                    >
                        ×
                    </Button>,
                    document.body,
                )}
                <span ref={projAnchorRef} className="projects-control-anchor">
                    <Button
                        autofocus={!isPanelOpen}
                        className={cn('app-control-button', 'projects-control-button', {
                            'projects-control-button--active': isPanelOpen,
                            'projects-control-button--saving': isSaving,
                            'projects-control-button--dirty': isDirty && !isSaving,
                        })}
                        style={{
                            visibility: isPanelOpen ? 'hidden' : undefined,
                            color: isSaving
                                ? '#fc0'
                                : isDirty
                                    ? '#f00'
                                    : undefined,
                        }}
                        onClick={togglePanel}
                        title={currentProject?.name || t('projects.title')}
                    >
                        {t('projects.button')}
                    </Button>
                </span>
            </div>
        </>
    );
};

const mapStateToProps: MapStateToProps<ProjectsControlStateProps, {}, AppState> = state => ({
    isPanelOpen: state.projects.isPanelOpen,
    isLoading: state.projects.isLoading,
    loadingMessageKey: state.projects.loadingMessageKey,
    isSaving: state.projects.isSaving,
    isDirty: state.projects.isDirty,
    currentProjectId: state.projects.currentProjectId,
    list: state.projects.list,
});

const mapDispatchToProps: MapDispatchToProps<ProjectsControlActionProps, {}> = {
    setProjectsPanelOpen,
};

export const ProjectsControl = connect(
    mapStateToProps,
    mapDispatchToProps,
)(withTranslation('common')(ProjectsControlComponent)) as any;
