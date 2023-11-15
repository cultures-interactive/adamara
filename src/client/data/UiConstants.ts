export class UiConstants {
    public static readonly Z_INDEX_ACTION_EDITOR_NODE_UNFOCUSED = -100;
    public static readonly Z_INDEX_ACTION_EDITOR_EDGE = 4;
    public static readonly Z_INDEX_ACTION_EDITOR_EDGE_DELETE_BUTTON = 100;
    public static readonly Z_INDEX_SLIDE_MENU = 1500;
    public static readonly Z_INDEX_TASK_MARKERS = 1501;
    public static readonly Z_INDEX_DIALOG = 1502;
    public static readonly Z_INDEX_CHARACTER_EDITOR_POPUP = 1520;
    public static readonly Z_INDEX_ENEMY_COMBAT_PRESET_EDITOR_POPUP = 1550; //+1 is also used
    public static readonly Z_INDEX_ENEMY_COMBAT_PRESET_EDITOR_GESTURE_SELECTION_POPUP = 1552; //+1 is also used
    public static readonly Z_INDEX_COMBAT_GESTURE_PATTERN_EDITOR_POPUP = 1554; //+1 is also used
    public static readonly Z_INDEX_POPUP_SUBMENU = 1700; //+1 is also used
    public static readonly Z_INDEX_HEADER = 1800;
    public static readonly Z_INDEX_MODAL = 2001;
    public static readonly Z_INDEX_EDITOR_NOTIFICATIONS_OVERLAY = 10000; // should always be topmost

    public static readonly SIZE_SLIDE_MENU_ICON_NUMBER = 35;
    public static readonly SIZE_SLIDE_MENU_ICON = "35px";
    public static readonly SIZE_SLIDE_MENU_ICON_FONT = "28px";
    public static readonly SIZE_SLIDE_MENU_CLOSE_ICON = "30px";
    public static readonly SIZE_SLIDE_MENU_CLOSE_ICON_FONT = "24px";

    public static readonly BORDER_RADIUS = "4px";

    public static readonly COLOR_MENU_BACKGROUND = "#CCCCDF";

    public static readonly COLOR_DARK_BUTTON = "#6D5D67";
    public static readonly COLOR_DARK_BUTTON_0x = 0x6D5D67;
    public static readonly COLOR_DARK_BUTTON_HOVER = "#7E6E78";

    public static readonly COLOR_SELECTION_HIGHLIGHT = "#D9C655";
    public static readonly COLOR_SELECTION_HIGHLIGHT_0x = 0xD9C655;
    public static readonly COLOR_VALUE_INVALID = "#FF0000";
    public static readonly COLOR_CLICK_CONNECT_SELECTION = "#D9C655";
    public static readonly COLOR_CLICK_CONNECT_TARGET = "blue";

    public static readonly COLOR_DISABLED_SELECTION_HIGHLIGHT = "#BBBBBB";
    public static readonly COLOR_DISABLED_SELECTION_HIGHLIGHT_0x = 0xAAAAAA;

    public static readonly COLOR_VIABLE_SELECTION_HIGHLIGHT_0x = 0xAAAAAA;
    public static readonly NON_HIGHLIGHT_TINT_0x: number = 0x444444;

    public static readonly COLOR_DISABLED = "#666666";
    public static readonly COLOR_HOVER = "#EFEFEF";

    public static readonly COLOR_ACTIVE = "#99ff99";

    public static readonly ALPHA_CORRECT_HEIGHT_PLANE_WRONG_LAYER = 0.7;
    public static readonly ALPHA_WRONG_HEIGHT_PLANE = 0.2;
}
