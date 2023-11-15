import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { AnimationPreviewComponent } from "../animations/AnimationPreviewComponent";
import { SelectionComponentSkinClass } from "./SelectionComponentSkinClass";
import { SelectionComponentSkinVariant } from "./SelectionComponentSkinVariant";
import { AnimationAssetModel, AnimationType } from "../../../shared/resources/AnimationAssetModel";
import { CharacterEditorSelectableItem } from "./CharacterEditorSelectableItem";
import { MdAccessibilityNew } from "react-icons/md";
import { CharacterEditorStore } from "../../stores/CharacterEditorStore";
import { useTranslation } from "react-i18next";
import { FaCheckCircle } from "react-icons/fa";
import { ComponentTurnCharacter } from "./ComponentTurnCharacter";
import { undoableAnimationEditorSelectAnimationState } from "../../stores/undo/operation/AnimationEditorSelectionOp";
import { SelectionComponentAnimationTint } from "./SelectionComponentAnimationTint";
import { CharacterAnimationSkinColors, getImageNameByBodyType } from "../../canvas/game/character/characterAnimationHelper";
import { EditorSingleCharacterPropertiesGame } from "./EditorSingleCharacterPropertiesGame";
import { EditorSingleCharacterPropertiesEditor } from "./EditorSingleCharacterPropertiesEditor";
import { sharedStore } from "../../stores/SharedStore";
import { gameStore } from "../../stores/GameStore";
import { soundCache } from "../../stores/SoundCache";
import { UiSounds } from "../../canvas/game/sound/UiSounds";
import { staticImageAssetFolder } from "../../canvas/loader/StaticAssetLoader";
import { animationLoader } from "../../helper/AnimationLoader";
import { CharacterSelectionHelper } from "../../helper/CharacterSelectionHelper";
import { CharacterEditorChangeGroup, groupUndoableCharacterEditorChanges } from "../../stores/undo/operation/CharacterEditorSubmitCharacterConfigurationChangesOp";
import { CharacterEditorColorButton } from "../game/ui components/GameUIElements";

const AreaColumn = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    padding: 10px;
`;

const AreaColumnSpacer = styled.div`
    display: flex;
    flex-grow: 1;
`;

const AreaRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    padding: 10px;
`;

const VerticalScrollAreaRow = styled(AreaRow)`
    flex-direction: row;
    overflow-x: hidden;
    overflow-y: auto;
`;

const FlexRowZero = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 0;
`;

const FlexRowOne = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
`;

const FlexColumnZero = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 0;
`;

const BodyShapeSelection = styled(FlexRowZero)`
    max-width: 444px;
    flex-wrap: wrap;
`;

const Item = styled(CharacterEditorSelectableItem)`
    width: 100px;
    height: 100px;
    text-align: center;
    align-items: center;
    justify-content: center;
`;

const BodyShapeImage = styled.img`
    max-height: 80px;
`;

const MissingItem = styled(CharacterEditorSelectableItem)`
    width: 100px;
    height: 190px;
    color: red;
    cursor: not-allowed;
`;

const BodyPlaceholder = styled(MdAccessibilityNew)`
    font-size: 50px;
    text-align: center;
    flex-grow:1;
`;

export interface Props {
    store: CharacterEditorStore;
    onFinish?: () => void;
    finishButtonTranslationKey?: string;
    checkUniqueName: boolean;
    isGame: boolean;
}

const FinishButton = styled.div`
    float: right;
    display: flex;
    flex-direction: row;
    background-color: ${CharacterEditorColorButton};
    height: 40px;
    width: 160px;
    color: black;
    cursor: pointer;
    border-radius: 10px;
    align-content: center;
    justify-content: center;
    padding-top: 4px;
    margin-bottom: 10px;

    &.disabled {
        background-color: #3c3c3c;
        border-color: black;
        cursor: not-allowed;
    }
`;

const CheckIcon = styled(FaCheckCircle)`
    margin-right: 4px;
