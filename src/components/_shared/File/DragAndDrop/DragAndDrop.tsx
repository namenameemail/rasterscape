import React, { Component } from 'react';
import cn from "classnames";
import './styles.scss';

export interface DragAndDropProps {
    children?: React.ReactNode
    className?: string
    onDrop?(files)
}
export interface DragAndDropState {

    drag: boolean
}

export class DragAndDrop extends Component<DragAndDropProps, DragAndDropState> {

    dropRef;
    dragCounter = 0;

    constructor(props) {
        super(props);

        this.state = {
            drag: false
        }
        this.dropRef = React.createRef<HTMLDivElement>();
    }

    handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }
    handleDragIn = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.dragCounter++
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            this.setState({drag: true})
        }
    }
    handleDragOut = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.dragCounter--
        if (this.dragCounter === 0) {
            this.setState({drag: false})
        }
    }
    handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.setState({drag: false})
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.props.onDrop(e.dataTransfer.files)
            e.dataTransfer.clearData()
            this.dragCounter = 0
        }
    }
    componentDidMount() {
        let div = this.dropRef.current
        div.addEventListener('dragenter', this.handleDragIn)
        div.addEventListener('dragleave', this.handleDragOut)
        div.addEventListener('dragover', this.handleDrag)
        div.addEventListener('drop', this.handleDrop)
    }
    componentWillUnmount() {
        const div: HTMLElement = this.dropRef.current
        div.removeEventListener('dragenter', this.handleDragIn)
        div.removeEventListener('dragleave', this.handleDragOut)
        div.removeEventListener('dragover', this.handleDrag)
        div.removeEventListener('drop', this.handleDrop)
    }
    render() {
        return (
            <div
                className={cn('drag-n-drop', this.props.className)}
                ref={this.dropRef}
            >
                {this.state.drag &&
                <div className={'drag-n-drop-overlay'}>

                </div>
                }
                {this.props.children}
            </div>
        )
    }
}
