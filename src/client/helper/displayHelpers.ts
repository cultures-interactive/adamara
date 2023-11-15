import { TFunction } from "react-i18next";
import { DynamicMapElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElement";
import { DynamicMapElementAnimationElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { DynamicMapElementAreaTriggerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementMapMarkerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { DynamicMapElementNPCModel } from "../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { InteractionTriggerData } from "../../shared/game/InteractionTriggerData";
import { PositionModel } from "../../shared/game/PositionModel";
import { TileDataInteractionTriggerModel } from "../../shared/game/TileDataInteractionTriggerModel";
import { gameStore } from "../stores/GameStore";
import { sharedStore } from "../stores/SharedStore";

export function getCharacterNameForCurrentLanguage(id: number) {
    const npc = sharedStore.characterConfigurations.get(id);
    if (!npc)
        return `[Deleted Character #${id}]`;

    const npcName = npc.localizedName.get(gameStore.languageKey);
    return npcName;
}

export function getDynamicMapElementName(element: DynamicMapElementModel<any>, useLabelIfAvailable: boolean) {
    const label = (element as any).label as string;
    if (useLabelIfAvailable && label)
        return label;

    if (element instanceof DynamicMapElementNPCModel) {
        return getCharacterNameForCurrentLanguage(element.characterId);
    }

    if (element instanceof DynamicMapElementAnimationElementModel) {
        const animation = sharedStore.getAnimationByName(element.animationName);
        return animation ? animation.localizedName.get(gameStore.languageKey) : `[Deleted Animation ${element.animationName}]`;
    }

    if (element instanceof DynamicMapElementAreaTriggerModel)
        return element.id;

    if (element instanceof DynamicMapElementMapMarkerModel)
        return element.label;

    return `${element.$modelType} ${getPositionString(element.position)}`;
}

export function getLocalizedDynamicMapElementDisplayNameWithPosition(t: TFunction, element: DynamicMapElementModel<any>, useLabelIfAvailable: boolean) {
    const name: string = getDynamicMapElementName(element, useLabelIfAvailable);

    return t("editor.overview_display_name_with_position", {
        name,
        position: getPositionString(element.position)
    });
}

export function getInteractionTriggerDataName(interactionTriggerData: InteractionTriggerData) {
    if (interactionTriggerData instanceof TileDataInteractionTriggerModel) {
        const { label } = interactionTriggerData;
        if (label)
            return label;

        const { tileAssetId, position } = interactionTriggerData.tileData;
        const tileAsset = sharedStore.getTileAsset(tileAssetId);
        if (!tileAsset) {
            return `[Deleted TileAsset #${tileAssetId}]`;
        }
        return `${tileAsset.localizedName.get(gameStore.languageKey)} (${getPositionString(position)})`;
    }

    return getDynamicMapElementName(interactionTriggerData as unknown as DynamicMapElementModel<any>, true);
}

function getPositionString(position: PositionModel) {
    const { x, y, plane } = position;
    return `${x}|${y}|${plane}`;
}

export function timeDurationToString(totalSeconds: number, withTotalSeconds: boolean) {
    totalSeconds = Math.floor(totalSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let result = `${minutes}:${seconds.toString().padStart(2, "0")} min`;

    if (withTotalSeconds) {
        result += ` (${totalSeconds}s)`;
    }

    return result;
}