`;

export const EditorSingleCharacter: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();

    const animationStore = props.store.animationSelectionStore;

    const playerNameIsNeededAndNotSet = props.isGame && !gameStore.playerName;
    const finishEnabled = !playerNameIsNeededAndNotSet;

    function getBodyShapeImageUrl(bodyShapeName: string) {
        const imageName = getImageNameByBodyType(bodyShapeName);
        return imageName != null ? (staticImageAssetFolder + imageName + ".png") : null;
    }

    async function onClickSelectBodyShape(animationModel: AnimationAssetModel) {
        const { skins } = await animationLoader.loadAnimationDataCached(animationModel.id);

        groupUndoableCharacterEditorChanges(CharacterEditorChangeGroup.UnspecificGroupedChanges, () => {
            props.store.selectedCharacterConfiguration.setAnimationAssetName(animationModel.name);
            CharacterSelectionHelper.randomizeSkinSelection(skins, props.store.selectedCharacterConfiguration);
            animationStore.setSelectedSkinClass(null);
        });
    }

    function onColorSelectionChange(hexColor: string) {
        props.store.selectedCharacterConfiguration.setTintColorHex(hexColor);
    }

    function onClickFinish() {
        if (finishEnabled) {
            props.onFinish();
        }
    }

    useEffect(() => {
        const backgroundSound = props.isGame ? soundCache.playOneOf(UiSounds.CHAR_EDITOR_MUSIC, true) : null;
        return () => {
            backgroundSound?.stop();
        };
    }, []);

    const animationsBodyType = sharedStore.getAnimationsByType(AnimationType.BodyType);
    const animationsNPC = sharedStore.getAnimationsByType(AnimationType.NPC);
    const selectedAnimationName = props.store.selectedCharacterConfiguration.animationAssetName;

    return (
        <>
            <AreaColumn>
                {props.isGame
                    ? <EditorSingleCharacterPropertiesGame />
                    : <EditorSingleCharacterPropertiesEditor store={props.store} />
                }
                <FlexColumnZero>
                    <FlexRowOne>
                        {t("editor.character_config_skin_color")}
                    </FlexRowOne>
                    <FlexRowOne>
                        <SelectionComponentAnimationTint
                            hexColors={CharacterAnimationSkinColors}
                            store={props.store}
                            onColorSelectionChange={onColorSelectionChange}
                        />
                    </FlexRowOne>
                </FlexColumnZero>

                <FlexColumnZero>
                    {t("editor.character_config_body_shape")}
                    <BodyShapeSelection>
                        {animationsBodyType.map(animationSnapshot => (
                            <Item
                                key={animationSnapshot.$modelId}
                                className={animationStore.selectedAnimation?.animation?.name == animationSnapshot?.name ? "selected" : ""}
                                onClick={async () => { await onClickSelectBodyShape(animationSnapshot); }}
                            >
                                {(getImageNameByBodyType(animationSnapshot?.name) != null) && (
                                    <BodyShapeImage src={getBodyShapeImageUrl(animationSnapshot?.name)} />
                                )}
                                {(getImageNameByBodyType(animationSnapshot?.name) == null) && (
                                    <>
                                        <BodyPlaceholder />
                                        {animationSnapshot?.localizedName.get(gameStore.languageKey)}
                                    </>
                                )}
                            </Item>
                        ))}

                        {props.store.hasMissingAnimationReference && (
                            <MissingItem className={!animationStore.selectedAnimation ? "selected" : ""}>
                                <BodyPlaceholder />
                                {t("editor.character_config_reference_animation_missing")}
                                {props.store.selectedCharacterConfiguration.animationAssetName}
                            </MissingItem>
                        )}
                    </BodyShapeSelection>
                </FlexColumnZero>

                {!props.isGame && (
                    <FlexColumnZero>
                        <select
                            value={selectedAnimationName}
                            onChange={({ target }) => onClickSelectBodyShape(animationsNPC.find(animation => animation.name === target.value))}
                        >
                            {animationsNPC.map(animation => <option key={animation.name} value={animation.name}>{animation?.name}</option>)}
                            {(animationsNPC.every(animation => animation.name !== selectedAnimationName) && animationsBodyType.some(animation => animation.name === selectedAnimationName)) && (
                                <option value={selectedAnimationName}>{sharedStore.getAnimationByName(selectedAnimationName).localizedName.get(gameStore.languageKey)}</option>
                            )}
                            {
                                props.store.hasMissingAnimationReference && (
                                    <option value={props.store.selectedCharacterConfiguration.animationAssetName} disabled={true}>
                                        {t("editor.character_config_reference_animation_missing")} {props.store.selectedCharacterConfiguration.animationAssetName}
                                    </option>
                                )
                            }
                        </select>
                    </FlexColumnZero>
                )}
            </AreaColumn>

            <AreaColumn>
                <FlexRowOne>
                    <AnimationPreviewComponent store={animationStore} editMode={false} />
                </FlexRowOne>
                <FlexRowOne>
                    <ComponentTurnCharacter onAnimationStateChange={(name) => {
                        undoableAnimationEditorSelectAnimationState(name, animationStore);
                    }} />
                </FlexRowOne>
            </AreaColumn>

            <AreaColumnSpacer />

            <AreaColumn>
                <VerticalScrollAreaRow>
                    {props.store.animationSelectionStore.selectedAnimation && (
                        <>
                            <SelectionComponentSkinClass store={props.store} />
                            <SelectionComponentSkinVariant
                                isShown={props.store.animationSelectionStore.selectedSkinClass != null}
                                store={props.store}
                            />
                        </>
                    )}
                </VerticalScrollAreaRow>
                {props.isGame && (
                    <FinishButton className={finishEnabled ? "" : "disabled"} onClick={onClickFinish}>
                        <CheckIcon />
                        {t(props.finishButtonTranslationKey)}
                    </FinishButton>
                )}
            </AreaColumn>
        </>
    );
});
