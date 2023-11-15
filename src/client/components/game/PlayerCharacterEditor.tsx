import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { EditorSingleCharacter } from "../character/EditorSingleCharacter";
import { AnimationType } from "../../../shared/resources/AnimationAssetModel";
import { useTranslation } from "react-i18next";
import { AutoScaleContainer as AutoScaleContainer } from "./AutoScaleContainer";
import { gameStore } from "../../stores/GameStore";
import { sharedStore } from "../../stores/SharedStore";
import { createRandomBodyTypeCharacter } from "../../helper/characterHelpers";
import { errorStore } from "../../stores/ErrorStore";

const Container = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
    width: 100%;
    border: black 1px solid;
    gap: 10px;
    font-size: xx-large;
    background-color: black;
    color: white;
`;

export const PlayerCharacterEditor: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const charAnimations = sharedStore.getAnimationsByType(AnimationType.BodyType);

    function onFinish() {
        gameStore.setPlayerCharacter(gameStore.characterEditorStore.selectedCharacterConfiguration);
    }

    useEffect(() => {
        if (!gameStore.characterEditorStore.selectedCharacterConfiguration) {
            createRandomBodyTypeCharacter()
                .then(gameStore.characterEditorStore.setSelectedCharacter)
                .catch(errorStore.addErrorFromErrorObject);
        }
    }, []);

    if (!gameStore.characterEditorStore.selectedCharacterConfiguration)
        return null;

    return (
        <AutoScaleContainer width={1360} height={820}>
            <Container>
                {
                    (charAnimations.length > 0) && (
                        <EditorSingleCharacter
                            store={gameStore.characterEditorStore}
                            onFinish={onFinish}
                            finishButtonTranslationKey={"game.character_config_finished"}
                            checkUniqueName={false}
                            isGame={true}
                        />
                    )
                }

                {
                    (charAnimations.length == 0) && (
                        <>{t("game.character_config_error_no_animations")}</>
                    )
                }

            </Container>
        </AutoScaleContainer>
    );
});
