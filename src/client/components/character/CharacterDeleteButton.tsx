import React, { Fragment } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import Modal from 'react-modal';
import { useTranslation } from "react-i18next";
import { CustomModalStyles, ModalDeleteCloseButtonBar, ModalTitle } from "../modal/ModalComponents";
import { AiFillDelete } from "react-icons/ai";
import { charEditorStore } from "../../stores/CharacterEditorStore";
import { gameStore } from "../../stores/GameStore";

interface StyledDeleteButtonProps {
    disabled?: boolean;
}

const DangerButton = styled.button<StyledDeleteButtonProps>`
    color: ${props => props.disabled ? '#AAAAAA' : '#DD0000'};
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
`;

const DeleteIcon = styled(AiFillDelete)`
    margin-right: 2px;
`;

interface Props {
    disabled?: boolean;
    onConfirm: () => void;
}

export const CharacterDeleteButton: React.FunctionComponent<Props> = observer(({ onConfirm, disabled }) => {
    const { selectedCharacterConfiguration } = charEditorStore;
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
                <DeleteIcon /> {t("editor.delete_character")}
            </DangerButton>
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                style={CustomModalStyles}
                shouldCloseOnOverlayClick={true}
                shouldCloseOnEsc={true}
            >
                <ModalTitle>{t("editor.character_configuration_delete_modal_title")}</ModalTitle>
                {t("editor.character_configuration_delete_modal_message", { name: selectedCharacterConfiguration?.localizedName.get(gameStore.languageKey) })}
                <ModalDeleteCloseButtonBar
                    confirm={confirm}
                    closeModal={closeModal}
                />
            </Modal>
        </Fragment>
    );
});
