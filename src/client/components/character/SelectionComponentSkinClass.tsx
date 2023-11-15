import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { CharacterEditorSelectableItem } from "./CharacterEditorSelectableItem";
import { undoableCharacterEditorSelectSkinClass } from "../../stores/undo/operation/CharacterEditorStateChangeOp";
import { CharacterEditorStore } from "../../stores/CharacterEditorStore";
import { getAllSkinClassNames } from "../../helper/spineHelper";
import { SkinClassIcon } from "./SkinClassIcon";
import { TabBorderColor } from "../game/ui components/GameUIElements";
import { GiRollingDices } from "react-icons/gi";
import { sharedStore } from "../../stores/SharedStore";
import { animationLoader } from "../../helper/AnimationLoader";
import { CharacterSelectionHelper } from "../../helper/CharacterSelectionHelper";
import { CharacterEditorChangeGroup, groupUndoableCharacterEditorChanges } from "../../stores/undo/operation/CharacterEditorSubmitCharacterConfigurationChangesOp";

const ContainerWidth = "130px";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: ${() => ContainerWidth};

    &.selected {
        border-right: ${TabBorderColor} 4px solid;
    }
`;

const ClassButtonContainer = styled(CharacterEditorSelectableItem)`
    width: 111px;
    height: 60px;
    align-items: center;
    justify-content: center;
    text-align: center;
  
    &.selected {
        width: ${() => ContainerWidth};
        background-color: #000000;
        border-right: 0;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-color: ${TabBorderColor};
    }
`;

const RandomizeButtonContainer = styled(CharacterEditorSelectableItem)`
    width: 80px;
    height: 80px;
    align-items: center;
    justify-content: center;
    text-align: center;
`;


interface Props {
    store: CharacterEditorStore;
}

export const SelectionComponentSkinClass: React.FunctionComponent<Props> = observer((props) => {
    const [classNames, setClassNames] = useState([]);
    const animationStore = props.store.animationSelectionStore;

    function onSkinClassSelected(className: string) {
        undoableCharacterEditorSelectSkinClass(className, props.store);
    }

    useEffect(() => {
        setClassNames(getAllSkinClassNames(animationStore.selectedAnimation?.spine?.skeleton?.data?.skins));
    }, [animationStore.selectedAnimation]);

    return (
        <Container
            className={animationStore.selectedSkinClass ? "selected" : ""}
        >
            {
                classNames.map(name => (
                    <ClassButtonContainer
                        key={name}
                        className={animationStore.selectedSkinClass == name ? "selected" : ""}
                        onClick={() => onSkinClassSelected(name)}
                    >
                        <SkinClassIcon className={name} />
                    </ClassButtonContainer>
                ))
            }

            {(classNames.length > 0) && (
                <RandomizeButtonContainer onClick={async () => {
                    const { selectedCharacterConfiguration } = props.store;
                    const animationAsset = sharedStore.getAnimationByName(selectedCharacterConfiguration.animationAssetName);
                    if (!animationAsset)
                        return;

                    const { skins } = await animationLoader.loadAnimationDataCached(animationAsset.id);

                    groupUndoableCharacterEditorChanges(CharacterEditorChangeGroup.UnspecificGroupedChanges, () => {
                        CharacterSelectionHelper.randomizeSkinSelection(skins, selectedCharacterConfiguration);
                    });
                }}>
                    <GiRollingDices size={50} />
                </RandomizeButtonContainer>
            )}
        </Container>
    );
});
