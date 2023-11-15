import { Model, model, prop, SnapshotOutOf } from "mobx-keystone";
import { EditorComplexity } from "../definitions/other/EditorComplexity";

@model("workshop/ModuleModel")
export class ModuleModel extends Model({
    accesscode: prop<string>().withSetter(),
    workshopId: prop<string>(),
    actiontreeId: prop<string>(),
    name: prop<string>("").withSetter(),
    description: prop<string>("").withSetter(),
    editorComplexity: prop<EditorComplexity>(EditorComplexity.Workshop1).withSetter(),
    startDate: prop<number>(0).withSetter(),
    endDate: prop<number>(0).withSetter(),
    startAtAct: prop<number>(1).withSetter(),
    isStandalone: prop<boolean>(false).withSetter(),
    standaloneMapId: prop<number>(0).withSetter(),
    standalonePlayCode: prop<string>("").withSetter(),
    highlighted: prop<boolean>(false).withSetter(),
    readyToPlay: prop<boolean>(false).withSetter(),
    visibleInPublicMenu: prop<boolean>(false).withSetter(),
    tags: prop<Array<string>>(() => []).withSetter()
}) {
}

export interface ModuleMapData {
    id: number;
    name: string;
    moduleId: string;
}

export type ModuleSnapshot = SnapshotOutOf<ModuleModel>;

export class ReadonlyEditorModule {
    public readonly id: string;
    public readonly actiontreeId: string;
    public readonly editorComplexity: EditorComplexity;
    public readonly moduleName: string;
    public readonly workshopName: string;

    public constructor(module: ModuleModel, workshopName: string) {
        this.id = module.$modelId;
        this.actiontreeId = module.actiontreeId;
        this.editorComplexity = module.editorComplexity;
        this.moduleName = module.name;
        this.workshopName = workshopName;
    }
}

export interface PlayableModule {
    $modelId: string;
    name: string;
    mayBePlayedInWorkshops: boolean;
    highlighted: boolean;
    usedGates: string[]; // only filled if mayBePlayedInWorkshops is true
}
