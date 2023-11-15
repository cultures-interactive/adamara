import { ActionModel, TreeParamterActionModel } from "../../shared/action/ActionModel";
import { ActionTreeModel, getTreeParent } from "../../shared/action/ActionTreeModel";
import { AnimationElementReferenceModel, MapElementReferenceModel } from "../../shared/action/MapElementReferenceModel";
import { NPCReferenceModel } from "../../shared/action/NPCReferenceModel";
import { SoundValueModel, ValueModel } from "../../shared/action/ValueModel";
import { parseFormattedTreeParameter } from "../../shared/helper/actionTreeHelper";
import { ParsedPath } from "path";

/**
 * @param value The value given from the action tree node
 * @param actionsValueModel The value model of the given map element, ex. "actions/MapMarkerValueModel"
 * @param treeScopeContext ActionModel in tree we want to look for the actual value in
 * @returns the "real" MapElementReferenceModel that the tree parameter was referencing
 */
export function resolvePotentialMapElementTreeParameter(
    value: MapElementReferenceModel | AnimationElementReferenceModel,
    actionsValueModel: string,
    treeScopeContext: ActionModel): MapElementReferenceModel | AnimationElementReferenceModel {

    const parameterName = parseFormattedTreeParameter(value.elementId);
    if (!parameterName) {
        // not a parameter
        return value;
    }

    const tree = getTreeParent(treeScopeContext);
    const parameter = tree?.treeParameterActions(actionsValueModel)?.find(p => p.name === parameterName);
    if (!parameter) {
        // parameter not found
        if (value instanceof MapElementReferenceModel) {
            return new MapElementReferenceModel({});
        } else if (value instanceof AnimationElementReferenceModel) {
            return new AnimationElementReferenceModel({});
        } else {
            throw new Error("Not implemented: " + (value as any).constructor?.name);
        }
    }

    return resolvePotentialMapElementTreeParameter((parameter.value as ValueModel).value, actionsValueModel, tree); // parameters can be set to parameters of the parent tree
}


export function findTreeParameterFor(action: ActionModel, parameterValueModelType: string): TreeParamterActionModel[] {
    if (!action) return [];
    const parentTree = getTreeParent(action);
    return parentTree.treeParameterActions(parameterValueModelType);
}

export function mapSoundValuesToTreeParameterNames(treeParameters: TreeParamterActionModel[],): string[] {
    return treeParameters.map(param => {
        if (param && param.value && param.value instanceof SoundValueModel) {
            return param.name;
        }
        return null;
    }).filter(element => element != null);
}

export function findSoundPathByTreeParameterName(searchStart: ActionModel, treeParameterName: string): ParsedPath {
    if (searchStart == null || treeParameterName == null)
        return null;

    const localParameters = findTreeParameterFor(searchStart, "actions/SoundValueModel");
    for (let i = 0; i < localParameters.length; i++) {
        const param = localParameters[i];
        if (param && param.value && param.value instanceof SoundValueModel) {
            const soundValue = param.value as SoundValueModel;
            if (param.name == treeParameterName) {
                if (soundValue.value) {
                    return soundValue.value;
                } else {
                    const nextStart = getTreeParent(searchStart);
                    return findSoundPathByTreeParameterName(nextStart, soundValue.treeParameter);
                }
            }
        }
    }

    return null;
}

/**
 * @param value The value given from the action tree node
 * @param treeScopeContext ActionModel in tree we want to look for the actual value in
 * @returns the "real" MapElementReferenceModel that the tree parameter was referencing
 */
export function resolvePotentialNPCTreeParameter(value: NPCReferenceModel, treeScopeContext: ActionModel, rootActionTree: ActionTreeModel): NPCReferenceModel {
    const parameterName = parseFormattedTreeParameter(value.npcId);
    if (!parameterName) {
        return value; // not a parameter
    }

    const tree = getTreeParent(treeScopeContext);
    const parameter = tree?.treeParameterActions("actions/NPCValueModel")?.find(p => p.name === parameterName);
    if (!parameter)
        return null; // parameter not found

    return resolvePotentialNPCTreeParameter((parameter.value as ValueModel).value, tree, rootActionTree); // parameters can be set to parameters of the parent tree
}