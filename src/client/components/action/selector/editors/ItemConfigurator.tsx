import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaMinusCircle } from "react-icons/fa";
import styled from "styled-components";
import { ItemModel } from "../../../../../shared/game/ItemModel";
import { ImageUsecase } from "../../../../../shared/resources/ImageModel";
import { ErrorType } from "../../../../stores/editor/ErrorNotification";
import { editorStore } from "../../../../stores/EditorStore";
import { errorStore } from "../../../../stores/ErrorStore";
import { gameStore } from "../../../../stores/GameStore";
import { imageStore } from "../../../../stores/ImageStore";
import { itemStore } from "../../../../stores/ItemStore";
import { undoableCreateItem } from "../../../../stores/undo/operation/ItemEditorCreateItemOp";
import { undoableDeleteItem } from "../../../../stores/undo/operation/ItemEditorDeleteItemOp";
import { ImageSelectionWithUpload } from "../../../images/ImageSelectionWithUpload";
import { AutoResizeTextareaFullWidth } from "../../../shared/AutoResizeTextarea";

const Button = styled.button`
    min-width: 32px;
    min-height: 24px;
`;

const DeleteButton = styled(Button)`
    color: #DD0000;
`;

const ConfiguratorContainer = styled.table`
    background: white;
    border: 1px solid darkgray;
    padding: 3px;
    margin: 3px;
`;

const ImageField = styled.img`
    margin: auto;
    max-width: 85px;
    max-height: 85px;
    padding: 9px;
`;


interface EditorItemConfiguratorProps {
    closeEditor?: () => void;
}

export const ItemConfigurator: React.FunctionComponent<EditorItemConfiguratorProps> = observer((props) => {
    const { t } = useTranslation();
    const { selectedItem } = itemStore;

    const [newItemId, setNewItemId] = useState("");

    const createItem = () => {
        if (itemStore.getItem(newItemId)) {
            errorStore.addError(ErrorType.General, "editor.item_id_already_exists", { suggestion: newItemId + "2" });
            return;
        }
        const newItem = new ItemModel({ id: newItemId, tags: [], moduleOwner: editorStore.sessionModuleId });
        undoableCreateItem(newItem);
    };

    const deleteItem = () => {
        if (!selectedItem) {
            console.error("Item could not be deleted because it was null or undefined.");
            return;
        }
        undoableDeleteItem(selectedItem);
        props.closeEditor();
    };

    function updateName(newName: string) {
        selectedItem?.name.set(gameStore.languageKey, newName);
    }

    function updateTags(newTags: string[]) {
        selectedItem?.setTags(newTags);
    }

    function updateDescription(newDescription: string) {
        selectedItem?.description.set(gameStore.languageKey, newDescription);
    }

    return (
        <ConfiguratorContainer>
            <tbody>
                <tr>
                    <td>{t("editor.item_id")}</td>
                    <td>
                        <input disabled={!!selectedItem} type="text" value={selectedItem ? selectedItem.id : newItemId} onChange={({ target }) => setNewItemId(target.value)} />
                        &nbsp;
                        {!selectedItem && <Button onClick={createItem}>{t("editor.create_item")}</Button>}
                        {selectedItem && <DeleteButton onClick={deleteItem}><FaMinusCircle /> {t("editor.tile_asset_delete")}</DeleteButton>}
                    </td>
                </tr>
                {selectedItem && <>
                    <tr>
                        <td>{t("editor.item_name")}</td>
                        <td>
                            <input
                                type="text" value={selectedItem?.name.get(gameStore.languageKey, false)}
                                placeholder={selectedItem?.name.get(gameStore.languageKey, true)}
                                onChange={({ target }) => updateName(target.value)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("editor.item_tags")}</td>
                        <td>
                            <input type="text" value={selectedItem?.tags.join(" ")} onChange={({ target }) => updateTags(target.value.split(" "))} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("editor.item_description")}</td>
                        <td>
                            <AutoResizeTextareaFullWidth
                                value={selectedItem?.description.get(gameStore.languageKey, false)}
                                placeholder={selectedItem?.description.get(gameStore.languageKey, true)}
                                onChange={({ target }) => updateDescription(target.value)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("editor.item_image")}</td>
                        <td>
                            <ImageField src={imageStore.getImageUrl(selectedItem?.itemImageId)} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("editor.item_all_images")}</td>
                        <td>
                            <ImageSelectionWithUpload
                                selectedImageId={selectedItem?.itemImageId}
                                selectedImageIdSetter={selectedItem?.setItemImageId.bind(selectedItem)}
                                imageUsecase={ImageUsecase.Item} />
                        </td>
                    </tr>
                </>}
            </tbody>
        </ConfiguratorContainer>
    );
});