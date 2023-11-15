import React, { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { BsPlusLg } from "react-icons/bs";
import { GrMapLocation } from "react-icons/gr";
import { MdEdit, MdLocationOn } from "react-icons/md";
import styled from "styled-components";
import { UiConstants } from "../../../data/UiConstants";
import { selectorMapEditorStore, EditorToolType } from "../../../stores/MapEditorStore";
import { Orientation, Overlay, PopupSubMenuExternalState } from "../../menu/PopupSubMenu";
import { parseFormattedTreeParameter } from "../../../../shared/helper/actionTreeHelper";
import { MapSelector } from "../../mapEditor/MapSelector";
import { undoableMapEditorLoadMap } from "../../../stores/undo/operation/MapEditorLoadMapOp";
import { editorMapStore } from "../../../stores/EditorMapStore";
import { editorStore } from "../../../stores/EditorStore";
import { DynamicMapElementNPCModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { DynamicMapElementAreaTriggerModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { SelectorButton, SelectorButtonContent, SelectorButtonContentFilled } from "./SelectorButton";

export const SelectionButtons = styled.div`
    overflow-y: scroll;
    max-height: 400px;
    display: flex;
    flex-flow: row wrap;
    gap: 10px;
    align-content: flex-start;
    
    ::-webkit-scrollbar {
        display: none;
    }
`;

export const FilterSelect = styled.select`
    width: 240px;
    max-width: 240px;  
`;

const TopRow = styled.div`
    margin-bottom: 5px;
`;

export const EditButton = styled.div`
    position: absolute;
    left: 2px;
    padding: 3px 5px;

    :hover {
        background-color: #ebc386;
    }
`;

const EditorOverlay = styled(Overlay)`
    z-index: ${UiConstants.Z_INDEX_POPUP_SUBMENU + 1};
`;

interface SelectorProps {
    currentElement: any;
    beforeOpenEditorView?: (element: any) => void;
    editorView: (selectAndClose: (element: string) => void, closeEditor: () => void, selectorWidth: number, currentValue: string) => React.ReactNode;
    newString: string;
    valueSetter: (value: any) => void;
    mapId?: number;
    mapSetter?: (mapId: number) => void;
    limitedToMapId?: number;
    loadingStatusIndicator?: JSX.Element;
    getElementValue: (element: any) => string;
    getElementName: (element: any) => string;
    getElementImageUrl?: (element: any) => string;
    getElementIcon?: (element: any) => ReactElement;
    getElementIsOwnedByAModule?: (element: any) => boolean;
    prepareNewElement: () => void;
    filteredListGetter: (term: string) => Array<any>;
    filterGetter?: () => Array<string>;
    buttonText: string;
    buttonSecondaryText?: string;
    buttonInvalidProvider?: () => boolean;
    selectableOnMap?: boolean;
    onPopupOpen?: () => void;
}

export const Selector: React.FunctionComponent<SelectorProps> = (props) => {
    const { t } = useTranslation();

    const selectedElement = props.currentElement;
    const selectedElementId = props.getElementValue(selectedElement);

    const [termToFilter, setTermToFilter] = useState("");
    const [editorVisible, setEditorVisibility] = useState(false);
    const [popupIsOpen, setPopupIsOpen] = useState(false);

    const selectorWidth = 315;

    function selectAndClose(elementId: string) {
        props.valueSetter(elementId);
        setEditorVisibility(false);
        setPopupIsOpen(false);
    }

    function openEditorMenu(element: any) {
        if (props.beforeOpenEditorView)
            props.beforeOpenEditorView(element);

        setEditorVisibility(true);
    }

    function openEditorForNewElement() {
        props.prepareNewElement();
        if (props.mapSetter) {
            undoableMapEditorLoadMap(selectorMapEditorStore.currentMapStore, props.mapId);
        }
        setEditorVisibility(true);
    }

    function openEditorForElementIdOnMap(elementId: string) {
        undoableMapEditorLoadMap(selectorMapEditorStore.currentMapStore, props.mapId);

        selectorMapEditorStore.setTool(EditorToolType.SingleSelect);

        // Find elementId on map and put selection marker on map on it
        const map = editorMapStore.getOrLoadMapWithMetaData(props.mapId).map;
        let elementOnMapPosition = map.dynamicMapElements.find(element =>
            (element.$modelId === elementId) ||
            ((element instanceof DynamicMapElementNPCModel) && element.viewAreaTriggers.some(viewAreaTrigger => viewAreaTrigger.name === elementId)) ||
            ((element instanceof DynamicMapElementAreaTriggerModel) && (element.id === elementId))
        )?.position;

        if (!elementOnMapPosition) {
            elementOnMapPosition = map.interactionTriggerTiles.find(tile => tile.interactionTriggerData.$modelId === elementId)?.position;
        }

        if (elementOnMapPosition) {
            selectorMapEditorStore.setSelectedTilePosition(elementOnMapPosition);
        }

        setEditorVisibility(true);
    }

    function openEditorForElementOnMap(element: any) {
        const elementId = props.getElementValue(element);
        openEditorForElementIdOnMap(elementId);
    }

    function openEditorForSelectionOnMap() {
        openEditorForElementIdOnMap(selectedElementId);
    }

    function hasEditRights(element: any) {
        if (editorStore.isMainGameEditor) {
            return true;
        }
        return !props.getElementIsOwnedByAModule || props.getElementIsOwnedByAModule(element);
    }

    function closeEditorMenu() {
        setEditorVisibility(false);
    }

    const selectedElementImage = props.getElementImageUrl ? props.getElementImageUrl(selectedElement) : null;
    const selectedElementIcon = !selectedElementImage && props.getElementIcon && props.getElementIcon(selectedElement);

    return <>
        <PopupSubMenuExternalState
            isOpen={popupIsOpen}
            setIsOpen={setPopupIsOpen}
            onOpen={props.onPopupOpen}
            orientation={Orientation.Left}
            relativeOffset={0}
            containerWidth={`${selectorWidth}px`}
            containerHeight="464px"
            buttonClass={SelectorButton}
            buttonContent={
                <SelectorButtonContentFilled
                    image={selectedElementImage}
                    icon={selectedElementIcon}
                    text={props.buttonText}
                    secondaryText={props.buttonSecondaryText}
                    flexibleHeight={true}
                />
            }
            buttonInvalid={props.buttonInvalidProvider ? props.buttonInvalidProvider() : false}
            positionFixed={true}
        >
            <TopRow>
                {props.filterGetter && (
                    <FilterSelect value={termToFilter} onChange={({ target }) => setTermToFilter(target.value)}>
                        <option value={""} />
                        {props.filterGetter().map(term => <option key={term} value={term}>{term}</option>)}
                    </FilterSelect>
                )}
                {props.mapSetter && (
                    <>
                        <MapSelector
                            selectedMapId={props.mapId}
                            onSelected={mapId => props.mapSetter(mapId)}
                            hasEmpty={true}
                            hideId={true}
                            width={"100%"}
                            limitedToMapId={props.limitedToMapId}
                        />
                    </>
                )}
            </TopRow>

            {props.loadingStatusIndicator}

            {!props.loadingStatusIndicator && (
                <SelectionButtons>
                    {(!props.selectableOnMap || (!!props.mapSetter && !!props.mapId && props.mapId !== 0)) && <>
                        {props.selectableOnMap && (
                            <SelectorButton onClick={openEditorForSelectionOnMap}>
                                <SelectorButtonContent>
                                    <GrMapLocation size={50} />
                                    <div>{t("action_editor.select_on_map")}</div>
                                </SelectorButtonContent>
                            </SelectorButton>
                        )}
                        {!!props.prepareNewElement && (!props.mapSetter || editorMapStore.isUserAllowedToEditMapWithId(props.mapId)) && (
                            <SelectorButton onClick={openEditorForNewElement}>
                                <SelectorButtonContent>
                                    <BsPlusLg size={50} />
                                    <div>{t(props.newString)}</div>
                                </SelectorButtonContent>
                            </SelectorButton>
                        )}
                    </>}
                    {props.filteredListGetter(termToFilter).map((element) => {
                        const isTreeParameter = parseFormattedTreeParameter(props.getElementValue(element));
                        const editRights = hasEditRights(element);
                        const image = props.getElementImageUrl ? props.getElementImageUrl(element) : null;
                        const icon = !image && props.getElementIcon && props.getElementIcon(element);
                        return (
                            <SelectorButton
                                key={props.getElementValue(element)}
                                bgColor={selectedElementId === props.getElementValue(element) ? "#dda551" : null}
                                onClick={() => selectAndClose(props.getElementValue(element))}
                            >
                                <SelectorButtonContentFilled
                                    image={image}
                                    icon={icon}
                                    text={props.getElementName(element)}
                                >
                                    {editRights && !isTreeParameter && <>
                                        {!props.selectableOnMap && (
                                            <EditButton onClick={e => { e.stopPropagation(); openEditorMenu(element); }}>
                                                <MdEdit />
                                            </EditButton>
                                        )}
                                        {props.selectableOnMap && (
                                            <EditButton onClick={e => { e.stopPropagation(); openEditorForElementOnMap(element); }}>
                                                <MdLocationOn />
                                            </EditButton>
                                        )}
                                    </>}
                                </SelectorButtonContentFilled>
                            </SelectorButton>
                        );
                    })}
                </SelectionButtons>
            )}
        </PopupSubMenuExternalState>
        {editorVisible && <EditorOverlay onClick={closeEditorMenu}></EditorOverlay>}
        {editorVisible && props.editorView(selectAndClose, closeEditorMenu, selectorWidth, selectedElementId)}
    </>;
};