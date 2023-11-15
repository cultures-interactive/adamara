import { getURLParameterNumber, hasURLParameter } from "../helper/generalHelpers";

const allSwitchNames = new Array<string>();

function getFeatureSwitchURLParameterNumber(name: string, defaultValue: number) {
    allSwitchNames.push(name);
    return getURLParameterNumber(name, defaultValue);
}

export const featureSwitchConstants = {
    skipCullingUntilFirstRender: getFeatureSwitchURLParameterNumber("debugSkipCullingUntilFirstRender", +process.env.SKIP_CULLING_UNTIL_FIRST_RENDER) === 1,
    useCache: getFeatureSwitchURLParameterNumber("debugUseCache", 1) === 1,
    loadTileImagesViaGet: getFeatureSwitchURLParameterNumber("debugLoadTileImagesViaGet", 1) === 1
};

export const anyFeatureSwitchParameterSet = allSwitchNames.some(name => hasURLParameter(name));

console.log("featureSwitchConstants: " + JSON.stringify(featureSwitchConstants, null, 2));