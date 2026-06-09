import * as React from 'react'
import {createPortal} from 'react-dom'
import {connect, MapDispatchToProps, MapStateToProps} from 'react-redux'
import {AppState} from '../../../store'
import {getPatternsSelectItems} from '../../../store/patterns/selectors'
import {PatternSelectItem} from '../../PatternsSelect'
import './hoverPatternSelect.scss'

export interface HoverPatternSelectStateProps {
    patternsSelectItems: ReturnType<typeof getPatternsSelectItems>
}

export interface HoverPatternSelectOwnProps {
    patternId: string
    value?: string | null
    namePrefix: string
    onChange(value: string | null): void
}

export interface HoverPatternSelectProps
    extends HoverPatternSelectStateProps,
        HoverPatternSelectOwnProps {
}

const PANEL_Z_INDEX = 10

const HoverPatternSelectComponent: React.FC<HoverPatternSelectProps> = ({
    patternsSelectItems,
    patternId,
    value,
    namePrefix,
    onChange,
}) => {
    const rootRef = React.useRef<HTMLDivElement>(null)
    const closeTimerRef = React.useRef<number>()
    const [open, setOpen] = React.useState(false)
    const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({})

    const items = patternsSelectItems.filter(({id}) => id !== patternId)

    const updatePanelPosition = React.useCallback(() => {
        const root = rootRef.current
        const settingsPanel = root?.closest('.pattern-left')

        if (!root || !settingsPanel) {
            return
        }

        const triggerRect = root.getBoundingClientRect()
        const settingsRect = settingsPanel.getBoundingClientRect()

        setPanelStyle({
            top: triggerRect.top,
            left: settingsRect.left,
            width: settingsRect.width,
            zIndex: PANEL_Z_INDEX,
        })
    }, [])

    const clearCloseTimer = React.useCallback(() => {
        if (closeTimerRef.current != null) {
            window.clearTimeout(closeTimerRef.current)
            closeTimerRef.current = undefined
        }
    }, [])

    const handleOpen = React.useCallback(() => {
        clearCloseTimer()
        updatePanelPosition()
        setOpen(true)
    }, [clearCloseTimer, updatePanelPosition])

    const handleClose = React.useCallback(() => {
        clearCloseTimer()
        closeTimerRef.current = window.setTimeout(() => setOpen(false), 80)
    }, [clearCloseTimer])

    React.useEffect(() => {
        if (!open) {
            return
        }

        updatePanelPosition()

        const scrollEl = rootRef.current?.closest('.hidden-scroll')

        window.addEventListener('resize', updatePanelPosition)
        scrollEl?.addEventListener('scroll', updatePanelPosition, {passive: true})

        return () => {
            window.removeEventListener('resize', updatePanelPosition)
            scrollEl?.removeEventListener('scroll', updatePanelPosition)
        }
    }, [open, updatePanelPosition])

    React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

    const handleSelect = React.useCallback((id: string) => {
        onChange(id === value ? null : id)
    }, [onChange, value])

    const selectedIndex = items.findIndex(({id}) => id === value)
    const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null

    const panel = open ? (
        <div
            className="hover-pattern-select__panel"
            style={panelStyle}
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
        >
            <div className="hover-pattern-select__grid">
                {items.map(({width, height, id}, index) => (
                    <PatternSelectItem
                        key={id}
                        id={id}
                        name={`${namePrefix}Panel`}
                        HK={false}
                        width={width}
                        height={height}
                        index={index}
                        selected={id === value}
                        rowBreak={false}
                        blurOnClick
                        onSelect={handleSelect}
                    />
                ))}
            </div>
        </div>
    ) : null

    return (
        <div
            ref={rootRef}
            className="hover-pattern-select"
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
        >
            <div className="hover-pattern-select__trigger">
                {selectedItem ? (
                    <PatternSelectItem
                        id={selectedItem.id}
                        name={namePrefix}
                        HK={false}
                        width={selectedItem.width}
                        height={selectedItem.height}
                        index={selectedIndex}
                        selected={false}
                        rowBreak={false}
                        blurOnClick
                        onSelect={handleSelect}
                    />
                ) : (
                    <div className="hover-pattern-select__empty" aria-hidden="true">—</div>
                )}
            </div>
            {panel && createPortal(panel, document.body)}
        </div>
    )
}

const mapStateToProps: MapStateToProps<HoverPatternSelectStateProps, HoverPatternSelectOwnProps, AppState> = state => ({
    patternsSelectItems: getPatternsSelectItems(state),
})

const mapDispatchToProps: MapDispatchToProps<{}, HoverPatternSelectOwnProps> = {}

export const HoverPatternSelect = connect(
    mapStateToProps,
    mapDispatchToProps,
)(HoverPatternSelectComponent)
