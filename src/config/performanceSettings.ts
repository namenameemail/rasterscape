export const performanceSettings = {
    /** Панель debug overlay (frame time + profiling controls) */
    debugOverlay: import.meta.env.DEV,
    valuesService: {
        /** Throttle тяжёлых updateMasked/updateSelected когда нужен readback */
        throttleEnabled: true,
        /** Минимальный интервал между тяжёлыми обновлениями (мс) */
        throttleDelayMs: 100,
    },
} as const
