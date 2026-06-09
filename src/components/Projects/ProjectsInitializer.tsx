import * as React from 'react';
import {useDispatch} from '../../store';
import {initProjects} from '../../store/projects/actions';

export const ProjectsInitializer: React.FC = () => {
    const dispatch = useDispatch();

    React.useEffect(() => {
        dispatch(initProjects() as any);
    }, [dispatch]);

    return null;
};
