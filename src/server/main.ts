// Import config first to initialize dotenv
import * as config from './config';

// Start logger
import { logger } from './integrations/logging';

// Start sentry integration
import { Sentry, startSentry } from './integrations/sentry';
startSentry();

// Start NewRelic integration
import { startNewRelic } from "./integrations/newRelic";
startNewRelic();

import express from 'express';
import path from 'path';
import { addApiRouteMiddleware, apiRouterNoCSRFProtection, apiRouterWithCSRFProtection, handleError } from './routes/api-router';
import { pagesRouter } from './routes/pages-router';
import { staticsRouter } from './routes/statics-router';
import { initializeDatabase, loadActionTreesIntoServerState, loadAnimationAssetsIntoServerState, loadCharacterConfigurationsIntoServerState, loadCombatConfigurationIntoServerState, loadGameDesignVariablesConfigurationIntoServerState, loadImagesIntoServerState, loadItemsIntoServerState, loadMakeshiftTranslationSystemDataIntoServerState, loadMapsIntoServerState, loadModulesIntoServerState, loadTileAssetsIntoServerState, loadWorkshopsIntoServerState, regularlySaveServerState, saveServerState, sequelize } from './database/db';
import { EditorServer } from './communication/EditorServer';
import { ServerState } from './data/ServerState';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from "https";
import forceSSL from "express-force-ssl";
import helmet from "helmet";
import csurf from "csurf";
import { RoutesAccessInterface } from './routes/RoutesAccessInterface';
import session from "express-session";
import ConnectSequelizeStore from "connect-session-sequelize";
import passport from 'passport';
import { initializePassportStrategies } from './integrations/auth';
import { atlasFolder, loadTileAtlasDataIntoServerState, packAtlas, shouldPackAtlas } from './optimization/atlasPacker';
import { routeConstants } from '../shared/data/routeConstants';
import { dataConstants } from '../shared/data/dataConstants';
import { URL } from 'url';
import { createThumbnails, loadThumbnailDataIntoServerState, thumbnailFolder } from './optimization/thumbnailGenerator';
import { createAppMetricsDashboard } from './integrations/appMetricsDashboard';
import { sendToSentryAndLogger } from './integrations/errorReporting';
import { ManagementServer } from './communication/ManagementServer';
import { SocketIOServer } from './communication/ServerBase';
import { generateSSLCertificate, getLocalIPAdresses, loadSSLCertificate } from './integrations/sslCertificateSupport';

