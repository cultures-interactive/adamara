import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { EditorSingleCharacter } from "./EditorSingleCharacter";
import { charEditorStore } from "../../stores/CharacterEditorStore";
import { Popup } from "../shared/Popup";
import { undoableCharacterEditorDeselectCharacter } from "../../stores/undo/operation/CharacterEditorSelectCharacterOp";
import { UiConstants } from "../../data/UiConstants";
import { HeaderUndoRedo } from "../editor/HeaderUndoRedo";
import { PopupAutoScaleContainer } from "../game/PopupAutoScaleContainer";
import { CharacterDeleteButton } from "./CharacterDeleteButton";
import { undoableCharacterEditorDeleteCharacter } from "../../stores/undo/operation/CharacterEditorDeletionOp";

const Content = styled.div`
    display: flex;
    flex-direction: row;
    border: black 1px solid;
    gap: 10px;
    background-color: black;
    color: white;
    height: 100%;
`;

const ButtonContainer = styled.div`
    display: flex;
    padding-bottom: 10px;
`;

const Spacer = styled.div`
    width: 20px;
`;

export const EditorCharacterPopup: React.FunctionComponent = observer(() => {
    if (!charEditorStore.selectedCharacterConfiguration)
        return null;

    return (
        <Popup
            zIndex={UiConstants.Z_INDEX_CHARACTER_EDITOR_POPUP}
            closePopup={() => undoableCharacterEditorDeselectCharacter(charEditorStore)}
        >
            <ButtonContainer>
                <HeaderUndoRedo />
                <Spacer />
                <CharacterDeleteButton
                    onConfirm={() => undoableCharacterEditorDeleteCharacter(charEditorStore.selectedCharacterConfiguration.id, charEditorStore)}
                />
            </ButtonContainer>
            <PopupAutoScaleContainer
                width={1360}
                height={820}
                staticBorderX={90}
                staticBorderY={110}
                percentageBorderX={0.1}
                percentageBorderY={0.1}
            >
                <Content>
                    <EditorSingleCharacter
                        store={charEditorStore}
                        checkUniqueName={true}
                        isGame={false}
                    />
                </Content>
            </PopupAutoScaleContainer>
        </Popup>
    );
});