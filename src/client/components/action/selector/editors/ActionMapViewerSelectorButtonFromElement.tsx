import React from "react";
import { observer } from "mobx-react-lite";
import { SelectorButton, SelectorButtonContentFilled } from "../SelectorButton";
import { SelectedMapElements } from "../SelectedMapElements";
import { DynamicMapElementInterface } from "../../../../../shared/game/dynamicMapElements/DynamicMapElement";
import { TileDataModel } from "../../../../../shared/game/TileDataModel";
import { getIconForElement } from "../../../../helper/mapElementIconHelper";
import { ViewAreaTriggerModel } from "../../../../../shared/game/ViewAreaTriggerModel";

export interface SelectedMapElementsAndSelectElementsProps {
    selectedMapElements: SelectedMapElements;
    selectElement: (id: string) => void;
}

type SelectorButtonFromElementProps = SelectedMapElementsAndSelectElementsProps & {
    element: DynamicMapElementInterface<any> | TileDataModel | ViewAreaTriggerModel;
    elementId: string;
};

export const ActionMapViewerSelectorButtonFromElement: React.FunctionComponent<SelectorButtonFromElementProps> = observer(({
    element, elementId, selectedMapElements, selectElement, children
}) => {
    const elementOnMapData = selectedMapElements.elements.find(element => element.id === elementId);
    if (!elementOnMapData)
        return null;

    // Don't use elementOnMapData.icon because it might be wrong for AreaTriggerModel / ViewAreaTriggerModel
    const icon = getIconForElement(element);

    const image = elementOnMapData.image;
    const text = elementOnMapData.label;

    return (
        <SelectorButton onClick={() => { selectElement(elementId); }}>
            <SelectorButtonContentFilled
                icon={icon}
                image={image}
                text={text}
            />
        </SelectorButton>
    );
});
