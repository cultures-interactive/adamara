import React, { useState } from "react";
import { FileUploadButton } from "../shared/FileUploadButton";
import { useTranslation } from "react-i18next";
import { MenuCardLabel } from "../menu/MenuCardLabel";
import { MenuCardSubLabel } from "../menu/MenuCardSubLabel";
import { MdOutlineCloudUpload } from "react-icons/md";
import styled from "styled-components";
import { animationLoader } from "../../helper/AnimationLoader";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { Orientation, PopupSubMenu, PopupSubMenuIconContainer } from "../menu/PopupSubMenu";
import { dataConstants } from "../../../shared/data/dataConstants";
import { MdAddCircle } from "react-icons/md";
import { AnimationNameInputComponent } from "./AnimationNameInputComponent";
import { InvalidCriteriaMessage } from "../shared/InvalidCriteriaMessage";
import { undoableAnimationEditorCreateAnimation } from "../../stores/undo/operation/AnimationEditorCreationOp";
import { toHumanReadableFileSize } from "../../../shared/helper/generalHelpers";

const UploadButton = styled.button`
    display: flex;
    align-items: center;
    margin-top: 10px;
    width: 100%;

    &:hover {
        cursor: pointer;
    }

    &:disabled {
        cursor: not-allowed;
    }
`;

const AddIcon = styled(MdAddCircle)`
    vertical-align: bottom;
    font-size: 22px;
    margin-right: 4px;
`;

const UploadIcon = styled(MdOutlineCloudUpload)`
    cursor: pointer;
    margin-right: 4px;
    margin-left: 2px;
`;

const LoadingIndicatorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

export const AnimationUploadSubMenu: React.FunctionComponent = () => {
    const { t } = useTranslation();

    // upload data states
    const [selectedSkeletonFile, setSelectedSkeletonFile] = useState(null);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [selectedAtlasFile, setSelectedAtlasFile] = useState(null);
    const [animationName, setAnimationName] = useState("");

    // ui component states
    const [currentlyUploading, setCurrentlyUploading] = useState(false);
    const [animationNameValid, setAnimationNameValid] = useState(false);

    async function onClickUpload() {
        setCurrentlyUploading(true);
        const animationAsset = await animationLoader.uploadNewAnimation(animationName, selectedSkeletonFile, selectedImageFile, selectedAtlasFile);
        undoableAnimationEditorCreateAnimation(animationAsset);
        reset();
    }

    function reset() {
        setAnimationName("");
        setCurrentlyUploading(false);
        setSelectedSkeletonFile(null);
        setSelectedImageFile(null);
        setSelectedAtlasFile(null);
        setAnimationNameValid(false);
    }

    return (
        <PopupSubMenu
            orientation={Orientation.Right}
            pixelOffsetY={80}
            relativeOffset={0.25}
            containerWidth={"180px"}
            buttonContent={
                <>
                    <PopupSubMenuIconContainer>
                        <AddIcon />
                    </PopupSubMenuIconContainer>
                    {t("editor.animation_asset_upload_button")}
                </>
            }
            onClose={reset}
        >

            <MenuCardLabel>
                {t("editor.animation_asset_upload_create")}
            </MenuCardLabel>

            {
                currentlyUploading && (
                    <LoadingIndicatorContainer>
                        <LoadingSpinner />
                        {t("editor.animation_asset_upload_loading", { name: animationName })}
                    </LoadingIndicatorContainer>
                )
            }

            {
                !currentlyUploading && (
                    < >
                        <MenuCardSubLabel>
                            {t("editor.animation_asset_upload_select_files")}
                        </MenuCardSubLabel>
                        <FileUploadButton
                            onFileSelected={file => {
                                setSelectedSkeletonFile(file);
                                if (!animationName) setAnimationName(file?.name.replace(/\.[^/.]+$/, ""));
                            }}
                            acceptMimeType={"application/json"}
                            labelText={t("editor.animation_asset_upload_skeleton")}
                        />
                        <FileUploadButton
                            onFileSelected={setSelectedImageFile}
                            acceptMimeType={"image/png"}
                            labelText={t("editor.animation_asset_upload_image")}
                        />
                        <FileUploadButton
                            onFileSelected={setSelectedAtlasFile}
                            acceptMimeType={".atlas"}
                            labelText={t("editor.animation_asset_upload_atlas")}
                        />

                        {
                            (!selectedSkeletonFile || !selectedImageFile || !selectedAtlasFile) && (
                                <InvalidCriteriaMessage>
                                    {t("editor.animation_asset_upload_invalid_criteria_select_all_files")}
                                </InvalidCriteriaMessage>
                            )
                        }

                        {
                            (((selectedSkeletonFile ? selectedSkeletonFile.size : 0)
                                + (selectedImageFile ? selectedImageFile.size : 0)
                                + (selectedAtlasFile ? selectedAtlasFile.size : 0)) > dataConstants.animationAssetMaxSizeBytes) && (
                                <InvalidCriteriaMessage>

                                    {t("editor.animation_asset_upload_invalid_upload_sizes",
                                        { max: toHumanReadableFileSize(dataConstants.animationAssetMaxSizeBytes) })}
                                </InvalidCriteriaMessage>
                            )
                        }

                        <MenuCardSubLabel>
                            {t("editor.animation_asset_upload_name")}
                        </MenuCardSubLabel>

                        <AnimationNameInputComponent
                            setAnimationName={setAnimationName}
                            animationName={animationName}
                            onNameValidityChange={setAnimationNameValid} />

                        <UploadButton
                            disabled={!selectedSkeletonFile || !selectedImageFile || !selectedAtlasFile || !animationName || !animationNameValid}
                            onClick={onClickUpload}
                        >
                            <UploadIcon size={26} /> {t("editor.animation_asset_upload")}
                        </UploadButton>
                    </>
                )
            }
        </PopupSubMenu>
    );
};

