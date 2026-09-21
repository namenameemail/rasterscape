export const toInt32Array = (value: unknown, fallbackLength = 1000): Int32Array => {
    if (value instanceof Int32Array) {
        return value;
    }
    if (Array.isArray(value)) {
        return Int32Array.from(value);
    }
    if (value && typeof value === 'object') {
        return Int32Array.from(Object.values(value as Record<string, number>));
    }
    return new Int32Array(fallbackLength);
};

export const int32ArrayJsonReplacer = (_key: string, value: unknown) =>
    value instanceof Int32Array ? Array.from(value) : value;

export const reviveValuesArraysDeep = <T>(value: T): T => {
    if (!value || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(item => reviveValuesArraysDeep(item)) as T;
    }

    const result: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        result[key] = key === 'valuesArray'
            ? toInt32Array(child)
            : reviveValuesArraysDeep(child);
    });

    return result as T;
};
