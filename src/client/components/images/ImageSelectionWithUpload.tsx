import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { ImageModel, ImageUsecase } from "../../../shared/resources/ImageModel";
import { UiConstants } from "../../data/UiConstants";
import { editorStore } from "../../stores/EditorStore";
import { imageStore } from "../../stores/ImageStore";
import { undoableCreateImage } from "../../stores/undo/operation/ImageCreateOp";
import { undoableDeleteImage } from "../../stores/undo/operation/ImageDeleteOp";
import { FileUploadButton } from "../shared/FileUploadButton";

const ImageSelector = styled.div`
    background: white;
    border: 1px solid darkgray;
    padding: 3px;
    margin: 3px;
    
    width: 280px;
    max-height: 500px;
    display: flex;
    flex-wrap: wrap;
    justify-items: center;
    max-height: 280px;
    overflow-y: scroll;
`;

const Image = styled.img`
    max-width: 100%;
    max-height: 100%;
`;

interface ImageFieldProps {
    selected: boolean;
}

const ImageField = styled.div<ImageFieldProps>`
    width: 85px;
    height: 85px;
    margin: auto;
    padding: 10px;
    cursor: pointer;
    border-radius: ${UiConstants.BORDER_RADIUS};
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
    background-color: ${props => props.selected ? UiConstants.COLOR_SELECTION_HIGHLIGHT : "white"};
`;

interface ImageSelectionWithUploadProps {
    selectedImageId: number;
    selectedImageIdSetter: (id: number) => void;
    imageUsecase: ImageUsecase;
}

export const ImageSelectionWithUpload: React.FunctionComponent<ImageSelectionWithUploadProps> = observer(({ selectedImageId, selectedImageIdSetter, imageUsecase }) => {
    const { t } = useTranslation();
    const availableImages: ImageModel[] = imageStore.getAllImageMetadataOfUsecase(imageUsecase);

    const [selectedImageFile, setSelectedImageFile] = useState(null);

    async function uploadImage() {
        if (!selectedImageFile)
            return;
        undoableCreateImage(selectedImageFile, imageUsecase);
        setSelectedImageFile(null);
    }

    function deleteImage() {
        if (!selectedImageId)
            return;
        undoableDeleteImage(selectedImageId);
        setSelectedImageFile(null);
    }

    function userHasEditRights(): boolean {
        if (editorStore.isMainGameEditor)
            return true;

        return availableImages.find(i => i.id == selectedImageId)?.moduleOwner === editorStore.sessionModuleId;
    }

    return (
        <>
            <ImageSelector>
                {/* First field to select "no icon" */}
                <ImageField onClick={() => selectedImageIdSetter(0)} selected={!selectedImageId} />
                {availableImages.map(image =>
                    <ImageField key={image.id} onClick={() => selectedImageIdSetter(image.id)} selected={image.id === selectedImageId} >
                        <Image src={imageStore.getImageUrl(image.id)} />
                    </ImageField>
                )}
            </ImageSelector>
            <FileUploadButton
                onFileSelected={setSelectedImageFile}
                acceptMimeType={"image/png"}
                labelText={t("editor.item_pick_file")}
            />
            {selectedImageFile != null && <button onClick={uploadImage}>{t("editor.item_upload_image")}</button>}
            {selectedImageId !== 0 && userHasEditRights() && <button onClick={deleteImage}>{t("editor.delete_image")}</button>}
        </>
    );
});