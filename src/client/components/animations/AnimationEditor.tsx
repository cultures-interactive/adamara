import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { Adjustment, SlideMenu, State } from "../menu/SlideMenu";
import { AnimationListComponent } from "./AnimationListComponent";
import { AnimationPreviewComponent } from "./AnimationPreviewComponent";
import { UndoRedoSlideMenu } from "../editor/UndoRedoSlideMenu";
import styled from "styled-components";
import { AnimationInspector } from "./AnimationInspector";
import { undoableAnimationEditorSelectAnimationState } from "../../stores/undo/operation/AnimationEditorSelectionOp";
import { animationEditorStore } from "../../stores/AnimationSelectionStore";
import { editorClient } from "../../communication/EditorClient";

const PreviewContainer = styled.div`
    position: absolute;
    left: 280px;
    top: 40px;
`;

export const AnimationEditor: React.FunctionComponent = observer(() => {
    useEffect(() => {
        if (!animationEditorStore.selectedAnimation)
            return undefined;

        editorClient.startTrackingAnimation(animationEditorStore.selectedAnimation.animation);
        return () => editorClient.stopTrackingAnimation();
    }, [animationEditorStore.selectedAnimation?.animation.id]);

    return (
        <>
            <SlideMenu
                orientation={Adjustment.Left}
                start={40}
                state={State.Expanded}
                collapsible={false}
                identifier={"animation"}>
                <AnimationListComponent />
            </SlideMenu>
            <UndoRedoSlideMenu />
            <PreviewContainer>
                <AnimationPreviewComponent store={animationEditorStore} showZoomSlider={true} editMode={true} />
            </PreviewContainer>
            {
                animationEditorStore.selectedAnimation && (
                    <AnimationInspector
                        onAnimationStateChange={(name) => {
                            undoableAnimationEditorSelectAnimationState(name, animationEditorStore);
                        }} />
                )
            }
        </>
    );
});
