import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimationElementReferenceModel, MapElementReferenceModel } from "../../../../shared/action/MapElementReferenceModel";
import { MapEditorWindow } from "./windows/MapEditorWindow";
import { Selector } from "./Selector";
import { MdErrorOutline } from "react-icons/md";
import { selectorMapEditorStore, EditorToolType } from "../../../stores/MapEditorStore";
import { undoableMapEditorSelectOtherPlacementElement } from "../../../stores/undo/operation/SetPlacementSelectionOp";
import { OtherPlacementElement } from "../../../stores/MapRelatedStore";
import { observer } from "mobx-react-lite";
import { editorMapStore, MapStatus } from "../../../stores/EditorMapStore";
import { LoadingSpinnerBlack, LoadingSpinnerSmall } from "../../shared/LoadingSpinner";
import { actionEditorStore } from "../../../stores/ActionEditorStore";
import { ElementOnMap, SelectedMapElements } from "./SelectedMapElements";
import { MapElementErrorIcon, NoMapElementIcon } from "../../editor/ElementIcons";

export type MapSelectorElementsGetter = (mapId: number) => SelectedMapElements;

interface MapElementSelectorProps {
    selectedElement: MapElementReferenceModel | AnimationElementReferenceModel;
    elementSetter: (value: MapElementReferenceModel | AnimationElementReferenceModel) => void;
    elementsGetter: MapSelectorElementsGetter;
    allowBlankValue?: boolean;
    parameterTypes?: string[];
    limitedToMapId?: number;
}

export const MapElementSelector: React.FunctionComponent<MapElementSelectorProps> = observer(({
    selectedElement, elementSetter, elementsGetter, allowBlankValue, parameterTypes, limitedToMapId
}) => {
    const { t } = useTranslation();

    const getDefaultSelectedMapId = () => {
        if (limitedToMapId) {
            return limitedToMapId;
        }

        if (!selectedElement.isElementIdSet() && !selectedElement.isMapSet()) {
            const mapId = actionEditorStore.mapElementSelectorLatestSelectedMap;
            if (editorMapStore.hasMapId(mapId)) {
                return mapId;
            }
        }

        return selectedElement.mapId;
    };

    const [selectedMapId, setSelectedMapId] = useState(getDefaultSelectedMapId);

    const selectedMapElements = elementsGetter(selectedMapId);
    const selectedElementMapElements = (selectedMapId === selectedElement.mapId) ? selectedMapElements : elementsGetter(selectedElement.mapId);

    const userIsAllowedToEditSelectedMap = editorMapStore.isUserAllowedToEditMapWithId(selectedMapId);
    const hasAreaTriggers = Boolean(parameterTypes?.some(parameterType => parameterType === "actions/AreaTriggerValueModel"));
    const shouldShowEmptyAreaTriggers = hasAreaTriggers && userIsAllowedToEditSelectedMap;

    let icon: JSX.Element = <NoMapElementIcon />;
    let label: string = undefined;
    let smallerLabel: string = undefined;
    let loadingStatusIndicator: JSX.Element = undefined;

    const selectedMapStatus = selectedMapElements.mapStatus;
    const selectedElementMapStatus = selectedElementMapElements.mapStatus;

    const selectedElementOnMap = selectedElementMapElements.elements.find(element => element.id === selectedElement.elementId);

    if (selectedElementMapStatus === MapStatus.Loaded) {
        if (selectedElementOnMap) {
            label = selectedElementOnMap.label;
            if (selectedElementMapElements.mapName) {
                smallerLabel = `\n(${selectedElementMapElements.mapName})`;
            }
        } else {
            if (selectedElement.isComplete()) {
                icon = <MapElementErrorIcon />;
                label = t("action_editor.element_not_available_anymore");
            } else {
                label = t("action_editor.no_map_element_set");
            }
        }
    } else {
        switch (selectedElementMapStatus) {
            case MapStatus.NotRequested:
            case MapStatus.Loading:
                icon = <LoadingSpinnerBlack />;
                label = t("game.map_loading");
                break;

            case MapStatus.DoesNotExist:
                icon = <MapElementErrorIcon />;
                label = t("action_editor.element_not_available_anymore");
                break;

            default:
                throw new Error("Not implemented: " + selectedElementMapStatus);
        }
    }

    switch (selectedMapStatus) {
        case MapStatus.Loaded:
            break;

        case MapStatus.NotRequested:
        case MapStatus.Loading:
            loadingStatusIndicator = (
                <div>
                    <LoadingSpinnerSmall /> {t("game.map_loading")}
                </div>
            );
            break;

        case MapStatus.DoesNotExist:
            loadingStatusIndicator = (
                <div>
                    <MdErrorOutline /> {t("action_editor.map_does_not_exist")}
                </div>
            );
            break;

        default:
            throw new Error("Not implemented: " + selectedMapStatus);
    }

    const buttonInvalid = () => {
        return !allowBlankValue && !selectedElementOnMap;
    };

    const setMap = (mapId: number) => {
        mapId = mapId || 0;
        setSelectedMapId(mapId);
        actionEditorStore.setMapElementSelectorLatestSelectedMap(mapId);
    };

    const setElementId = (elementId: string) => {
        if (selectedElement instanceof AnimationElementReferenceModel) {
            elementSetter(new AnimationElementReferenceModel({ mapId: selectedMapId, elementId }));
            return;
        }
        elementSetter(new MapElementReferenceModel({ mapId: selectedMapId, elementId }));
    };

    const openEditor = (selectAndClose: (elementId: string) => void, closeEditor: () => void) => {
        return (
            <MapEditorWindow
                selectedMapElements={selectedMapElements}
                selectElement={selectAndClose}
                closePopup={closeEditor}
                shouldShowEmptyAreaTriggers={shouldShowEmptyAreaTriggers}
            />
        );
    };

    let placementElementByParameterType: OtherPlacementElement = null;

    if (parameterTypes?.some(type => type === "actions/MapMarkerValueModel")) {
        placementElementByParameterType = OtherPlacementElement.MapMarker;
    } else if (parameterTypes?.some(type => type === "actions/AreaTriggerValueModel")) {
        placementElementByParameterType = OtherPlacementElement.AreaTrigger;
    }

    const prepareNewElement = () => {
        selectorMapEditorStore.setTool(EditorToolType.PlaceAsset);
        undoableMapEditorSelectOtherPlacementElement(placementElementByParameterType, selectorMapEditorStore);
    };

    return <Selector
        currentElement={selectedElementOnMap}
        valueSetter={setElementId}
        mapId={selectedMapId}
        mapSetter={setMap}
        limitedToMapId={limitedToMapId}
        loadingStatusIndicator={loadingStatusIndicator}
        newString={"editor.element_new"}
        filteredListGetter={() => selectedMapElements.elements}
        getElementValue={(element: ElementOnMap) => element ? element.id : ""}
        getElementName={(element: ElementOnMap) => element?.label}
        getElementImageUrl={(element: ElementOnMap) => element?.image}
        getElementIcon={(element: ElementOnMap) => element ? element.icon : icon}
        prepareNewElement={placementElementByParameterType ? prepareNewElement : null}
        buttonText={label}
        buttonSecondaryText={smallerLabel}
        buttonInvalidProvider={buttonInvalid}
        selectableOnMap={true}
        editorView={openEditor}
        onPopupOpen={() => {
            setSelectedMapId(getDefaultSelectedMapId());
        }}
    />;
});
