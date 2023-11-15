import { MapDataModel } from "../../shared/game/MapDataModel";
import { getCharacterNameForCurrentLanguage } from "./displayHelpers";
import { DynamicMapElementNPCModel } from "../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { DynamicMapElementMapMarkerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { DynamicMapElementAreaTriggerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { ViewAreaTriggerModel } from "../../shared/game/ViewAreaTriggerModel";
import { DynamicMapElementAnimationElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { sharedStore } from "../stores/SharedStore";
import { editorStore } from "../stores/EditorStore";

export class MapElementFilter {
    public static filterNPCLabels(map: MapDataModel): SelectableElement[] {
        const allNPCs = map.dynamicMapElements.filter(e => e instanceof DynamicMapElementNPCModel);
        return allNPCs.map(e => MapElementFilter.newIdAndLabel(e, e.$modelId, MapElementFilter.getCharacterLabel((e as DynamicMapElementNPCModel))));
    }

    public static filterEnemiesLabels(map: MapDataModel): SelectableElement[] {
        const allEnemies = map.dynamicMapElements.filter(e => e instanceof DynamicMapElementNPCModel && sharedStore.characterConfigurations.get(e.characterId)?.isEnemy);
        return allEnemies.map(e => MapElementFilter.newIdAndLabel(e, e.$modelId, MapElementFilter.getCharacterLabel((e as DynamicMapElementNPCModel))));
    }

    public static filterMapMarkerLabels(map: MapDataModel): SelectableElement[] {
        const allMapMarker = map.dynamicMapElements.filter(e => e instanceof DynamicMapElementMapMarkerModel);
        return allMapMarker.map(e => MapElementFilter.newIdAndLabel(e, e.$modelId, (e as DynamicMapElementMapMarkerModel).label));
    }

    public static filterAnimationLabels(map: MapDataModel): SelectableElement[] {
        const allAnimationElements = map.dynamicMapElements.filter(e => e instanceof DynamicMapElementAnimationElementModel);
        return allAnimationElements.map(e => MapElementFilter.newIdAndLabel(e, e.$modelId, (e as DynamicMapElementAnimationElementModel).label));
    }

    public static filterExtendedMapMarkerLabels(map: MapDataModel): SelectableElement[] {
        const allExtendedMapMarker = map.dynamicMapElements.filter(e =>
            (e instanceof DynamicMapElementMapMarkerModel) ||
            (e instanceof DynamicMapElementNPCModel) ||
            ((e instanceof DynamicMapElementAreaTriggerModel) && (e.id.length > 0)) ||
            (e instanceof DynamicMapElementAnimationElementModel)
        );
        const dynamicMapElements = allExtendedMapMarker.map(e => {
            let id = e.$modelId;
            let label = "";
            if (e instanceof DynamicMapElementMapMarkerModel) {
                label = e.label;
            } else if (e instanceof DynamicMapElementNPCModel) {
                label = MapElementFilter.getCharacterLabel((e as DynamicMapElementNPCModel));
            } else if (e instanceof DynamicMapElementAreaTriggerModel) {
                id = e.id;
                label = e.id;
            } else if (e instanceof DynamicMapElementAnimationElementModel) {
                label = e.label;
            }
            return MapElementFilter.newIdAndLabel(e, id, label);
        });

        const tileInteractionTriggers = map.interactionTriggerTiles.map(e => {
            return MapElementFilter.newIdAndLabel(e, e.interactionTriggerData.$modelId, e.interactionTriggerData.label);
        });

        return [...tileInteractionTriggers, ...dynamicMapElements];
    }

    public static filterIndividualAreaTriggerLabels(map: MapDataModel): SelectableElement[] {
        return MapElementFilter.filterAreaTriggerLabels(map, true);
    }

    private static filterAreaTriggerLabels(map: MapDataModel, individualTriggers = false): SelectableElement[] {
        const allAreaTrigger = map.dynamicMapElements.filter(e => e instanceof DynamicMapElementAreaTriggerModel &&
            (editorStore.isMainGameEditor || (map.moduleOwner === editorStore.sessionModuleId) || e.isModuleGate)
        );
        let allAreaTriggerNames = allAreaTrigger.map(e => {
            const trigger = e as DynamicMapElementAreaTriggerModel;
            if (individualTriggers)
                return MapElementFilter.newIdAndLabel(e, trigger.$modelId, trigger.id);
            else
                return MapElementFilter.newIdAndLabel(e, trigger.id, trigger.id);
        });
        allAreaTriggerNames = allAreaTriggerNames.filter(e => e.id); // remove items with empty ids
        return allAreaTriggerNames;
    }

    public static filterTriggerLabels(map: MapDataModel): SelectableElement[] {
        // collect standard triggers
        const allAreaTriggerNames = MapElementFilter.filterAreaTriggerLabels(map);

        // collect view area trigger of NPCs
        for (const npc of map.npcs) {
            for (const viewAreaTrigger of npc.viewAreaTriggers) {
                if (!viewAreaTrigger.name)
                    continue;

                if (editorStore.isMainGameEditor || (map.moduleOwner === editorStore.sessionModuleId) || viewAreaTrigger.isModuleGate) {
                    allAreaTriggerNames.push(MapElementFilter.newIdAndLabel(viewAreaTrigger, viewAreaTrigger.name, viewAreaTrigger.name));
                }
            }
        }

        return [...allAreaTriggerNames];
    }

    public static filterTriggerLabelsWithoutViewAreaTriggers(map: MapDataModel): SelectableElement[] {
        return MapElementFilter.filterAreaTriggerLabels(map);
    }

    public static getCharacterLabel(singleNPC: DynamicMapElementNPCModel): string {
        return singleNPC.label === ""
            ? getCharacterNameForCurrentLanguage(singleNPC.characterId)
            : singleNPC.label;
    }

    public static newIdAndLabel(element: any, id: string, label: string): SelectableElement {
        return {
            element,
            id,
            label
        };
    }
}

export interface SelectableElement {
    element: any;
    label: string;
    id: string;
}