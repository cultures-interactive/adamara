import { MathE } from "./MathExtension";
import { ActionTreeModel, ActionTreeType, TreeAccess } from "../action/ActionTreeModel";
import { ActionModel } from "../action/ActionModel";

export const ACTION_TREE_PARAMETER_ESCAPE_CHAR = "%";
export const ACTION_TREE_VARIABLE_ESCAPE_CHAR = "$";

/**
 * Returns true if the assigned value fits as an action tree parameter.
 * @param value The value to check.
 */
export function isActionTreeParameter(value: string): boolean {
    if (!value) return false;
    return value.startsWith(ACTION_TREE_PARAMETER_ESCAPE_CHAR)
        && value.endsWith(ACTION_TREE_PARAMETER_ESCAPE_CHAR) && value.length > 2;
}

/**
 * Returns true if the assigned value fits an action tree variable.
 * @param value The value to check.
 */
export function isActionTreeVariable(value: string): boolean {
    if (!value) return false;
    return value.startsWith(ACTION_TREE_VARIABLE_ESCAPE_CHAR)
        && value.endsWith(ACTION_TREE_VARIABLE_ESCAPE_CHAR) && value.length > 2;
}

/**
 * Returns true if the assigned value can be used as a numeric string.
 * Allowed are numbers, action tree parameters and action tree variables.
 * @param value The value to check.
 */
export function isValidActionNumberValue(value: string): boolean {
    if (!value) return false;
    return MathE.containsNumber(value) || isActionTreeVariable(value) || isActionTreeParameter(value);
}

export function formatTreeParameter(parameterName: string) {
    return ACTION_TREE_PARAMETER_ESCAPE_CHAR + parameterName + ACTION_TREE_PARAMETER_ESCAPE_CHAR;
}

export function parseFormattedTreeParameter(parameterNotation: string) {
    if (!isActionTreeParameter(parameterNotation)) return null;
    return parameterNotation.substring(1, parameterNotation.length - 1);
}

export function parseVariableNotation(variableNotation: string) {
    if (!isActionTreeVariable(variableNotation)) return null;
    return variableNotation.substring(1, variableNotation.length - 1);
}

/**
 * Creates a map of action ids to the {@link ActionModel} itself.
 * Recursive search for action in the assigned root {@link ActionTreeModel}.
 * @param root The root to start from.
 * @param map The map to fill.
 */
export function createIdToActionMap(root: ActionTreeModel, map = new Map<string, ActionModel>()): Map<string, ActionModel> {
    for (const action of root.allActions) {
        map.set(action.$modelId, action);
    }
    for (const subTree of root.subtreeActions) {
        createIdToActionMap(subTree, map);
    }
    return map;
}

export function toHumanReadableId(actionId: string) {
    if (!actionId)
        return null;

    if (actionId.length >= 7) actionId = actionId.substr(0, 7);
    return actionId;
}

export function registerActionTree(actionTree: ActionTreeModel, subTreesByParentId: Map<string, ActionTreeModel[]>, treeAccess?: TreeAccess) {
    if (treeAccess)
        actionTree.treeAccess = treeAccess;

    if (actionTree.type === ActionTreeType.SubTree || actionTree.type === ActionTreeType.ModuleRoot) {
        let subTreesForThisParent = subTreesByParentId.get(actionTree.activeParentModelId);
        if (!subTreesForThisParent) {
            subTreesForThisParent = [actionTree];
            subTreesByParentId.set(actionTree.activeParentModelId, subTreesForThisParent);
        } else {
            subTreesForThisParent.push(actionTree);
        }
    }

    return actionTree;
}