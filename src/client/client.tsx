import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import { featureSwitchConstants } from "./data/featureSwitchConstants";
import { clientId } from "./data/clientId";

if (dataConstants.sentryDSN) {
    console.log("Starting sentry.");
    Sentry.init({
        dsn: dataConstants.sentryDSN,
        environment: dataConstants.sentryEnvironment,
        release: dataConstants.gitCommitSHA,

        integrations: [new BrowserTracing()],

        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 1.0,
    });
    Sentry.setContext("featureSwitchConstants", featureSwitchConstants);
    Sentry.setUser({ id: clientId });
}

import '../shared/game/registerModels';
import "./integration/registerPixiPlugins";
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom'; // Pages
import App from './components/App';
import { i18nLoaded } from './integration/i18n';
import { staticAssetLoader } from "./canvas/loader/StaticAssetLoader";
import { settings, MIPMAP_MODES, ENV, PRECISION } from "pixi.js";
import { dataConstants } from '../shared/data/dataConstants';
import { ErrorBoundaryDisplay } from './components/debug/ErrorBoundaryDisplay';
import { authStatus } from "./communication/api";
import { setupMobX } from "./integration/setupMobX";
import { userStore } from "./stores/UserStore";
import { errorStore } from "./stores/ErrorStore";

const root = document.getElementById("app");

async function init() {
    try {
        setupMobX();

        // It seems that MIPMAP_MODES.ON downgrades to MIPMAP_MODES.POW_2 in WebGL 1, so we'd really like this app to run in WebGL 2.
        // However, according to the PixiJS docs, "Due to bug in chromium we disable webgl2 by default for all non-apple mobile devices."
        // which sounds like on Android, WebGL 1 would be used by default unless I set it here to ENV.WEBGL2. The bug that the Pixi docs
        // refer to (https://bugs.chromium.org/p/chromium/issues/detail?id=934823) seems fixed, so manually setting it to ENV.WEBGL2
        // seems good, even though that might be the default anyway.
        settings.PREFER_ENV = ENV.WEBGL2;

        settings.MIPMAP_TEXTURES = MIPMAP_MODES.ON;

        // https://github.com/pixijs/pixijs/issues/3742
        settings.PRECISION_FRAGMENT = PRECISION.HIGH;

        // Improves quality ever so slightly, but no idea if it has problems on mobile, so deactivated for now
        //settings.ANISOTROPIC_LEVEL = 16;

        console.log("Current git commit SHA: " + dataConstants.gitCommitSHA);

        await i18nLoaded;
        await staticAssetLoader.loadStaticAssets();

        try {
            const { user } = await authStatus();

            if (user) {
                userStore.setLoggedIn(user.privilegeLevel);
            }
        } catch (error) {
            errorStore.addErrorFromErrorObject(error);
        }

        ReactDOM.render(
            (
                <Sentry.ErrorBoundary fallback={({ error }) => <ErrorBoundaryDisplay insideErrorBoundary={true} error={error} />}>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </Sentry.ErrorBoundary>
            ),
            root
        );
    } catch (e) {
        console.error(e);
        console.log("An exception happened outside of the error boundary!");
        Sentry.captureException(e);
        ReactDOM.render(
            (
                <div>
                    <ErrorBoundaryDisplay insideErrorBoundary={false} error={e} />
                </div>
            ),
            root
        );
    }
}

init().catch(Sentry.captureException);