export const routes = {
    home: "/",
    editorAction: "/editor",
    editorMap: "/editor/map",
    editorTileAssets: "/editor/tileAssets",
    editorAnimations: "/editor/animations",
    editorCombat: "/editor/combat",
    editorGame: "/editor/game",
    mainGame: "/game",
    publicGameVariant: "/game-variant",
    playCode: "/play-code",
    workshopManagement: "/workshop-management",
    translationManagement: "/translation",
    translationManagementExport: "/translation/export",
    translationManagementImport: "/translation/import",
    translationManagementStats: "/translation/stats",
    translationManagementMakeshiftTranslationSystem: "/translation/makeshift-translation-system",
    publicMenu: "/menu"
};

export const isMainGameRoute = () => location.pathname === routes.mainGame;
export const isPublicGameVariantRoute = () => location.pathname === routes.publicGameVariant;

export const queryParameterPlayPublicModuleIds = "play_public_module_ids";

export function getPublicGameVariantLink(moduleIds: string[]) {
    return `${routes.publicGameVariant}?${queryParameterPlayPublicModuleIds}=${moduleIds.join(",")}`;
}