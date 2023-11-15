import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { BiEraser, BiPlus } from "react-icons/bi";
import styled from "styled-components";
import { undoableDeleteModule } from "../../stores/undo/operation/ModuleDeletionOp";
import { undoableDeleteWorkshop } from "../../stores/undo/operation/WorkshopDeletionOp";
import { managementStore } from "../../stores/ManagementStore";
import { ListItem } from "../menu/ListItem";
import { MenuCard } from "../menu/MenuCard";
import { Input } from "../shared/Input";
import { ModuleDetailView } from "./ModuleDetailView";
import { WorkshopDetailView } from "./WorkshopDetailView";
import Modal from "react-modal";
import { CustomModalStyles, ModalDeleteCloseButtonBar, ModalTitle } from "../modal/ModalComponents";
import { useTranslation } from "react-i18next";
import { AiFillStar } from "react-icons/ai";
import { ModuleModel } from "../../../shared/workshop/ModuleModel";
import { WorkshopModel } from "../../../shared/workshop/WorkshopModel";
import { undoableCreateWorkshop } from "../../stores/undo/operation/WorkshopCreationOp";
import { undoableCreateModule } from "../../stores/undo/operation/ModuleCreationOp";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { undoableManagementToggleItemViewOpen } from "../../stores/undo/operation/ManagementToggleItemViewOpenOp";


const ToolBar = styled.div`
    min-height: 30px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`;

const NewButton = styled.button`
    flex-shrink: 0;
    height: 26px;
`;

const DeleteButton = styled.button`
    flex-shrink: 0;
    height: 26px;
`;

const ListFilterContainer = styled.span`
    margin-left: auto;
`;

const ListView = styled(MenuCard)`
    overflow-y: scroll;
`;

const ContentListItem = styled(ListItem)`
    :hover {
        cursor: default;
    }
`;

const ListItemHeader = styled.div`
    display: contents;
    :hover {
        cursor: pointer;
    }
`;

const ListItemBody = styled.div`
    color: black;
`;

type ManagementListItem = WorkshopModel | ModuleModel;

interface ManagementListViewProps {
    workshopStoreGetter: () => Array<ManagementListItem>;
    workshopStoreDeleter: (id: string) => void;
    getItem: (itemId: string) => ManagementListItem;
    getItemId: (item: ManagementListItem) => string;
    getItemName: (item: ManagementListItem) => string;
    isItemHighlited: (item: ManagementListItem) => boolean;
    detailView: (editItem?: string) => JSX.Element;
    createNewItem: () => void;
    newItemPlaceholderTranslationString: string;
}

