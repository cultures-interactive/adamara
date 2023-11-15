import { startWebTransaction } from "newrelic";
import { handleSocketError } from "../helper/socketErrorHelpers";

export function routeWrapper<A extends any, T extends any[]>(routeName: string, securityCheck: (firstArg: A) => void, wrappedFunction: (firstArg: A, ...args: T) => void) {
    return (firstArg: A, ...args: T) => {
        startWebTransaction("/websocket/" + routeName, () => {
            try {
                securityCheck(firstArg);
                wrappedFunction(firstArg, ...args);
            } catch (error) {
                handleSocketError(error, [firstArg, ...args]);
            }
        });
    };
}

export function routeWrapperAsync<A extends any, T extends any[]>(routeName: string, securityCheck: (firstArg: A) => void, wrappedFunction: (firstArg: A, ...args: T) => Promise<void>) {
    return (firstArg: A, ...args: T) => {
        return startWebTransaction("/websocket/" + routeName, async () => {
            try {
                securityCheck(firstArg);
                await wrappedFunction(firstArg, ...args);
            } catch (error) {
                handleSocketError(error, [firstArg, ...args]);
            }
        });
    };
}

export interface DeletableEntity<T> {
    deleted: boolean;
    save: () => Promise<T>;
}

export async function unDeleteEntity<Type extends DeletableEntity<Type>>(entity: Type) {
    if (!entity) throw new Error("Entity to undelete not found.");
    if (!entity.deleted) throw new Error(entity.constructor.name + " was not deleted.");
    entity.deleted = false;
    return await entity.save();
}

export async function deleteEntity<Type extends DeletableEntity<Type>>(entity: Type) {
    if (!entity) throw new Error("Entity to delete not found.");
    if (entity.deleted) throw new Error(entity.constructor.name + " was already deleted.");
    entity.deleted = true;
    return await entity.save();
}

export interface DeletableEntityWithName<T> {
    deleted: boolean;
    name: string;
    save: () => Promise<T>;
}

export async function unDeleteEntityWithName<Type extends DeletableEntityWithName<Type>>(entity: Type) {
    if (!entity) throw new Error("Entity to undelete not found.");
    if (!entity.deleted) throw new Error(entity.constructor.name + " was not deleted.");
    entity.deleted = false;
    entity.name = entity.name.substring(0, entity.name.lastIndexOf('.')); // see workaround in: deleteEntity
    return await entity.save();
}

export async function deleteEntityWithName<Type extends DeletableEntityWithName<Type>>(entity: Type) {
    if (!entity) throw new Error("Entity to delete not found.");
    if (entity.deleted) throw new Error(entity.constructor.name + " was already deleted.");
    entity.deleted = true;
    entity.name = entity.name + "." + Date.now(); // workaround to release the unique name of a deleted asset.
    return await entity.save();
}
