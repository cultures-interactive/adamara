import React, { Fragment } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import Modal from 'react-modal';
import { useTranslation } from "react-i18next";
import { CustomModalStyles, ModalDeleteCloseButtonBar, ModalTitle } from "../modal/ModalComponents";
import { AiFillDelete } from "react-icons/ai";
import { mainMapEditorStore } from "../../stores/MapEditorStore";

interface StyledDeleteButtonProps {
    disabled?: boolean;
}

const DangerButton = styled.button<StyledDeleteButtonProps>`
    color: ${props => props.disabled ? '#AAAAAA' : '#DD0000'};
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    margin: 2px;
    cursor: pointer;
`;

const DeleteIcon = styled(AiFillDelete)`
    margin-right: 2px;
`;

interface Props {
    disabled?: boolean;
    onConfirm: () => void;
}

export const MapDeleteButton: React.FunctionComponent<Props> = observer(({ onConfirm, disabled }) => {
    const { currentMap } = mainMapEditorStore.currentMapStore;
    const { t } = useTranslation();
    const [modalIsOpen, setIsOpen] = React.useState(false);

    function openModal() { setIsOpen(true); }

    function closeModal(e?: React.MouseEvent<any>) {
        e?.stopPropagation();
        setIsOpen(false);
    }

    function confirm() {
        closeModal();
        onConfirm();
    }

    return (
        <Fragment>
            <DangerButton
                disabled={disabled}
                onClick={openModal}
            >
                <DeleteIcon /> {t("editor.delete_map")}
            </DangerButton>
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                style={CustomModalStyles}
                shouldCloseOnOverlayClick={true}
                shouldCloseOnEsc={true}
            >
                <ModalTitle>{t("editor.delete_map_dialog_title")}</ModalTitle>
                {t("editor.delete_map_dialog_message", { name: currentMap ? currentMap.properties.name : "" })}
                <ModalDeleteCloseButtonBar
                    confirm={confirm}
                    closeModal={closeModal}
                />
            </Modal>
        </Fragment>
    );
});