const ManagementListView: React.FunctionComponent<ManagementListViewProps> = observer((props) => {
    const { t } = useTranslation();

    const [selectedItems, setSelectedItems] = useState(Array<string>());
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [filterText, setFilterText] = useState("");

    const isItemSelected = (id: string) => {
        return selectedItems.includes(id);
    };

    const toggleItemSelection = (id: string) => {
        if (isItemSelected(id)) {
            setSelectedItems(selectedItems.filter((item) => item !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };

    const itemName = (item: ManagementListItem) => {
        const name = props.getItemName(item);
        return name ? name : `(${t(props.newItemPlaceholderTranslationString)})`;
    };

    const deleteSelectedItems = () => {
        selectedItems.map((id) => props.workshopStoreDeleter(id));
        setSelectedItems([]);
    };

    function openModal(e: React.MouseEvent<any>) {
        e.stopPropagation();
        setModalIsOpen(true);
    }

    function closeModal(e?: React.MouseEvent<any>) {
        e?.stopPropagation();
        setModalIsOpen(false);
    }

    function confirm() {
        closeModal();
        deleteSelectedItems();
    }

    const filteredItems = (): ManagementListItem[] => { // case-insensitive search
        return props.workshopStoreGetter().slice().reverse().filter(item => {
            const itemName = props.getItemName(item).toLowerCase();
            const searchText = filterText.toLowerCase();
            return itemName.includes(searchText);
        });
    };

    return (<>
        <>
            <ToolBar>
                <NewButton onClick={() => props.createNewItem()}><BiPlus /> {t(props.newItemPlaceholderTranslationString)}</NewButton>
                <DeleteButton onClick={(e) => openModal(e)} disabled={selectedItems.length == 0}><BiEraser /> {t("management.delete_selected")}</DeleteButton>
                <ListFilterContainer>{t("management.filter")}: <Input value={filterText} onChange={({ target }) => setFilterText(target.value)}></Input></ListFilterContainer>
            </ToolBar>
            <ListView>
                {filteredItems().map((item) => {
                    return <ContentListItem
                        key={props.getItemId(item)}
                        className={isItemSelected(props.getItemId(item)) ? "selected" : ""}
                    >
                        <input
                            type="checkbox"
                            checked={isItemSelected(props.getItemId(item))}
                            onChange={() => toggleItemSelection(props.getItemId(item))}
                        ></input>
                        <ListItemHeader onClick={() => undoableManagementToggleItemViewOpen(props.getItemId(item))}>
                            {managementStore.isDetailViewOpen(props.getItemId(item)) ? <IoMdArrowDropdown /> : <IoMdArrowDropright />}
                            {props.isItemHighlited(item) ? <span> <AiFillStar /></span> : ''}
                            {itemName(item)}
                        </ListItemHeader>
                        <ListItemBody>
                            {managementStore.isDetailViewOpen(props.getItemId(item)) && props.detailView(props.getItemId(item))}
                        </ListItemBody>
                    </ContentListItem>;
                })}
            </ListView>
        </>
        <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            shouldCloseOnOverlayClick={true}
            style={CustomModalStyles}
            shouldCloseOnEsc={true}
        >
            <ModalTitle>{t("management.delete_selected_items_title")}</ModalTitle>
            {t("management.items_to_delete")} {selectedItems.map((item, index) =>
                <b key={item}>{itemName(props.getItem(item))}{index != selectedItems.length - 1 ? ', ' : ''}</b>
            )}
            <ModalDeleteCloseButtonBar
                confirm={confirm}
                closeModal={closeModal}
            />
        </Modal>
    </>);
});

export const WorkshopListView: React.FunctionComponent = observer(() => {
    return (<ManagementListView
        workshopStoreGetter={() => managementStore.getAllWorkshops}
        workshopStoreDeleter={(id: string) => undoableDeleteWorkshop(managementStore.getWorkshop(id))}
        getItem={(id: string) => managementStore.getWorkshop(id)}
        getItemId={(workshop: WorkshopModel) => workshop.$modelId}
        getItemName={(workshop: WorkshopModel) => workshop.name}
        isItemHighlited={(_) => false}
        detailView={(id: string) => <WorkshopDetailView editItem={id} />}
        createNewItem={() => {
            undoableCreateWorkshop();
        }}
        newItemPlaceholderTranslationString={"management.new_workshop"}
    />);
});

interface ModulesOfWorkshopListViewProps {
    workshopId: string;
}

export const ModulesOfWorkshopListView: React.FunctionComponent<ModulesOfWorkshopListViewProps> = observer((props) => {
    return (<ManagementListView
        workshopStoreGetter={() => managementStore.getModulesForWorkshop(props.workshopId)}
        workshopStoreDeleter={(moduleId: string) => undoableDeleteModule(managementStore.getModule(moduleId))}
        getItem={(moduleId: string) => managementStore.getModule(moduleId)}
        getItemId={(module: ModuleModel) => module ? module.$modelId : ""}
        getItemName={(module: ModuleModel) => module ? module.name : "[ERROR: Module not found]"}
        isItemHighlited={(module: ModuleModel) => module ? module.highlighted : false}
        detailView={(editItem: string) => <ModuleDetailView editItem={editItem} />}
        createNewItem={() => {
            undoableCreateModule(props.workshopId);
        }}
        newItemPlaceholderTranslationString={"management.new_module"}
    />);
});