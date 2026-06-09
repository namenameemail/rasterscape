export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Share of origin storage quota taken by project payloads (sum of sizeBytes). */
export function getProjectsStoragePercent(projectsTotalBytes: number, quotaBytes: number): number | null {
    if (!quotaBytes) {
        return null;
    }

    return (projectsTotalBytes / quotaBytes) * 100;
}

export function formatProjectsStoragePercentValue(percent: number): string {
    if (percent < 0.01) {
        return '< 0.01';
    }

    if (percent < 10) {
        return percent.toFixed(2);
    }

    return percent.toFixed(1);
}

export function formatProjectUpdatedAt(timestamp: number, locale?: string): string {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(timestamp));
}
