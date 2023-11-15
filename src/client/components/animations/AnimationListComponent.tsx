import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { MenuCardLabel, MenuCardLabelSuffix } from "../menu/MenuCardLabel";
import { MenuCard } from "../menu/MenuCard";
import styled from "styled-components";
import { MenuCardScrollContainer } from "../menu/MenuCardScrollContainer";
import { AnimationUploadSubMenu } from "./AnimationUploadSubMenu";
import { MdAnimation } from "react-icons/md";
import { undoableAnimationEditorSelectAnimation } from "../../stores/undo/operation/AnimationEditorSelectionOp";
import { undoableAnimationEditorDeleteAnimation } from "../../stores/undo/operation/AnimationEditorDeletionOp";
import { AdvancedListItem } from "../shared/AdvancedListItem";
import { animationEditorStore } from "../../stores/AnimationSelectionStore";
import { sharedStore } from "../../stores/SharedStore";
import { AnimationAssetModel } from "../../../shared/resources/AnimationAssetModel";
import { gameStore } from "../../stores/GameStore";

const ScrollContainer = styled(MenuCardScrollContainer)`
    height: 400px;
    margin-top: 4px;
    width: 250px;
`;

const AnimationIcon = styled(MdAnimation)`
    vertical-align: bottom;
    font-size: 20px;
    margin-right: 4px;
    color: black;
`;

export const AnimationListComponent: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const animations = new Array<AnimationAssetModel>();
    sharedStore.animationAssets?.forEach(animationAsset => animations.push(animationAsset));
    return (
        <MenuCard>
            <MenuCardLabel>
                {t("editor.animation_asset_list_title")}
                <MenuCardLabelSuffix>({sharedStore.animationAssets?.size})</MenuCardLabelSuffix>
            </MenuCardLabel>
            <AnimationUploadSubMenu />
            <ScrollContainer>
                {animations.map(animation => (
                    <AdvancedListItem
                        key={animation.$modelId}
                        itemObject={animation}
                        itemId={animation.id}
                        itemName={animation.localizedName.get(gameStore.languageKey)}
                        onConfirmDelete={undoableAnimationEditorDeleteAnimation}
                        isSelected={animationEditorStore.selectedAnimation?.animation.name == animation.name || animationEditorStore.currentlyLoadingAnimation == animation.name}
                        onSelectItem={(item) => {
                            undoableAnimationEditorSelectAnimation(item, animationEditorStore);
                        }}
                        i18nKeyDeleteModalTitle={"editor.animation_asset_delete_modal_title"}
                        i18nKeyDeleteModalMessage={"editor.animation_asset_delete_modal_message"}
                        icon={<AnimationIcon />}
                        allowDeletion={true}
                    />
                ))}
            </ScrollContainer>
        </MenuCard>
    );
});
