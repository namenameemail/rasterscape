import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {AppState} from '../../store';
import {getProjectPayload} from '../../storage/projectsDb';
import {
    getPatternPreviewsFromLivePatterns,
    getPatternPreviewsFromPayload,
    ProjectPatternPreview,
} from '../../storage/projectPatternPreviews';
import {drawPatternPreview} from '../../utils/patternPreviewDraw';

const PREVIEW_SIZE = 36;

export interface ProjectPatternPreviewsProps {
    projectId: string
    isCurrentProject: boolean
    livePatterns?: AppState['patterns']
}

export const ProjectPatternPreviews: React.FC<ProjectPatternPreviewsProps> = ({
    projectId,
    isCurrentProject,
    livePatterns,
}) => {
    const {t} = useTranslation('common');
    const [previews, setPreviews] = React.useState<ProjectPatternPreview[]>([]);
    const [loaded, setLoaded] = React.useState(isCurrentProject && !!livePatterns);
    const canvasRefs = React.useRef(new Map<string, HTMLCanvasElement>());

    React.useEffect(() => {
        if (isCurrentProject && livePatterns) {
            setPreviews(getPatternPreviewsFromLivePatterns(livePatterns));
            setLoaded(true);
            return;
        }

        let cancelled = false;
        setLoaded(false);

        getProjectPayload(projectId).then((payload) => {
            if (cancelled) {
                return;
            }

            setPreviews(payload ? getPatternPreviewsFromPayload(payload) : []);
            setLoaded(true);
        });

        return () => {
            cancelled = true;
        };
    }, [projectId, isCurrentProject, livePatterns]);

    React.useEffect(() => {
        previews.forEach(({id, imageData}) => {
            const canvas = canvasRefs.current.get(id);

            if (canvas) {
                drawPatternPreview(canvas, imageData);
            }
        });
    }, [previews]);

    const setCanvasRef = React.useCallback((patternId: string, canvas: HTMLCanvasElement | null) => {
        if (canvas) {
            canvasRefs.current.set(patternId, canvas);
            const preview = previews.find(item => item.id === patternId);
            drawPatternPreview(canvas, preview?.imageData);
            return;
        }

        canvasRefs.current.delete(patternId);
    }, [previews]);

    if (!previews.length) {
        return (
            <div className="projects-panel-item-previews">
                {loaded && (
                    <span className="projects-panel-item-previews-empty">
                        {t('projects.noPatterns')}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="projects-panel-item-previews">
            {previews.map(({id}) => (
                <canvas
                    key={id}
                    className="projects-panel-item-preview"
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                    ref={(canvas) => setCanvasRef(id, canvas)}
                />
            ))}
        </div>
    );
};
