import React from 'react';
import { observer } from "mobx-react-lite";
import { MenuCard } from '../menu/MenuCard';
import { MenuCardLabel } from '../menu/MenuCardLabel';
import { useTranslation } from 'react-i18next';
import { BsBoxArrowInDownLeft } from 'react-icons/bs';
import styled from 'styled-components';
import { FaMinusCircle } from 'react-icons/fa';
import { undoableActionEditorSelectActionTreeHierachy } from '../../stores/undo/operation/ActionEditorSelectActionTreeHierarchy';
import { undoableActionEditorDeleteTemplate } from '../../stores/undo/operation/ActionEditorDeleteTemplateOp';
import { actionEditorStore } from '../../stores/ActionEditorStore';
import { sharedStore } from '../../stores/SharedStore';
import { gameStore } from '../../stores/GameStore';

const DeleteButton = styled.button`
    color: #DD0000;
`;

export const ActionTreeInfo: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { currentActionTreeHierarchy, currentRootActionTree, treeFocussedForWorkshop } = actionEditorStore;

    const hierarchyNames = currentActionTreeHierarchy.map((subTreeNode, i) => {
        if (i > 0)
            return <div key={i}>{subTreeNode.treePropertiesAction?.localizedName.get(gameStore.languageKey)}</div>;

        return null;
    });

    const backToMainGameRootActionTree = () => {
        undoableActionEditorSelectActionTreeHierachy([sharedStore.mainGameRootActionTree.$modelId]);
    };

    const deleteTemplate = async () => {
        undoableActionEditorDeleteTemplate(currentRootActionTree);
    };

    const isMainGameRootOpen = currentRootActionTree === sharedStore.mainGameRootActionTree;

    return (
        <MenuCard minWidth={"200px"} minHeight={"80px"}>
            <MenuCardLabel>
                {(!isMainGameRootOpen && !treeFocussedForWorkshop) && <BsBoxArrowInDownLeft onClick={() => backToMainGameRootActionTree()} />}
                {(isMainGameRootOpen || treeFocussedForWorkshop)
                    ? treeFocussedForWorkshop
                        ? t("action_editor.tree_module") + ": " + currentRootActionTree.treePropertiesAction?.localizedName.get(gameStore.languageKey)
                        : t("action_editor.tree_module") + ": " + t("action_editor.tree_module_main_game")
                    : currentRootActionTree.treePropertiesAction?.localizedName.get(gameStore.languageKey)
                }
            </MenuCardLabel>
            {!(isMainGameRootOpen || treeFocussedForWorkshop) && <div><DeleteButton onClick={deleteTemplate}><FaMinusCircle /> {t("action_editor.tree_delete_template")}</DeleteButton></div>}
            {currentActionTreeHierarchy.length > 1 &&
                <>
                    <MenuCardLabel>
                        {t("action_editor.tree_hierarchy")}
                    </MenuCardLabel>
                    {hierarchyNames}
                </>
            }
        </MenuCard>
    );
});
