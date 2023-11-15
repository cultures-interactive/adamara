import { ActionTreeModel } from "../../shared/action/ActionTreeModel";
import { ActionTree } from "../database/models/ActionTree";
import { patchedSave } from "../helper/sequelizeUtils";
import { jsonStringifyAsync } from "../helper/asyncUtils";
import { startSegment } from "newrelic";
import { LazyModelInstanceContainer } from "./LazyModelInstanceContainer";

export class ActionTreeWithMetaData {
    private container: LazyModelInstanceContainer<ActionTreeModel>;

    public constructor(
        private _actionTree: ActionTree
    ) {
        this.container = new LazyModelInstanceContainer<ActionTreeModel>(_actionTree.getSnapshot(), "ActionTree #" + _actionTree.id);
    }

    // Not needed at the moment, since action trees never get removed after they are created
    /*
    public dispose() {
        this.container.dispose();
    }
    */

    public get actionTree() {
        return this._actionTree;
    }

    public get actionTreeModel() {
        return this.container.instance;
    }

    public get actionTreeSnapshot() {
        return this.container.snapshot;
    }

    public get mightHaveChanges() {
        return this.container.isDirtySinceLastSave || !!this.actionTree.changed();
    }

    public async saveActionTree() {
        return startSegment("ActionTreeWithMetaData.saveActionTree() ID: " + this.actionTree.id, false, async () => {
            if (this.container.isDirtySinceLastSave) {
                this.container.markNotDirty();
                this.actionTree.snapshotJSONString = await jsonStringifyAsync(this.actionTreeSnapshot);
            }

            if (this.actionTree.changed()) {
                await patchedSave(this.actionTree);
            }
        });
    }
}