import React, { ElementType } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { AnimationSelectionStore } from "../../stores/AnimationSelectionStore";

const Container = styled.div`
    display: flex;
    flex-direction: row;
`;

interface Props {
    onAnimationStateChange: (stateName: string) => void;
    store: AnimationSelectionStore;
    buttonType: ElementType;
}

export const SelectionComponentAnimationState: React.FunctionComponent<Props>
    = observer(({ onAnimationStateChange, store, buttonType: Button = "div" }) => {
        return (
            <Container>
                {
                    store.selectedAnimation?.spine?.spineData?.animations.map(animationState => (
                        <Button
                            className={store.selectedAnimationState == animationState.name ? "selected" : ""}
                            key={animationState.name}
                            onClick={() => { onAnimationStateChange(animationState.name); }}
                        > {animationState.name}
                        </Button>
                    ))
                }
            </Container>
        );
    });
