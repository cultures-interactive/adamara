import { autorun } from "mobx";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { observer } from "mobx-react-lite";
import { AnimationSelectionStore } from "../../stores/AnimationSelectionStore";
import { Slider, SliderThumb, SliderTrack } from "../editor/Slider";
import { useTranslation } from "react-i18next";
import { sharedStore } from "../../stores/SharedStore";
import { AnimationPreviewCanvas, getAnimationPreviewCanvas } from "../../canvas/animationEditor/AnimationPreviewCanvas";
import { AnimationPreviewCanvasContainer } from "./AnimationPreviewCanvasContainer";

export interface PixelSize {
    width: number;
    height: number;
}

const PreviewContainer = styled.div<PixelSize>`
    position: relative;
    background-color: #000000;
    width: ${props => props.width + 4}px;
    height: ${props => props.height + 4}px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    margin-left: auto;
    margin-right: auto;
`;

// ${props => props.color ? props.color : "#FFFFFF"};

const SpinnerContainer = styled.div<PixelSize>`
    position: absolute;
    width: 20px;
    height: 20px;
    top: ${props => props.height / 2 - 20}px;
    left: ${props => props.width / 2 - 20}px;
`;

const SliderContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin: 8px;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
`;

const SliderLabel = styled.div`
    margin: 4px;
    width: 230px;
`;

interface Props {
    store: AnimationSelectionStore;
    showZoomSlider?: boolean;
    editMode: boolean;
}

export const AnimationPreviewComponent: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();
    const [previewZoom, setPreviewZoom] = useState(1);

    const previewWidth = 500;
    const previewHeight = 750;

    // Create/dispose on mount/dismount, and when AnimationPreviewCanvas changes on hot reload
    useEffect(() => {
        const disposer = autorun(handleAnimationSelectionChange);
        return disposer;
    }, [AnimationPreviewCanvas]);

    useEffect(() => {
        const animationPreviewCanvas = getAnimationPreviewCanvas();
        if (animationPreviewCanvas) {
            animationPreviewCanvas.editMode = props.editMode;
        }
    }, [props.editMode, getAnimationPreviewCanvas()]);

    useEffect(() => {
        handleAnimationSelectionChange();
    }, [sharedStore.animationAssets]);

    function onSliderChange(value: number) {
        if (!props.store.hasAnimationSelected)
            return;

        setPreviewZoom(value);

        const animationPreviewCanvas = getAnimationPreviewCanvas();
        animationPreviewCanvas?.updateZoom(value);
    }

    function handleAnimationSelectionChange() {
        const animationPreviewCanvas = getAnimationPreviewCanvas();
        if (props.store.hasAnimationSelected) {
            animationPreviewCanvas?.updateAnimation(props.store.selectedAnimation?.spine, props.store.selectedAnimation?.animation);
        } else {
            animationPreviewCanvas?.updateAnimation(null, null);
        }
    }

    return (
        <>
            <PreviewContainer width={previewWidth} height={previewHeight}>
                <AnimationPreviewCanvasContainer width={previewWidth} height={previewHeight} />
                {
                    props.store.currentlyLoadingAnimation && (
                        <SpinnerContainer width={previewWidth} height={previewHeight}>
                            <LoadingSpinner />
                        </SpinnerContainer>
                    )
                }
            </PreviewContainer>
            {
                props.showZoomSlider && (
                    <SliderContainer>
                        <SliderLabel>{t("editor.animation_preview_zoom") + ": " + Math.floor(previewZoom * 100) + "%"}</SliderLabel>
                        <Slider
                            value={previewZoom}
                            min={0.05}
                            max={2}
                            step={0.01}
                            renderTrack={SliderTrack}
                            renderThumb={SliderThumb}
                            onChange={onSliderChange}
                        />
                    </SliderContainer>
                )
            }
        </>
    );
});



