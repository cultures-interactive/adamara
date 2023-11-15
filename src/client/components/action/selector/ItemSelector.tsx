import React from "react";
import { useTranslation } from "react-i18next";
import { ItemModel } from "../../../../shared/game/ItemModel";
import { ItemEditorWindow } from "./windows/ItemEditorWindow";
import { Selector } from "./Selector";
import { parseFormattedTreeParameter } from "../../../../shared/helper/actionTreeHelper";
import { isBlank } from "../../../../shared/helper/generalHelpers";
import { gameStore } from "../../../stores/GameStore";
import { itemStore } from "../../../stores/ItemStore";
import { imageStore } from "../../../stores/ImageStore";
import { ItemImageMissingIcon, NoItemIcon } from "../../editor/ElementIcons";

interface ItemSelectorProps {
    value: string;
    valueSetter: (value: string) => void;
    treeParameters: string[];
    allowBlankValue?: boolean;
}

export const ItemSelector: React.FunctionComponent<ItemSelectorProps> = (props) => {
    const { t } = useTranslation();

    const filteredItemList = (tagToFilter: string) => {
        if (tagToFilter !== "") return itemStore.getItemsForTag(tagToFilter);
        const parameters = props.treeParameters.map(treeParameter => {
            const parameterItem = new ItemModel({ id: treeParameter });
            parameterItem.name.set(gameStore.languageKey, treeParameter);
            return parameterItem;
        });
        return [...parameters, ...itemStore.getAllItems].sort(a => a.moduleOwner ? -1 : 1);
    };

    const prepareNewItem = () => {
        itemStore.setSelectedItem(null);
    };

    const buttonLabel = () => {
        if (parseFormattedTreeParameter(props.value))
            return props.value;
        return itemStore.getItem(props.value) ? itemStore.getItem(props.value).name.get(gameStore.languageKey) : t("action_editor.no_item_set");
    };

    return <Selector
        currentElement={itemStore.getItem(props.value)}
        valueSetter={props.valueSetter}
        newString={"editor.item_new"}
        filteredListGetter={filteredItemList}
        filterGetter={itemStore.getAllItemTags}
        getElementValue={(item: ItemModel) => item ? item.id : ""}
        getElementImageUrl={(item: ItemModel) => item ? imageStore.getImageUrl(item.itemImageId) : null}
        getElementIcon={(item: ItemModel) => item ? <ItemImageMissingIcon /> : <NoItemIcon />}
        getElementName={(item: ItemModel) => item?.name.get(gameStore.languageKey)}
        getElementIsOwnedByAModule={(item: ItemModel) => !!item?.moduleOwner}
        prepareNewElement={prepareNewItem}
        buttonText={buttonLabel()}
        buttonInvalidProvider={() => !props.allowBlankValue && isBlank(props.value)}
        beforeOpenEditorView={item => itemStore.setSelectedItem(item)}
        editorView={(selectAndClose, closeEditor, selectorWidth) => <ItemEditorWindow closeEditor={closeEditor} selectorWidth={selectorWidth} />}
    />;
};