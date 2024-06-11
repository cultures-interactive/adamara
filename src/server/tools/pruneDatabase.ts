import { Model } from "sequelize-typescript";
import { ActionTree } from "../database/models/ActionTree";
import { CharacterConfiguration } from "../database/models/CharacterConfiguration";
import { GameMap } from "../database/models/GameMap";
import { Image } from "../database/models/Image";
import { Item } from "../database/models/Item";
import { Module } from "../database/models/Module";
import { ActionTreeSnapshot, ActionTreeType } from "../../shared/action/ActionTreeModel";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";

export async function pruneDatabaseEntriesFromDeletedModules() {
    const moduleIdsToKeep = new Set((await Module.findAll({ where: { deleted: false } })).map(module => module.id));

    await removeActionTrees(moduleIdsToKeep);
    await removeAllNotInList(await CharacterConfiguration.findAll(), object => object.snapshot.moduleOwner, moduleIdsToKeep);
    await removeAllNotInList(await GameMap.findAll(), object => object.snapshot.moduleOwner, moduleIdsToKeep);
    await removeAllNotInList(await Item.findAll(), object => object.snapshot.moduleOwner, moduleIdsToKeep);
    await removeAllNotInList(await Image.findAll(), object => object.snapshot.moduleOwner, moduleIdsToKeep);
}

async function removeAllNotInList<T extends Model>(databaseObjects: T[], getModuleOwner: (databaseObject: T) => string, moduleIdsToKeep: Set<string>) {
    for (const dbObject of databaseObjects) {
        const moduleOwner = getModuleOwner(dbObject);
        if (!moduleOwner || moduleIdsToKeep.has(moduleOwner))
            continue;

        await dbObject.destroy();
    }
}

async function removeActionTrees(moduleIdsToKeep: Set<string>) {
    const actionTrees = await ActionTree.findAll();
    const notDeletedActionTreeSnapshots = actionTrees
        .filter(actionTree => !actionTree.deleted)
        .map(actionTree => actionTree.getSnapshot());

    const actionTreeChildrenById = new Map<string, ActionTreeSnapshot[]>();

    for (const actionTreeSnapshot of notDeletedActionTreeSnapshots) {
        actionTreeChildrenById.set(actionTreeSnapshot.$modelId, []);
    }

    for (const actionTreeSnapshot of notDeletedActionTreeSnapshots) {
        const { parentModelId } = actionTreeSnapshot;
        if (!parentModelId)
            continue;

        if (!actionTreeChildrenById.has(parentModelId)) {
            actionTreeChildrenById.set(parentModelId, [actionTreeSnapshot]);
        } else {
            actionTreeChildrenById.get(parentModelId).push(actionTreeSnapshot);
        }
    }

    const keepActionTreeIds = new Set<string>();

    // Add MainGameRoot/TemplateRoot and children
    for (const actionTreeSnapshot of notDeletedActionTreeSnapshots.filter(actionTree => (actionTree.type === ActionTreeType.MainGameRoot) || (actionTree.type === ActionTreeType.TemplateRoot))) {
        addActionTreeAndChildren(actionTreeSnapshot, actionTreeChildrenById, keepActionTreeIds);
    }

    // Add module ModuleRoot and children
    for (const moduleId of moduleIdsToKeep) {
        const module = await Module.findOne({ where: { id: moduleId } });
        if (!module)
            throw Error("Module wasn't found: " + moduleId);

        const actionTree = notDeletedActionTreeSnapshots.find(actionTree => actionTree.$modelId == module.snapshot.actiontreeId);
        addActionTreeAndChildren(actionTree, actionTreeChildrenById, keepActionTreeIds);
    }

    for (const actionTree of actionTrees) {
        if (keepActionTreeIds.has(actionTree.id))
            continue;

        await actionTree.destroy();
    }
}

function addActionTreeAndChildren(actionTreeSnapshot: ActionTreeSnapshot, actionTreeChildrenById: Map<string, ActionTreeSnapshot[]>, result: Set<string>) {
    result.add(actionTreeSnapshot.$modelId);
    const children = actionTreeChildrenById.get(actionTreeSnapshot.$modelId);
    if (children) {
        for (const child of children) {
            addActionTreeAndChildren(child, actionTreeChildrenById, result);
        }
    }
}