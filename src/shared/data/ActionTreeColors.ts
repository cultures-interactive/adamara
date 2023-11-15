const blue = "#5896ed";
const green = "#84db7b";
const pink = "#ffcfd3";
const lightGreen = "#a6d9a5";
const orange = "#f7de6d";
const purple = "#ac82ba";
const veryLightGreen = "#e4ffe0";
const grey = "#acacac";

const colorOrder = [
    blue,
    pink,
    purple,
    lightGreen,
    orange,
    veryLightGreen,
    green,
    grey,
];

export class ActionTreeColors {
    public static readonly LOCATION_TRIGGER = blue;
    public static readonly INTERACTION_TRIGGER = blue;
    public static readonly CONDITION_TRIGGER = blue;
    public static readonly USE_ITEM_TRIGGER = blue;

    public static readonly TREE_ENTER = green;
    public static readonly TREE_EXIT = green;

    public static readonly SET_VARIABLE = pink;
    public static readonly CALCULATE_VARIABLE = pink;
    public static readonly TOSS_COIN = pink;
    public static readonly SET_TAG = pink;
    public static readonly CONDITION = pink;
    public static readonly CONDITION_PLAYSTYLE = pink;

    public static readonly SET_PLAYSTYLE = lightGreen;
    public static readonly RECEIVE_REPUTATION = lightGreen;
    public static readonly RECEIVE_AWARENESS = lightGreen;
    public static readonly RECEIVE_ITEM = lightGreen;
    public static readonly LOOSE_ITEM = lightGreen;
    public static readonly MODIFY_PLAYER_HEALTH = lightGreen;
    public static readonly START_ACT = lightGreen;
    public static readonly SET_REPUTATION_STATUS = lightGreen;

    public static readonly RECEIVE_QUEST_TASK = orange;
    public static readonly QUEST_TASK_FINISHED = orange;
    public static readonly ABORT_QUEST = orange;
    public static readonly RECEIVE_TASK_LOCATION = orange;
    public static readonly RECEIVE_TASK_DEFAULT = orange;
    public static readonly FINISH_TASK = orange;
    public static readonly ABORT_TASK = orange;

    public static readonly START_DIALOGUE = purple;
    public static readonly START_FIGHT = purple;
    public static readonly TRIGGER_DAMAGE_ON_TILE = purple;
    public static readonly CUTSCENE = purple;
    public static readonly SET_PLAYER_INPUT_ACTION = purple;
    public static readonly LOAD_MAP = purple;
    public static readonly SHOW_TEXT = purple;
    public static readonly SHOW_IMAGE = purple;
    public static readonly START_TIMER = purple;
    public static readonly RESET_AREA = purple;
    public static readonly PLAY_ANIMATION = purple;
    public static readonly START_EMERGENCY_LIGHTING = purple;
    public static readonly CAMERA_NODES = purple;
    public static readonly MOVE_MAP_ELEMENT = purple;
    public static readonly STOP_MAP_ELEMENT = purple;

    public static readonly ACTION_TREE = veryLightGreen;
    public static readonly TREE_PARAMETER = veryLightGreen;
    public static readonly TREE_PROPERTIES = veryLightGreen;

    public static readonly COMMENT = grey;
    public static readonly DEBUG_START = grey;
    public static readonly DEACTIVATE_NODE_GROUP = grey;
}

const colorIndexByColor = new Map(colorOrder.map((color, index) => [color, index]));

export function compareColorOrder(a: string, b: string) {
    const hasColorA = colorIndexByColor.has(a);
    const hasColorB = colorIndexByColor.has(b);

    if (!hasColorA && !hasColorB) {
        return a.localeCompare(b);
    }

    if (!hasColorA)
        return 1;

    if (!hasColorB)
        return -1;

    const indexA = colorIndexByColor.get(a);
    const indexB = colorIndexByColor.get(b);

    return Math.sign(indexA - indexB);
}