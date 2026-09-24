import * as React from "react";

export type HoverHideableLock = {
    lock: () => void
    unlock: () => void
}

export const HoverHideableLockContext = React.createContext<HoverHideableLock | null>(null);

export const useHoverHideableLock = (): HoverHideableLock | null =>
    React.useContext(HoverHideableLockContext);
