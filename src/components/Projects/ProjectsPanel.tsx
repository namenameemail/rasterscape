import * as React from 'react';
import {createPortal} from 'react-dom';
import cn from 'classnames';
import {connect, MapDispatchToProps, MapStateToProps} from 'react-redux';
import {withTranslation, WithTranslation} from 'react-i18next';
import {AppState} from '../../store';
import {Button} from '../_shared/buttons/simple/Button';
import {formatBytes, formatProjectUpdatedAt, formatProjectsStoragePercentValue, getProjectsStoragePercent} from '../../utils/formatBytes';
import {estimateStorage} from '../../storage/projectsDb';
import {
    createProject,
    deleteProject,
    duplicateProject,
    exportProject,
    importProjectFromFile,
    renameProject,
    switchProject,
} from '../../store/projects/actions';
import {ProjectMeta} from '../../storage/projectTypes';
import {PATTERN_DELETE_HOLD_MS} from '../../store/activePattern';
import {KeyTrigger} from '../Hotkeys/simple/KeyTrigger';
import {DragAndDrop} from '../_shared/File/DragAndDrop/DragAndDrop';
import {ProjectPatternPreviews} from './ProjectPatternPreviews';
import {PROJECT_FILE_EXTENSION} from '../../storage/projectTypes';

export interface ProjectsPanelStateProps {
    list: ProjectMeta[]
    currentProjectId: string | null
    isSaving: boolean
    patterns: AppState['patterns']
}

export interface ProjectsPanelActionProps {
    switchProject: typeof switchProject
    createProject: typeof createProject
    renameProject: typeof renameProject
    duplicateProject: typeof duplicateProject
    deleteProject: typeof deleteProject
    exportProject: typeof exportProject
    importProjectFromFile: typeof importProjectFromFile
}

export interface ProjectsPanelOwnProps {
    onClose(): void
}

export interface ProjectsPanelProps
    extends ProjectsPanelStateProps,
        ProjectsPanelActionProps,
        ProjectsPanelOwnProps,
        WithTranslation {
}

