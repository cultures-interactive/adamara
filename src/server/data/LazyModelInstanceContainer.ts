import { CachingSnapshotGenerator, DirtyTracker } from "../../shared/helper/mobXHelpers";
import { AnyModel, fromSnapshot, SnapshotOutOf } from "mobx-keystone";
import { logger } from "../integrations/logging";

export class LazyModelInstanceContainer<M extends AnyModel> {
    private _instance: M;
    private cachingSnapshotGenerator: CachingSnapshotGenerator<M>;
    private sinceLastSaveDirtyTracker: DirtyTracker;

    public constructor(
        private _snapshot: SnapshotOutOf<M>,
        private debugName: string
    ) {
    }

    private get instanceInitialized() {
        return Boolean(this._instance);
    }

    private initialize() {
        if (this.instanceInitialized)
            throw new Error("LazyModelInstanceContainer.initialize() should not be called when this.instanceInitialized is alreayd true");

        if (!this._snapshot)
            throw new Error("LazyModelInstanceContainer.initialize() cannot be called when snapshot is null");

        this._instance = fromSnapshot<M>(this._snapshot);
        this._snapshot = null;

        this.cachingSnapshotGenerator = new CachingSnapshotGenerator(this._instance);
        this.sinceLastSaveDirtyTracker = new DirtyTracker(this._instance, false);

        logger.info("Instance initialized: " + this.debugName);
    }

    private deinitialize(shouldBeUsableAfterwards: boolean) {
        if (!this.instanceInitialized)
            return;

        if (shouldBeUsableAfterwards)
            this._snapshot = this.cachingSnapshotGenerator.snapshot;

        this._instance = null;

        this.cachingSnapshotGenerator.dispose();
        this.cachingSnapshotGenerator = null;

        this.sinceLastSaveDirtyTracker.dispose();
        this.sinceLastSaveDirtyTracker = null;

        logger.info(`Instance disposed: ${this.debugName} (${shouldBeUsableAfterwards ? "can be reused" : "cannot be reused"})`);
    }

    public dispose() {
        this.deinitialize(false);
    }

    public get snapshot() {
        if (!this.instanceInitialized) {
            if (!this._snapshot)
                throw new Error("snapshot is unset. Has it been disposed?");

            return this._snapshot;
        }

        return this.cachingSnapshotGenerator.snapshot;
    }

    public get instance() {
        if (!this.instanceInitialized)
            this.initialize();

        return this._instance;
    }

    public get isDirtySinceLastSave() {
        if (!this.instanceInitialized)
            return false;

        return this.sinceLastSaveDirtyTracker.isDirty;
    }

    public markNotDirty() {
        if (!this.instanceInitialized)
            return;

        this.sinceLastSaveDirtyTracker.markNotDirty();
    }
}