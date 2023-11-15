import React, { Component } from 'react';
import { createAnimationPreviewCanvas, disposeAnimationPreviewCanvas, getAnimationPreviewCanvas } from '../../canvas/animationEditor/AnimationPreviewCanvas';

interface Props {
    width: number;
    height: number;
}

// This is a class-based component to have proper mounting/dismounting with hot reloading.
// See the comment in GameContainer.tsx for more details.
export class AnimationPreviewCanvasContainer extends Component<Props> {
    private refElement: HTMLElement;

    public componentDidMount() {
        createAnimationPreviewCanvas(this.props.width, this.props.height);
        getAnimationPreviewCanvas().attach(this.refElement);
    }

    public componentWillUnmount() {
        disposeAnimationPreviewCanvas();
    }

    public render() {
        return (
            <div ref={ref => {
                this.refElement = ref;

                const animationPreviewCanvas = getAnimationPreviewCanvas();
                if (!animationPreviewCanvas)
                    return;

                if (ref) {
                    animationPreviewCanvas.attach(ref);
                } else {
                    animationPreviewCanvas.detach();
                }
            }} />
        );
    }
}