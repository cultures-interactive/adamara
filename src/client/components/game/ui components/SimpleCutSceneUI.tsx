import React from "react";
import { observer } from "mobx-react-lite";
import styled, { keyframes } from "styled-components";
import { FontFamily } from "./GameUIElements";
import AnimatedText from "react-animated-text-content";
import { GrFormNextLink } from "react-icons/gr";
import { CutSceneController, SimpleCutSceneProperties } from "../../../canvas/game/controller/CutSceneController";
import { useTranslation } from "react-i18next";
import { TextParser } from "../TextParser";
import { gameStore } from "../../../stores/GameStore";

const Row = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: end;
`;

function blinkingEffect() {
    return keyframes`
    50% {
        transform: scale(1.10);
        -webkit-transform: scale(1.10);
    }
  `;
}

const ContinueButton = styled.div`
    background-color: white;
    color: black;
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 6px;
    margin: 6px;
    animation: ${blinkingEffect} 1s ease infinite;
    border-radius: 4px;
    font-size: xx-large;
    cursor: pointer;
    border: 4px solid black;
`;

interface TextProps {
    backgroundColor: string;
    textColor: string;
}

const StyledAnimatedText = styled(AnimatedText) <TextProps>`
    background-color: ${props => props.backgroundColor};
    color: ${props => props.textColor};
    padding: 16px;
    font-size: x-large;
    border-radius: 4px;
    ${FontFamily}
    text-align: justify;
    border: 4px solid black;
`;

interface ContainerProps {
    flexBasis: number;
}

const Container = styled.div<ContainerProps>`
    flex-basis: ${props => props.flexBasis + "%"};
`;

interface Props {
    sceneProps: SimpleCutSceneProperties;
}

export const SimpleCutSceneUI: React.FunctionComponent<Props> = observer(({ sceneProps: sceneProps }) => {
    const { t } = useTranslation();

    const currentTextIndex = gameStore.gameEngine.gameState.actionPropertyCurrentCutSceneTextIndex;

    function onClickContinue() {
        if (currentTextIndex == sceneProps.text.length - 1) {
            CutSceneController.endCutScene(sceneProps.sourceActionModelId);
        } else {
            gameStore.gameEngine.gameState.setActionPropertyCurrentCutSceneTextIndex(currentTextIndex + 1);
        }
    }

    const parser = new TextParser();
    parser.parseString(sceneProps.text[currentTextIndex], gameStore.gameEngine.getCachedActionNode(sceneProps.sourceActionModelId), t);


    return (
        <Container flexBasis={sceneProps.textContainerWidthPercent[currentTextIndex]}>
            <Row>

                {
                    gameStore.cutSceneAnimationStore?.currentlyLoadingAnimation && (
                        <ContinueButton>
                            {t("game.loading") + "..."}
                        </ContinueButton>
                    )
                }

                {
                    !gameStore.cutSceneAnimationStore?.currentlyLoadingAnimation && (
                        <ContinueButton onClick={onClickContinue}>
                            <GrFormNextLink />
                        </ContinueButton>
                    )
                }

            </Row>
            {
                (sceneProps.text && !gameStore.cutSceneAnimationStore?.currentlyLoadingAnimation) && (
                    <StyledAnimatedText
                        backgroundColor={sceneProps.textStyle[currentTextIndex] == 1 ? "white" : "black"}
                        textColor={sceneProps.textStyle[currentTextIndex] == 1 ? "black" : "white"}
                        type='chars'
                        interval={sceneProps.enabledTypeAnimation[currentTextIndex] ? 0.02 : 0.00001}
                        duration={sceneProps.enabledTypeAnimation[currentTextIndex] ? 0.01 : 0.00001}
                        animation={{ ease: 'linear' }}
                    >
                        {parser.toString()}
                    </StyledAnimatedText>
                )
            }
        </Container>
    );
});