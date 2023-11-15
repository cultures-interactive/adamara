import { Model, model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";

@model("workshop/WorkshopModel")
export class WorkshopModel extends Model({
    accesscode: prop<string>("").withSetter(),
    playcode: prop<string>("").withSetter(),
    name: prop<string>("").withSetter(),
    modules: prop<Array<string>>(() => []).withSetter(),
    modulesToPlay: prop<Array<string>>(() => []),
    serverUrl: prop<string>("").withSetter()
}) {
    @modelAction
    public addModule(moduleId: string) {
        this.modules.push(moduleId);
    }

    @modelAction
    public removeModule(moduleId: string) {
        this.modules = this.modules.filter(m => m !== moduleId);
    }

    @modelAction
    public addModuleToPlay(moduleId: string) {
        this.modulesToPlay.push(moduleId);
    }
    @modelAction
    public removeModuleToPlay(moduleId: string) {
        this.modulesToPlay = this.modulesToPlay.filter(m => m !== moduleId);
    }
}

export type WorkshopSnapshot = SnapshotOutOf<WorkshopModel>;