async function start() {
    logger.info(`*******************************************`);
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`config: ${JSON.stringify(config, null, 2)}`);
    logger.info(`*******************************************`);

    if (!process.env.ACCESS_CODE) {
        logger.error("ACCESS_CODE is not set. Nobody will be able to log in. Not starting the server.");
        return;
    }

    await initializeDatabase();

    if (await shouldPackAtlas()) {
        await packAtlas();
    }

    await createThumbnails();

    const serverState = new ServerState();
    await loadWorkshopsIntoServerState(serverState);
    await loadModulesIntoServerState(serverState);

    if (serverState.accessCodeExists(process.env.ACCESS_CODE, false)) {
        logger.error("ACCESS_CODE is the same as a workshop/module access code. Please choose a different ACCESS_CODE. Not starting the server.");
        return;
    }

    await loadCombatConfigurationIntoServerState(serverState);
    await loadGameDesignVariablesConfigurationIntoServerState(serverState);
    await loadTileAssetsIntoServerState(serverState);
    await loadMapsIntoServerState(serverState);
    await loadActionTreesIntoServerState(serverState);
    await loadItemsIntoServerState(serverState);
    await loadImagesIntoServerState(serverState);
    await loadAnimationAssetsIntoServerState(serverState);
    await loadCharacterConfigurationsIntoServerState(serverState);
    await loadTileAtlasDataIntoServerState(serverState);
    await loadThumbnailDataIntoServerState(serverState);
    await loadMakeshiftTranslationSystemDataIntoServerState(serverState);
    await serverState.loadSoundFileList();

    const stopRegularlySavingServerState = regularlySaveServerState(serverState);

    const app = express();
    app.set('view engine', 'ejs');

    const connectSrc = ["'self'", dataConstants.networkDiagnosticsExternalPingUrl];

    if (dataConstants.sentryDSN) {
        connectSrc.push(new URL(dataConstants.sentryDSN).origin);
    }

    if (process.env.DEACTIVATE_HELMET && config.IS_DEV) {
        logger.warn("Helmet is deactivated. This is a security risk and should never be run in a public setting.");
    } else {
        app.use(helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    scriptSrc: ["'self'", "unpkg.com", "'unsafe-eval'"],
                    imgSrc: ["'self'", "blob:"],
                    connectSrc: config.IS_DEV
                        ? [...connectSrc, "http://localhost:8085", "ws://localhost:8085"]
                        : connectSrc
                }
            }
        }));
    }

    if (!config.IS_DEV || config.MAKE_HTTPS_SERVER) {
        // Trust first proxy - without this, enforce SSL result in an ERR_TOO_MANY_REDIRECTS
        app.set('trust proxy', 1);

        // Enforce SSL
        app.use(forceSSL);

        logger.info("Enforcing SSL.");
    } else {
        logger.info("Not enforcing SSL.");
    }

    const SequelizeStore = ConnectSequelizeStore(session.Store);
    const sessionStore = new SequelizeStore({
        db: sequelize,
        tableName: "sessions"
    });
    sessionStore.sync();

    const sessionMiddleware = session({
        store: sessionStore,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        name: "sessionId",
        cookie: {
            secure: !config.IS_DEV,
            maxAge: +process.env.SESSION_COOKIE_MAX_AGE || 365 * 24 * 60 * 60 * 1000 // a year
        }
    });
    app.use(sessionMiddleware);

    app.use(passport.initialize());
    const passportSessionMiddleware = passport.session();
    app.use(passportSessionMiddleware);
    initializePassportStrategies(serverState);

    app.use(Sentry.Handlers.requestHandler());

    let httpServer: HttpServer | HttpsServer;
    if (config.MAKE_HTTPS_SERVER) {
        let certificate: { cert: string; key: string; };
        if (config.SSL_CERT && config.SSL_KEY) {
            certificate = await loadSSLCertificate(config.SSL_CERT, config.SSL_KEY);
            logger.info("Making HTTPS server with supplied SSL certificate.");
        } else {
            const domains = getLocalIPAdresses(true);
            certificate = await generateSSLCertificate(config.SSL_GENERATE_ROOT_CERT, config.SSL_GENERATE_ROOT_KEY, domains);
            logger.info("Making HTTPS server with automatically generated SSL certificates for: \n - " + domains.join("\n - "));
        }
        const { cert, key } = certificate;
        httpServer = new HttpsServer({ cert, key }, app);
    } else {
        logger.info("Making HTTP server.");
        httpServer = new HttpServer(app);
    }

    app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

    if (atlasFolder) {
        app.use(routeConstants.tileAssetAtlasImage, express.static(atlasFolder, { fallthrough: false }));
    }

    if (thumbnailFolder) {
        app.use(routeConstants.tileThumbnails, express.static(thumbnailFolder, { fallthrough: false }));
    }

    let shuttingDown = false;
    const routesAccessInterface: RoutesAccessInterface = {
        serverState,
        gracefulShutdown: async () => {
            if (shuttingDown)
                return;

            shuttingDown = true;

            logger.info("Received graceful shutdown command. Shutting down...");

            editorServer.shutdown((error) => {
                if (error) {
                    logger.error(error);
                } else {
                    logger.info("- EditorServer/HTTP Server closed");
                }
            });
            logger.info(" - EditorServer and httpServer shutting down...");

            stopRegularlySavingServerState();

            logger.info(" - Saving ServerState...");

            while (true) {
                const errorCounter = await saveServerState(serverState);
                if (errorCounter === 0)
                    break;

                logger.error(` - ${errorCounter} errors while trying to save ServerState. Trying again...`);
            }

            logger.info(" - ServerState successfully saved.");
        }
    };

    app.use("/api", addApiRouteMiddleware());
    app.use("/api", apiRouterNoCSRFProtection(routesAccessInterface));
    if (!config.IS_DEV) {
        app.use(csurf());
    }
    app.use("/api", apiRouterWithCSRFProtection(routesAccessInterface));
    app.use(handleError);

    app.use(staticsRouter());
    app.use(pagesRouter());

    app.use(Sentry.Handlers.errorHandler());

    const socketIOServer = new SocketIOServer(httpServer);
    const editorServer = new EditorServer(serverState, [sessionMiddleware, passportSessionMiddleware], socketIOServer);
    const managementServer = new ManagementServer(serverState, [sessionMiddleware, passportSessionMiddleware], socketIOServer);
    editorServer.start();
    managementServer.start();

    if (process.env.APP_METRICS_DASHBOARD === "1") {
        createAppMetricsDashboard(httpServer, process.env.APP_METRICS_DASHBOARD_USERNAME, process.env.APP_METRICS_DASHBOARD_PASSWORD);
    } else {
        logger.info("Not creating the application metrics dashboard because APP_METRICS_DASHBOARD is not set to 1.");
    }

    httpServer.listen(config.SERVER_PORT, () => {
        logger.info(`App listening on port ${config.SERVER_PORT}!`);

        if (config.MAKE_HTTPS_SERVER) {
            logger.info("------------------------------------------------");
            logger.info("If you want to access this server from your local network, one of the following URLs should work in Google Chrome:");
            for (const ipAdress of getLocalIPAdresses(false)) {
                logger.info(` - https://${ipAdress}:${config.SERVER_PORT}`);
            }
            logger.info("------------------------------------------------");
        } else {
            logger.info("Since this is not a HTTPS server, you will probably not be able to access it from your local network.");
        }
    });
}

start().catch(sendToSentryAndLogger);