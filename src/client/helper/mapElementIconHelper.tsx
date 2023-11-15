import { getParent } from "mobx-keystone";
import React, { ReactElement } from "react";
import { DynamicMapElementAnimationElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { DynamicMapElementAreaTriggerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementMapMarkerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { DynamicMapElementNPCModel } from "../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { TileDataInteractionTriggerModel } from "../../shared/game/TileDataInteractionTriggerModel";
import { TileDataModel } from "../../shared/game/TileDataModel";
import { ViewAreaTriggerModel } from "../../shared/game/ViewAreaTriggerModel";
import { TileImageUsage } from "../../shared/resources/TileAssetModel";
import { loadingAnimationUrl } from "../canvas/loader/StaticAssetLoader";
import { ElementIconType, ElementIconMapMarker, ElementIconAreaTrigger, ElementIconViewAreaTrigger, ElementIconStartMarker, ElementIconTile, ElementAnimation, ElementCharacter } from "../components/editor/ElementIcons";
import { gameConstants } from "../data/gameConstants";
import { animationThumbnailStore, characterThumbnailStore } from "../stores/GeneratedThumbnailStore";
import { sharedStore } from "../stores/SharedStore";
import { tileImageStore } from "../stores/TileImageStore";

export function getImageForElement(element: any): string {
    if (element instanceof DynamicMapElementNPCModel)
        return characterThumbnailStore.getOrGenerateThumbnail(element.characterId) || loadingAnimationUrl;

    if (element instanceof DynamicMapElementAnimationElementModel)
        return animationThumbnailStore.getOrGenerateThumbnail(sharedStore.getAnimationByName(element.animationName)?.id) || loadingAnimationUrl;

    if (element instanceof TileDataInteractionTriggerModel) {
        // Get TileDataModel
        element = getParent(element);
    }

    if (element instanceof TileDataModel) {
        return tileImageStore.thumbnailUrl(element.tileAssetId, TileImageUsage.Background);
    }

    return null;
}

export function getIconForElement(element: any): ReactElement {
    if (element instanceof DynamicMapElementNPCModel)
        return null;

    if (element instanceof DynamicMapElementMapMarkerModel) {
        if (element.label === gameConstants.mapStartMarker) {
            return <ElementIconStartMarker type={ElementIconType.ActionEditorSelector} />;
        } else {
            return <ElementIconMapMarker type={ElementIconType.ActionEditorSelector} />;
        }
    }

    if (element instanceof DynamicMapElementAreaTriggerModel)
        return <ElementIconAreaTrigger type={ElementIconType.ActionEditorSelector} />;

    if (element instanceof DynamicMapElementAnimationElementModel)
        return null;

    if ((element instanceof TileDataModel) || (element instanceof TileDataInteractionTriggerModel))
        return null;

    if (element instanceof ViewAreaTriggerModel)
        return <ElementIconViewAreaTrigger />;

    console.log("Couldn't find icon for element", element);
    return null;
}

export function getIconForElementPartOfText(element: any): ReactElement {
    if (element instanceof DynamicMapElementNPCModel)
        return <ElementCharacter type={ElementIconType.PartOfText} />;

    if (element instanceof DynamicMapElementMapMarkerModel) {
        if (element.label === gameConstants.mapStartMarker) {
            return <ElementIconStartMarker type={ElementIconType.PartOfText} />;
        } else {
            return <ElementIconMapMarker type={ElementIconType.PartOfText} />;
        }
    }

    if (element instanceof DynamicMapElementAreaTriggerModel)
        return <ElementIconAreaTrigger type={ElementIconType.PartOfText} />;

    if (element instanceof DynamicMapElementAnimationElementModel)
        return <ElementAnimation type={ElementIconType.PartOfText} />;

    if ((element instanceof TileDataModel) || (element instanceof TileDataInteractionTriggerModel))
        return <ElementIconTile type={ElementIconType.PartOfText} />;

    console.log("Couldn't find icon for element", element);
    return null;
}