import { autorun, IAutorunOptions, IReactionDisposer, IReactionPublic } from "mobx";
import { DisplayObject } from "pixi.js";

export type RecreateReactionsFunction = () => void;

export class ReactionDisposerGroup extends Array<IReactionDisposer> {
    public constructor() {
        super();

        this.addAutorun = this.addAutorun.bind(this);
        this.disposeAll = this.disposeAll.bind(this);
    }

    public addAutorun(view: (r: IReactionPublic) => any, opts?: IAutorunOptions) {
        this.push(autorun(view, opts));
    }

    public disposeAll() {
        for (const reactionDisposer of this) {
            reactionDisposer();
        }
        this.splice(0);
    }
}

/**
 * A shortcut for
 * displayObject.on("added", () => { reactionDisposerGroup.disposeAll(); createListenersOnAdded(); });
 * displayObject.on("removed", reactionDisposerGroup.disposeAll);
 * 
 * @param displayObject The displayObject to listen for the added/removed events
 * @param createListenersOnAdded This function will be called once the displayObject event "added" is emitted.
 * The addAutorun(...) parameter is a shortcut for this.reactionDisposerGroup.push(autorun(...));
 * @returns A function that disposes of all listeners and then calls createListenersOnAdded() again. Useful for remaking the listeners.
 */
export function autoDisposeOnDisplayObjectRemoved(
    displayObject: DisplayObject,
    createListenersOnAdded: (autoDisposingAutorun: (view: (r: IReactionPublic) => any, opts?: IAutorunOptions) => void) => void
): RecreateReactionsFunction {
    const reactionDisposerGroup = new ReactionDisposerGroup();

    const removeAndCreateListeners = () => {
        reactionDisposerGroup.disposeAll();
        createListenersOnAdded(reactionDisposerGroup.addAutorun);
    };

    displayObject.on("added", removeAndCreateListeners);
    displayObject.on("removed", reactionDisposerGroup.disposeAll);

    return removeAndCreateListeners;
}

/**
 * A shortcut for
 * displayObject.on("added", () => { reactionDisposerGroup.disposeAll(); listenerFunctions.map(f => reactionDisposerGroup.addAutorun(f.bind(displayObject))); });
 * displayObject.on("removed", reactionDisposerGroup.disposeAll);
 * 
 * @param displayObject The displayObject to listen for the added/removed events
 * @param listenerFunctions These functions will be added as reactions whenever the displayObject event "added" is emitted.
 * @param autoBindToDisplayObject Automatically bind the listenerFunctions to displayObject?
 * @returns A function that disposes of all listeners and then add the listenerFunctions again. Useful for remaking the listeners.
 */
export function autoDisposeOnDisplayObjectRemovedArray(
    displayObject: DisplayObject,
    listenerFunctions: Array<() => void>,
    autoBindToDisplayObject: boolean
): RecreateReactionsFunction {
    if (autoBindToDisplayObject) {
        listenerFunctions = listenerFunctions.map(f => f.bind(displayObject));
    }

    return autoDisposeOnDisplayObjectRemoved(displayObject, autoDisposingAutorun => {
        listenerFunctions.forEach(f => autoDisposingAutorun(f));
    });
}