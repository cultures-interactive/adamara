const isProduction = (process.env.NODE_ENV === "production") || (process.env.CLIENT_FORCE_PRODUCTION_MODE === "1");

export const dataConstants = {
    // Increase this version on a breaking change to the MapModel (or models that are part of it). Breaking changes
    // are changes that require data to be rewritten or removed. Just adding a new property is NOT a breaking change.
    // For the breaking change(s) you need to add a migration function in 'migration.ts'. 
    gitCommitSHA: process.env.CAPROVER_GIT_COMMIT_SHA || "",
    sentryDSN: process.env.SENTRY_DSN || null,
    sentryEnvironment: process.env.SENTRY_ENV || "missing SENTRY_ENV",
    isProduction,
    isDevelopment: !isProduction,

    defaultDateTimeFormat: new Intl.DateTimeFormat('default', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }),

    // animation asset config
    animationAssetValidNameRegExp: /^[a-zA-Z0-9-_ ]+$/,
    animationAssetNameLengthMax: 20,
    animationAssetNameLengthMin: 1,
    animationAssetMaxSizeBytes: 25 * 1000000, // 5MB

    characterAnimationDefaultScale: 0.2,

    itemAssetMaxSizeBytes: 1 * 1000000, // 1MB
    displayImageMaxSizeBytes: 6 * 1000000, // 6MB

    networkDiagnosticsExternalPingUrl: process.env.NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL || "https://dragonlab.de/projects/adamara/available.php",

    thumbnailSize: {
        width: 76,
        height: 43
    }
};