const ProjectsPanelComponent: React.FC<ProjectsPanelProps> = (props) => {
    const {
        list,
        currentProjectId,
        isSaving,
        patterns,
        switchProject,
        createProject,
        renameProject,
        duplicateProject,
        deleteProject,
        exportProject,
        importProjectFromFile,
        onClose,
        t,
        i18n,
    } = props;

    const [storageQuota, setStorageQuota] = React.useState(0);
    const [renamingId, setRenamingId] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState('');
    const [deleteHoldProjectId, setDeleteHoldProjectId] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const deleteHoldTimerRef = React.useRef<number | null>(null);
    const deleteHoldProjectIdRef = React.useRef<string | null>(null);

    const projectsTotalBytes = React.useMemo(
        () => list.reduce((sum, item) => sum + item.sizeBytes, 0),
        [list],
    );
    const storagePercent = getProjectsStoragePercent(projectsTotalBytes, storageQuota);
    const sortedList = React.useMemo(
        () => [...list].sort((a, b) => b.updatedAt - a.updatedAt),
        [list],
    );

    React.useEffect(() => {
        estimateStorage().then(({quota}) => setStorageQuota(quota));
    }, [list]);

    const handleOpen = React.useCallback((id: string) => {
        if (id !== currentProjectId) {
            switchProject(id);
        }
    }, [currentProjectId, switchProject]);

    const handleRenameStart = React.useCallback((item: ProjectMeta) => {
        setRenamingId(item.id);
        setRenameValue(item.name);
    }, []);

    const handleRenameSubmit = React.useCallback(() => {
        if (renamingId && renameValue.trim()) {
            renameProject(renamingId, renameValue.trim());
        }
        setRenamingId(null);
        setRenameValue('');
    }, [renamingId, renameValue, renameProject]);

    const clearDeleteHold = React.useCallback(() => {
        if (deleteHoldTimerRef.current !== null) {
            window.clearTimeout(deleteHoldTimerRef.current);
            deleteHoldTimerRef.current = null;
        }

        deleteHoldProjectIdRef.current = null;
        setDeleteHoldProjectId(null);
    }, []);

    React.useEffect(() => () => {
        if (deleteHoldTimerRef.current !== null) {
            window.clearTimeout(deleteHoldTimerRef.current);
        }
    }, []);

    React.useEffect(() => {
        const handleWindowBlur = () => clearDeleteHold();
        window.addEventListener('blur', handleWindowBlur);
        return () => window.removeEventListener('blur', handleWindowBlur);
    }, [clearDeleteHold]);

    const handleDeleteHoldStart = React.useCallback((projectId: string) => (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (deleteHoldTimerRef.current !== null) {
            return;
        }

        deleteHoldProjectIdRef.current = projectId;
        setDeleteHoldProjectId(projectId);

        deleteHoldTimerRef.current = window.setTimeout(() => {
            const id = deleteHoldProjectIdRef.current;
            deleteHoldTimerRef.current = null;
            deleteHoldProjectIdRef.current = null;
            setDeleteHoldProjectId(null);

            if (id) {
                deleteProject(id);
            }
        }, PATTERN_DELETE_HOLD_MS);
    }, [deleteProject]);

    const handleDeleteHoldEnd = React.useCallback((e?: React.SyntheticEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        clearDeleteHold();
    }, [clearDeleteHold]);

    const handleImportClick = React.useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleClose = React.useCallback(() => {
        onClose();
    }, [onClose]);

    const handleImportFile = React.useCallback((file: File | undefined) => {
        if (file) {
            importProjectFromFile(file);
        }
    }, [importProjectFromFile]);

    const handleImportChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleImportFile(e.target.files?.[0]);
        e.target.value = '';
    }, [handleImportFile]);

    const handleImportDrop = React.useCallback((files: FileList) => {
        const file = Array.from(files).find(item => /\.(rs2d|rs|json)$/i.test(item.name)) || files[0];
        handleImportFile(file);
    }, [handleImportFile]);

    const handleProjectCardMouseLeave = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && e.currentTarget.contains(active)) {
            active.blur();
        }
    }, []);

    const blurProjectAction = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
    }, []);

    return createPortal(
        <div className="projects-modal-root">
            <div className="projects-modal-backdrop" onClick={handleClose}/>
            <div className="projects-modal">
                <DragAndDrop className="projects-panel-drop" onDrop={handleImportDrop}>
                    <div className="projects-panel">
                        <div className="projects-panel-header">
                            <div className="projects-panel-header-actions">
                                <Button
                                    className="projects-panel-header-button"
                                    onClick={() => createProject()}
                                    title={t('projects.new')}
                                >
                                    +
                                </Button>
                                <Button
                                    className="projects-panel-header-button projects-panel-header-button--text"
                                    onClick={handleImportClick}
                                    title={t('projects.import')}
                                >
                                    {t('projects.import')}
                                </Button>
                                <span className="projects-panel-storage">
                                    {storagePercent === null
                                        ? '—'
                                        : t('projects.storageUsed', {
                                            percent: formatProjectsStoragePercentValue(storagePercent),
                                        })}
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={`.${PROJECT_FILE_EXTENSION},.json,application/json`}
                                    hidden
                                    onChange={handleImportChange}
                                />
                            </div>
                            {isSaving && <span className="projects-panel-saving">{t('projects.saving')}</span>}
                        </div>

                        <div className="projects-panel-list">
                            {sortedList.map(item => (
                            <div
                                key={item.id}
                                className={cn('projects-panel-item', {
                                    'projects-panel-item--active': item.id === currentProjectId,
                                })}
                            >
                                <div
                                    className="projects-panel-item-card"
                                    onMouseLeave={handleProjectCardMouseLeave}
                                >
                                    {deleteHoldProjectId === item.id && (
                                        <span
                                            className="projects-panel-item-delete-hold"
                                            style={{animationDuration: `${PATTERN_DELETE_HOLD_MS}ms`}}
                                        />
                                    )}
                                    <div className="projects-panel-item-actions">
                                        <button
                                            type="button"
                                            className="projects-panel-action"
                                            onClick={(e) => {
                                                handleRenameStart(item);
                                                blurProjectAction(e);
                                            }}
                                            title={t('projects.rename')}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            type="button"
                                            className="projects-panel-action"
                                            onClick={(e) => {
                                                duplicateProject(item.id);
                                                blurProjectAction(e);
                                            }}
                                            title={t('projects.duplicate')}
                                        >
                                            ⧉
                                        </button>
                                        <button
                                            type="button"
                                            className="projects-panel-action"
                                            onClick={(e) => {
                                                exportProject(item.id);
                                                blurProjectAction(e);
                                            }}
                                            title={t('projects.export')}
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            className="projects-panel-action"
                                            title={t('projects.deleteHold')}
                                            onMouseDown={handleDeleteHoldStart(item.id)}
                                            onMouseUp={(e) => {
                                                handleDeleteHoldEnd(e);
                                                blurProjectAction(e);
                                            }}
                                            onMouseLeave={handleDeleteHoldEnd}
                                            onTouchStart={handleDeleteHoldStart(item.id)}
                                            onTouchEnd={handleDeleteHoldEnd}
                                            onTouchCancel={handleDeleteHoldEnd}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div
                                        className="projects-panel-item-open"
                                        onDoubleClick={() => handleOpen(item.id)}
                                    >
                                        <ProjectPatternPreviews
                                            projectId={item.id}
                                            isCurrentProject={item.id === currentProjectId}
                                            livePatterns={item.id === currentProjectId ? patterns : undefined}
                                        />
                                        <div className="projects-panel-item-meta">
                                            {renamingId === item.id ? (
                                                <input
                                                    className="projects-panel-rename-input"
                                                    value={renameValue}
                                                    autoFocus
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onBlur={handleRenameSubmit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleRenameSubmit();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setRenamingId(null);
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onDoubleClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className="projects-panel-item-name">{item.name}</span>
                                            )}
                                            <span className="projects-panel-item-updated">
                                                {formatProjectUpdatedAt(item.updatedAt, i18n.language)}
                                            </span>
                                            <span className="projects-panel-item-size">{formatBytes(item.sizeBytes)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>

                        <KeyTrigger
                            keyValue="Escape"
                            codeValue="esc"
                            onPress={handleClose}
                            withInputs
                        />
                    </div>
                </DragAndDrop>
            </div>
        </div>,
        document.body,
    );
};

const mapStateToProps: MapStateToProps<ProjectsPanelStateProps, ProjectsPanelOwnProps, AppState> = state => ({
    list: state.projects.list,
    currentProjectId: state.projects.currentProjectId,
    isSaving: state.projects.isSaving,
    patterns: state.patterns,
});

const mapDispatchToProps: MapDispatchToProps<ProjectsPanelActionProps, ProjectsPanelOwnProps> = {
    switchProject,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
    exportProject,
    importProjectFromFile,
};

export const ProjectsPanel = connect(
    mapStateToProps,
    mapDispatchToProps,
)(withTranslation('common')(ProjectsPanelComponent)) as any;
