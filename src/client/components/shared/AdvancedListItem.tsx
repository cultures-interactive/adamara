import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { ListItem } from "../menu/ListItem";
import { AiOutlineDelete } from "react-icons/ai";
import Modal from "react-modal";
import { CustomModalStyles, ModalDeleteCloseButtonBar, ModalTitle } from "../modal/ModalComponents";
import { RiErrorWarningLine } from "react-icons/ri";
import styled from "styled-components";

export interface Props {
    onConfirmDelete: (itemId: number) => void;
    deleteWithoutConfirmation?: boolean;
    onSelectItem: (item: any) => void;
    itemObject: any;
    itemId: number;
    itemName: string;
    isSelected: boolean;
    icon?: JSX.Element;
    showWarnIndicator?: boolean;
    i18nKeyDeleteModalTitle?: string;
    i18nKeyDeleteModalMessage?: string;
    allowDeletion: boolean;
}

export const WarnIndicatorIcon = styled(RiErrorWarningLine)`
    vertical-align: bottom;
    font-size: 18px;
    margin-right: 4px;
    color: red;
`;

const ListItemFlex = styled(ListItem)`
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    white-space: nowrap;
`;

const ItemNameAndIcon = styled.div`
    overflow-x: clip;
    display: flex;

    * {
        flex-shrink: 0;
    }
`;

const ItemName = styled.div`
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const DeleteButton = styled.div`
    margin-top: -2px;
    float: right;
    font-size: x-large;
    color: #555555;
    height: 18.39px;

    &:hover {
        color: black;
    }
`;

export const AdvancedListItem: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();

    const [modalIsOpen, setIsOpen] = React.useState(false);

    function openModal(e: React.MouseEvent<any>) {
        e.stopPropagation();

        if (props.deleteWithoutConfirmation) {
            props.onConfirmDelete(props.itemId);
            return;
        }

        setIsOpen(true);
    }

    function closeModal(e?: React.MouseEvent<any>) {
        e?.stopPropagation();
        setIsOpen(false);
    }

    function confirm() {
        closeModal();
        props.onConfirmDelete(props.itemId);
    }

    return (
        <ListItemFlex
            className={props.isSelected ? "selected" : ""}
            onClick={() => { props.onSelectItem(props.itemObject); }}
        >
            <ItemNameAndIcon>
                {props.icon}
                {props.icon && <span>&nbsp;</span>}
                {props.showWarnIndicator && <WarnIndicatorIcon />}
                {props.itemName ? <ItemName>{props.itemName}</ItemName> : <ItemName>&nbsp;</ItemName>}
            </ItemNameAndIcon>
            {
                props.isSelected && props.onConfirmDelete &&
                (
                    <>
                        {props.allowDeletion && (
                            <DeleteButton onClick={(e) => openModal(e)}>
                                <AiOutlineDelete />
                            </DeleteButton>
                        )}
                        <Modal
                            isOpen={modalIsOpen}
                            onRequestClose={closeModal}
                            shouldCloseOnOverlayClick={true}
                            style={CustomModalStyles}
                            shouldCloseOnEsc={true}
                        >
                            <ModalTitle>{t(props.i18nKeyDeleteModalTitle)}</ModalTitle>
                            {t(props.i18nKeyDeleteModalMessage, { name: props.itemName })}
                            <ModalDeleteCloseButtonBar
                                confirm={confirm}
                                closeModal={closeModal}
                            />
                        </Modal>
                    </>
                )
            }
        </ListItemFlex>
    );
});
