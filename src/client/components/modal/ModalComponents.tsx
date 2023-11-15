import React from "react";
import { UiConstants } from "../../data/UiConstants";
import styled from "styled-components";
import { Heading1Base } from "../shared/Heading";
import { AiFillDelete } from "react-icons/ai";
import { useTranslation } from "react-i18next";

export const CustomModalStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        /*
        borderWidth: '2px',
        borderColor: '#0d005e',
        */
        border: 'none',
        maxWidth: "350px"
    },
    overlay: { zIndex: UiConstants.Z_INDEX_MODAL }
};

export const ModalTitle = styled(Heading1Base)`
    margin: 0px;
    margin-bottom: 8px;
`;

export const ModalButton = styled.button`
    flex:1;
    margin: 4px;
    display: flex;
    justify-content: center;
`;

export const ModalButtonDanger = styled(ModalButton)`
    color: red;
`;

export const ModalButtonBar = styled.div`
    display:flex;
    padding-top: 8px;
`;

interface ModalDeleteCloseProps {
    confirm: () => void;
    closeModal: () => void;
}

export const ModalDeleteCloseButtonBar: React.FunctionComponent<ModalDeleteCloseProps> = ({ confirm, closeModal }) => {
    const { t } = useTranslation();

    return (
        <ModalButtonBar>
            < ModalButton onClick={e => { e.stopPropagation(); closeModal(); }} >
                {t("editor.dialog_cancel")}
            </ModalButton>
            <ModalButtonDanger onClick={e => { e.stopPropagation(); confirm(); }} >
                <AiFillDelete />
                {t("editor.dialog_confirm")}
            </ModalButtonDanger>
        </ModalButtonBar>
    );
};