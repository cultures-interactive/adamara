import { computed } from "mobx";
import { getParent, model, Model, modelAction, prop } from "mobx-keystone";
import { parseFormattedTreeParameter } from "../helper/actionTreeHelper";
import { isBlank } from "../helper/generalHelpers";
import { getTreeParentOfClosestActionModel } from "./ActionTreeModel";
import { AnimationElementValueModel } from "./ValueModel";

@model("actions/MapElementReferenceModel")
export class MapElementReferenceModel extends Model({
    mapId: prop<number>(0).withSetter(),
    elementId: prop<string>("").withSetter(),
}) {

    public isMapSet(): boolean {
        return this.mapId > 0;
    }

    public isElementIdSet(): boolean {
        return this.elementId.length > 0;
    }

    public isTreeParameter(): boolean {
        return Boolean(parseFormattedTreeParameter(this.elementId));
    }

    public isComplete(): boolean {
        // This reference is complete if:
        // - It has an element which is NOT a tree parameter and HAS a map set or
        // - It has an element which IS a tree parameter WITHOUT a map set
        return this.isElementIdSet() && (this.isMapSet() !== this.isTreeParameter());
    }
}

@model("actions/AnimationElementReferenceModel")
export class AnimationElementReferenceModel extends Model({
    mapId: prop<number>(0).withSetter(),
    elementId: prop<string>("").withSetter(),
    elementLabel: prop<string>("").withSetter(),
    animationName: prop<string>("").withSetter(),
    loop: prop<boolean>(false)
}) {
    public isMapSet(): boolean {
        return this.mapId > 0;
    }

    public isElementIdSet(): boolean {
        return this.elementId.length > 0;
    }

    public isTreeParameter(): boolean {
        return Boolean(parseFormattedTreeParameter(this.elementId));
    }

    @modelAction
    public toggleLoop() {
        this.loop = !this.loop;
    }

    public isComplete() {
        // This reference is complete if:
        // - It has an element which is NOT a tree parameter and HAS a map set or
        // - It has an element which IS a tree parameter WITHOUT a map set
        // ...and on top of that the animationName must be complete
        return this.isElementIdSet() && (this.isMapSet() !== this.isTreeParameter()) && this.isAnimationNameComplete;
    }

    @computed
    private get isAnimationNameComplete() {
        const parentAnimationElementValueModel = getParent(this);
        if (parentAnimationElementValueModel instanceof AnimationElementValueModel) {
            // If we are inside an AnimationElementValueModel that has required animation names, we don't need
            // to fill in an animationName here (so it's always considered complete).
            if (parentAnimationElementValueModel.hasRequiredAnimationNames)
                return true;
        }

        const treeParameterName = parseFormattedTreeParameter(this.elementId);
        if (treeParameterName) {
            const parentTree = getTreeParentOfClosestActionModel(this, true);
            const animationElementTreeParameters = parentTree.treeParameterActions("actions/AnimationElementValueModel");
            const treeParameter = animationElementTreeParameters.find(p => p.name === treeParameterName);

            // If we can't find the tree parameter (or it's for whatever reason not a AnimationElementValueModel), we
            // cannot check the animationName properly.
            if (!treeParameter || !(treeParameter.value instanceof AnimationElementValueModel))
                return false;

            // If the tree parameter doesn't have required animation names, it's already filled in and we don't need
            // to fill in an animationName here (so it's always considered complete).
            if (!treeParameter.value.hasRequiredAnimationNames)
                return true;

            // Tree parameter with required names: Check if the animationName is not empty and in the list of required names
            return !isBlank(this.animationName) && (treeParameter.value.requiredAnimationNames.indexOf(this.animationName) !== -1);
        } else {
            // Not a tree parameter: Make sure animationName is not blank
            return !isBlank(this.animationName);
        }
    }
}