import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { CharacterEditorSelectableItem } from "./CharacterEditorSelectableItem";
import { CharacterEditorStore } from "../../stores/CharacterEditorStore";
import { getAllCharacterSkinVariantNames } from "../../helper/spineHelper";
import { CharacterSelectionHelper } from "../../helper/CharacterSelectionHelper";
import { TabBorderColor } from "../game/ui components/GameUIElements";
import { CharacterEditorChangeGroup, groupUndoableCharacterEditorChanges } from "../../stores/undo/operation/CharacterEditorSubmitCharacterConfigurationChangesOp";
import { translationStore } from "../../stores/TranslationStore";
import { gameStore } from "../../stores/GameStore";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    background-color: #000000;
    align-items: center;
    width: 180px;
    padding-top: 16px;
    overflow: auto;
    
    transition: transform 0.33s ease;

    &.hidden {
        border: 0;
        visibility: hidden;
        transform-origin: left;
        transform: scaleX(0%);
    }

    &.shown {
        border-right: ${TabBorderColor} 4px solid;
        border-top: ${TabBorderColor} 4px solid;
        border-bottom: ${TabBorderColor} 4px solid;
        visibility: visible;
        transform-origin: left;
        transform: scaleX(100%);
    }
`;

const VariantButtonContainer = styled(CharacterEditorSelectableItem)`
    display: block;
    width: 155px;
    height: 60px;
`;

interface Props {
    store: CharacterEditorStore;
    isShown: boolean;
}

export const SelectionComponentSkinVariant: React.FunctionComponent<Props> = observer((props) => {
    const animationStore = props.store.animationSelectionStore;
    const allVariants = getAllCharacterSkinVariantNames(animationStore.selectedAnimation?.spine?.skeleton?.data?.skins, animationStore.selectedSkinClass);

    function onToggleSkinVariant(skinClassName: string, skinVariantName: string) {
        groupUndoableCharacterEditorChanges(CharacterEditorChangeGroup.UnspecificGroupedChanges, () => {
            const selectedConfig = props.store.selectedCharacterConfiguration;
            CharacterSelectionHelper.constrainedToggle(selectedConfig, allVariants, skinClassName, skinVariantName);
        });
    }

    return (
        <Container
            className={props.isShown ? "shown" : "hidden"}
        >
            {
                allVariants.map(name => (
                    <VariantButtonContainer
                        key={name}
                        className={props.store.selectedCharacterConfiguration.isSkinActive(animationStore.selectedSkinClass, name) ? "selected" : ""}
                        onClick={() => {
                            onToggleSkinVariant(animationStore.selectedSkinClass, name);
                        }}
                    >
                        {translationStore.makeshiftTranslationSystemData.characterSkinVariantOptions.getTranslation(gameStore.languageKey, name)}
                    </VariantButtonContainer>
                ))
            }
        </Container>
    );
});
