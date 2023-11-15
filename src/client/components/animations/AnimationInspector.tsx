import React, { ChangeEvent, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { Menu } from "../menu/SlideMenu";
import { MenuCard } from "../menu/MenuCard";
import { MenuCardLabel, MenuCardLabelSuffix } from "../menu/MenuCardLabel";
import { useTranslation } from "react-i18next";
import { SelectButton } from "../shared/SelectButton";
import { Skin } from '@pixi-spine/all-4.1';
import { AnimationSkinCombinator } from "../../canvas/shared/animation/AnimationSkinCombinator";
import { MenuCardScrollContainer } from "../menu/MenuCardScrollContainer";
import { UiConstants } from "../../data/UiConstants";
import { MdAccessibilityNew } from "react-icons/md";
import { SelectionComponentAnimationState } from "../character/SelectionComponentAnimationState";
import { KeyValueRow, ListEntryKey, ListEntryValue } from "../shared/KeyValueRow";
import { dataConstants } from "../../../shared/data/dataConstants";
import { AnimationAssetModel, AnimationType } from "../../../shared/resources/AnimationAssetModel";
import { undoableCharacterEditorOpenSelection } from "../../stores/undo/operation/CharacterEditorOpenSelectionOp";
import { useHistory } from "react-router-dom";
import { hasAllMovementStates } from "../../canvas/game/character/characterAnimationHelper";
import { animationLoader } from "../../helper/AnimationLoader";
import { WarnIndicatorIcon } from "../shared/AdvancedListItem";
import { InvalidCriteriaMessage } from "../shared/InvalidCriteriaMessage";
import { animationEditorStore } from "../../stores/AnimationSelectionStore";
import { gameStore } from "../../stores/GameStore";
import { sharedStore } from "../../stores/SharedStore";
import { FloatInputField } from "../shared/FloatInputField";
import { tileOffsetAndSizeStep } from "../../../shared/data/mapElementSorting";

const Container = styled.div`
    position: absolute;
    top: 40px;
    left: 800px;
    width: 400px;
`;

const ScrollContainer = styled(MenuCardScrollContainer)`
    max-height: 300px;
    margin-top: 4px;
`;

const SmallScrollContainer = styled(MenuCardScrollContainer)`
    max-height: 150px;
    margin-top: 4px;
`;

const UsageListEntry = styled.div`
    margin: 2px;

    &:hover {
        cursor: pointer;
        background-color: ${UiConstants.COLOR_HOVER};
    }
`;

export const CharacterIcon = styled(MdAccessibilityNew)`
    vertical-align: bottom;
    font-size: 16px;
    margin-right: 4px;
    color: black;
`;

const Selection = styled.select`
    display: flex;
`;

interface Props {
    onAnimationStateChange: (stateName: string) => void;
}

export const AnimationInspector: React.FunctionComponent<Props> = observer((props) => {
    const history = useHistory();
    const { t } = useTranslation();
    const [selectedSkinNames, setSelectedSkinNames] = useState([]);
    const [skinCombinator] = useState(new AnimationSkinCombinator(animationEditorStore.selectedAnimation?.spine.spineData?.skins));

    const selectedAnimation = animationEditorStore.selectedAnimation?.animation;
    const animation = sharedStore.getAnimation(selectedAnimation?.id);
    if (!animation)
        return null;

    function skinClicked(skin: Skin) {
        if (skinCombinator.contains(skin.name)) {
            skinCombinator.remove(skin.name);
            setSelectedSkinNames(selectedSkinNames.filter(name => name != skin.name));
        } else {
            skinCombinator.add(skin.name);
            selectedSkinNames.push(skin.name);
            setSelectedSkinNames(selectedSkinNames.slice());
        }
        skinCombinator.applyTo(animationEditorStore.selectedAnimation?.spine.skeleton);
    }

    function onClickCharacterUsage(characterId: number) {
        undoableCharacterEditorOpenSelection(characterId, history);
    }

    async function onTypeSelectionChanged(event: ChangeEvent<HTMLSelectElement>) {
        animationEditorStore.selectedAnimation.animation.setType(AnimationType[event.target.value as keyof typeof AnimationType]);
    }

    const animationUsages = sharedStore.getCharactersThatReferencingAnimation(selectedAnimation.name);
    const createdDate = selectedAnimation.createdAt
        ? dataConstants.defaultDateTimeFormat.format(new Date(selectedAnimation.createdAt))
        : "";
    const allMovementStates = hasAllMovementStates(animationEditorStore.selectedAnimation?.spine);
    const isEmptySpine = animationLoader.isEmptySpine(animationEditorStore.selectedAnimation?.spine);

    return (
        <Container>
            {
                animationEditorStore.selectedAnimation?.spine?.spineData && (
                    <>
                        <Menu className={"expanded"}>
                            <MenuCard>
                                <MenuCardLabel>{t("editor.animation_asset_upload_properties")}</MenuCardLabel>
                                <KeyValueRow>
                                    <ListEntryKey>
                                        {t("editor.animation_asset_creation_date")}:
                                    </ListEntryKey>
                                    <ListEntryValue>
                                        {createdDate}
                                    </ListEntryValue>
                                </KeyValueRow>
                                <KeyValueRow>
                                    <ListEntryKey>
                                        {t("editor.translated_name")}:
                                    </ListEntryKey>
                                    <ListEntryValue>
                                        <input
                                            type="text"
                                            value={animation.localizedName.get(gameStore.languageKey, false)}
                                            placeholder={animation.localizedName.get(gameStore.languageKey, true)}
                                            onChange={({ target }) => animation.localizedName.set(gameStore.languageKey, target.value)}
                                        />
                                    </ListEntryValue>
                                </KeyValueRow>
                                <td></td>
                                <td>
                                </td>
                                <KeyValueRow>
                                    <ListEntryKey>
                                        {t("editor.animation_asset_upload_type")}:
                                    </ListEntryKey>
                                    <ListEntryValue>
                                        <Selection value={animation?.typeName} onChange={onTypeSelectionChanged}>
                                            {
                                                AnimationAssetModel.allTypeNames.map(animationTypeName => (
                                                    <option key={animationTypeName} value={animationTypeName}>
                                                        {t("editor.animation_type_" + animationTypeName)}
                                                    </option>
                                                ))
                                            }
                                        </Selection>
                                    </ListEntryValue>
                                </KeyValueRow>
                                <KeyValueRow>
                                    <ListEntryKey>
                                        {t("editor.animation_asset_movement_supported")}:
                                    </ListEntryKey>
                                    <ListEntryValue>
                                        {allMovementStates == true ? t("editor.yes") : t("editor.no")}
                                    </ListEntryValue>
                                </KeyValueRow>

                                {
                                    isEmptySpine && (
                                        <InvalidCriteriaMessage>
                                            <WarnIndicatorIcon />
                                            {t("editor.animation_asset_invalid")}
                                        </InvalidCriteriaMessage>
                                    )
                                }

                            </MenuCard>

                            {
                                ((!selectedAnimation.isType(AnimationType.None) && !selectedAnimation.isType(AnimationType.Cutscene)) && (
                                    <MenuCard>
                                        <MenuCardLabel>{t("editor.animation_asset_properties_on_map")}</MenuCardLabel>
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>{t("editor.animation_asset_scale")}:</td>
                                                    <td>
                                                        <FloatInputField value={animation.scale} min={0.05} step={0.05} onChange={value => { animation.setScale(value); }} />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>{t("editor.tile_asset_offset")}:</td>
                                                    <td>
                                                        x <FloatInputField value={animation.offsetX} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { animation.setOffsetX(value); }} />
                                                        &nbsp;
                                                        y <FloatInputField value={animation.offsetY} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { animation.setOffsetY(value); }} />
                                                        &nbsp;
                                                        z <FloatInputField value={animation.internalOffsetZ} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { animation.setInternalOffsetZ(value); }} />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>{t("editor.tile_asset_size")}:</td>
                                                    <td>
                                                        <div>
                                                            x <FloatInputField value={animation.size.x} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { animation.setSizeX(value); }} />
                                                            &nbsp;
                                                            y <FloatInputField value={animation.size.y} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { animation.setSizeY(value); }} />
                                                            &nbsp;
                                                            z <FloatInputField value={animation.size.z} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { animation.setSizeZ(value); }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </MenuCard>
                                ))
                            }

                            {
                                (animationEditorStore.selectedAnimation?.spine.spineData?.animations.length > 0) && (
                                    <MenuCard>
                                        <MenuCardLabel>
                                            {t("editor.animation_asset_upload_states_title")}
                                            <MenuCardLabelSuffix>({animationEditorStore.selectedAnimation?.spine.spineData?.animations.length})</MenuCardLabelSuffix>
                                        </MenuCardLabel>
                                        <SelectionComponentAnimationState
                                            onAnimationStateChange={props.onAnimationStateChange}
                                            store={animationEditorStore}
                                            buttonType={SelectButton} />
                                    </MenuCard>
                                )
                            }

                            {
                                (animationEditorStore.selectedAnimation?.spine.skeleton.data?.skins.length > 0) && (
                                    <MenuCard>
                                        <MenuCardLabel>
                                            {t("editor.animation_asset_upload_skins_title")}
                                            <MenuCardLabelSuffix>
                                                ({animationEditorStore.selectedAnimation?.spine.skeleton.data?.skins.length})
                                            </MenuCardLabelSuffix>
                                        </MenuCardLabel>

                                        <ScrollContainer>
                                            {
                                                animationEditorStore.selectedAnimation?.spine.skeleton.data?.skins
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(skin => (
                                                        <SelectButton
                                                            key={skin.name}
                                                            className={selectedSkinNames.includes(skin.name) ? "selected block" : "block"}
                                                            onClick={() => skinClicked(skin)}
                                                        >
                                                            {skin.name}
                                                        </SelectButton>
                                                    ))
                                            }
                                        </ScrollContainer>
                                    </MenuCard>
                                )
                            }

                            {
                                animationUsages.length > 0 &&
                                (
                                    <MenuCard>
                                        <MenuCardLabel>
                                            {t("editor.animation_asset_upload_usages_title")}
                                            <MenuCardLabelSuffix>({animationUsages.length})</MenuCardLabelSuffix>
                                        </MenuCardLabel>

                                        <SmallScrollContainer>
                                            {
                                                animationUsages.map(character => (
                                                    <UsageListEntry
                                                        key={character.id}
                                                        onClick={() => { onClickCharacterUsage(character.id); }}
                                                    >
                                                        <CharacterIcon />{character.localizedName.get(gameStore.languageKey)}
                                                    </UsageListEntry>
                                                ))
                                            }
                                        </SmallScrollContainer>
                                    </MenuCard>
                                )
                            }
                        </Menu>
                    </>
                )
            }
        </Container>
    );
});
