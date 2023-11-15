import React, { Fragment, RefObject } from "react";
import { observer } from "mobx-react-lite";
import { selectorMapEditorStore } from "../../../../stores/MapEditorStore";
import { DynamicMapElementNPCModel } from "../../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { DynamicMapElementAreaTriggerModel } from "../../../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { ActionMapViewerSelectorButtonFromElement, SelectedMapElementsAndSelectElementsProps } from "./ActionMapViewerSelectorButtonFromElement";
import { ActionMapViewerSelectorPopupContainer } from "./ActionMapViewerSelectorPopupContainer";

type Props = SelectedMapElementsAndSelectElementsProps & {
    canvasContainerRef: RefObject<HTMLDivElement>;
};

export const ActionMapViewerSelectorPopup: React.FunctionComponent<Props> = observer(({
    selectedMapElements,
    selectElement,
    canvasContainerRef
}) => {
    if (!selectorMapEditorStore.hasSelectedTile)
        return null;

    const { selectedInteractionTriggerTiles, selectedDynamicMapElements } = selectorMapEditorStore;

    return (
        <ActionMapViewerSelectorPopupContainer canvasContainerRef={canvasContainerRef}>
            {
                selectedInteractionTriggerTiles.map(tileData => (
                    <ActionMapViewerSelectorButtonFromElement
                        key={tileData.$modelId}
                        element={tileData}
                        elementId={tileData.interactionTriggerData.$modelId}
                        selectElement={selectElement}
                        selectedMapElements={selectedMapElements}
                    />)
                )
            }
            {
                selectedDynamicMapElements.map(element => {
                    if (element instanceof DynamicMapElementAreaTriggerModel) {
                        // Area triggers might be refered to either by $modelId or by id.
                        // We'll leave it to ActionMapViewerSelectorButtonFromElement to decide
                        // which one is in selectedMapElements - the other one won't be rendered.
                        return (
                            <Fragment key={element.$modelId}>
                                <ActionMapViewerSelectorButtonFromElement
                                    element={element}
                                    elementId={element.$modelId}
                                    selectElement={selectElement}
                                    selectedMapElements={selectedMapElements}
                                />
                                <ActionMapViewerSelectorButtonFromElement
                                    element={element}
                                    elementId={element.id}
                                    selectElement={selectElement}
                                    selectedMapElements={selectedMapElements}
                                />
                            </Fragment>
                        );
                    }

                    let additionalElements: Array<JSX.Element> = undefined;

                    if (element instanceof DynamicMapElementNPCModel) {
                        if (element.viewAreaTriggers.length > 0) {
                            additionalElements = [];
                            for (const viewAreaTrigger of element.viewAreaTriggers) {
                                additionalElements.push(
                                    <ActionMapViewerSelectorButtonFromElement
                                        key={viewAreaTrigger.$modelId}
                                        element={viewAreaTrigger}
                                        elementId={viewAreaTrigger.name}
                                        selectElement={selectElement}
                                        selectedMapElements={selectedMapElements}
                                    />
                                );
                            }
                        }
                    }

                    return (
                        <Fragment key={element.$modelId}>
                            <ActionMapViewerSelectorButtonFromElement
                                element={element}
                                elementId={element.$modelId}
                                selectElement={selectElement}
                                selectedMapElements={selectedMapElements}
                            />
                            {additionalElements}
                        </Fragment>
                    );
                })
            }
        </ActionMapViewerSelectorPopupContainer>
    );
});