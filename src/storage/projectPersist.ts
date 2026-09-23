import {ProjectMeta} from './projectTypes';
import * as projectsIdb from './projectsIdb';
import {ProjectFrameRecord} from './projectsIdb';

const PERSIST_PUT_TRIES = 3;

export type PersistProjectSaveArgs = {
    projectId: string
    name: string
    buffer: ArrayBuffer
    frames: ProjectFrameRecord[]
    keepFrameIds: Iterable<string>
}

export async function persistProjectSave(args: PersistProjectSaveArgs): Promise<ProjectMeta> {
    await projectsIdb.ensureProjectFrames(args.projectId, args.frames);

    const keepFrameIds = args.keepFrameIds instanceof Set
        ? args.keepFrameIds
        : new Set(args.keepFrameIds);

    let lastError: unknown;

    for (let attempt = 0; attempt < PERSIST_PUT_TRIES; attempt++) {
        try {
            return await projectsIdb.putProjectBuffer(
                args.projectId,
                args.name,
                args.buffer,
                keepFrameIds,
            );
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
