import React from 'react';
import { observer } from "mobx-react-lite";
import { ItemSelectionMode } from '../../../../../shared/action/ActionModel';
import { useTranslation } from 'react-i18next';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { ItemSelector } from '../../selector/ItemSelector';
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { Dropdown } from "../../../editor/Dropdown";
import { Input } from "../../../editor/Input";
import { isBlank } from "../../../../../shared/helper/generalHelpers";
import { gameStore } from '../../../../stores/GameStore';
import { itemStore } from '../../../../stores/ItemStore';
import { ActionTreeModel } from '../../../../../shared/action/ActionTreeModel';
import { ElementGroup, ElementLabel } from './BaseElements';

interface ItemSelectionActionDetailProps {
    parentTree: ActionTreeModel;
    name?: string;
    itemIdOrTags: string;
    itemIdOrTagsSetter: (value: string) => void;
    selectionMode: ItemSelectionMode;
    selectionModeSetter: (value: ItemSelectionMode) => void;
    allowBlankValue?: boolean;
}

export const ItemSelectionActionDetail: React.FunctionComponent<ItemSelectionActionDetailProps> = observer(({ parentTree, name, itemIdOrTags, itemIdOrTagsSetter, selectionMode, selectionModeSetter, allowBlankValue }) => {
    const { t } = useTranslation();
    const { languageKey } = gameStore;

    const useTags = selectionMode !== ItemSelectionMode.Item;
    const multipleTags = useTags && selectionMode !== ItemSelectionMode.ItemWithOneTag;
    const itemIdsOrTags = useTags ? itemStore.getAllItemTags() : itemStore.getAllItems.map(i => i.id);
    const itemNamesOrTags = useTags ? itemStore.getAllItemTags() : itemStore.getAllItems.map(i => i.name.get(languageKey));

    const parameters = parentTree.treeParameterActions(useTags ? "actions/ItemTagValueModel" : "actions/ItemIdValueModel").map(a => formatTreeParameter(a.name));
    const allItemIdsOrTags = ["", ...parameters, ...itemIdsOrTags];
    const allItemOrTagsLiterals = ["", ...parameters, ...itemNamesOrTags];

    const changeSelectionMode = (newMode: ItemSelectionMode) => {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
            if (newMode === ItemSelectionMode.Item || newMode === ItemSelectionMode.ItemWithOneTag) {
                // reset when changing to a 'single thing' drop-down selection
                itemIdOrTagsSetter("");
            }
            selectionModeSetter(newMode);
        });
    };

    return (
        <>
            {
                selectionModeSetter && (
                    <ElementGroup>
                        <Dropdown
                            value={selectionMode}
                            onChange={({ target }) => changeSelectionMode(parseInt(target.value))}
                        >
                            {
                                Object.keys(ItemSelectionMode).filter(value => !Number.isNaN(Number(value))).map((mode: keyof typeof ItemSelectionMode) =>
                                    <option key={mode} value={mode}>{t("content.item_selection_mode_" + ItemSelectionMode[mode])}</option>
                                )
                            }
                        </Dropdown>
                    </ElementGroup>
                )
            }
            {name && <ElementLabel>{name}</ElementLabel>}
            {
                !multipleTags && !useTags && (
                    <ElementGroup>
                        <ItemSelector
                            value={itemIdOrTags}
                            valueSetter={itemIdOrTagsSetter}
                            treeParameters={parameters}
                            allowBlankValue={allowBlankValue}
                        />
                    </ElementGroup>
                )
            }
            {
                !multipleTags && useTags && (
                    <ElementGroup>
                        <Dropdown
                            className={(!allowBlankValue && isBlank(itemIdOrTags)) ? "invalid" : ""}
                            value={itemIdOrTags}
                            onChange={({ target }) => itemIdOrTagsSetter(target.value)}
                        >
                            {
                                allItemIdsOrTags.map((itemId, index) => <option key={itemId} value={itemId}>{allItemOrTagsLiterals[index]}</option>)
                            }
                        </Dropdown>
                    </ElementGroup>
                )
            }
            {
                multipleTags && (
                    <ElementGroup>
                        <Input
                            className={(!allowBlankValue && isBlank(itemIdOrTags)) ? "invalid" : ""}
                            type="text"
                            value={itemIdOrTags}
                            onChange={({ target }) => itemIdOrTagsSetter(target.value)}
                        />
                    </ElementGroup>
                )
            }
        </>
    );
});