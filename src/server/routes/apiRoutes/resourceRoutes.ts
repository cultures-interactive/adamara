import { Router } from "express";
import { TileImageUsage } from "../../../shared/resources/TileAssetModel";
import { createPlayableModule } from "../../helper/moduleHelpers";
import { errorWrapper } from "../../helper/routerUtils";
import { RoutesAccessInterface } from "../RoutesAccessInterface";

export function resourceRoutes(access: RoutesAccessInterface) {
    const router = Router();

    router.get("/tileAssetImage/:tileAssetId/:usage/:version", getTileAssetImage(access));
    router.get("/image/:id", getImage(access));
    router.get("/animationSkeletonBuffer/:id", getAnimationSkeletonBuffer(access));
    router.get("/animationImageBuffer/:id", getAnimationImageBuffer(access));
    router.get("/animationAtlasBuffer/:id", getAnimationAtlasBuffer(access));
    router.get("/publicModulesInMenu", getPublicModulesInMenu(access));

    return router;
}

function getTileAssetImage(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const tileAssetId = req.params.tileAssetId;
        const usage = +req.params.usage as TileImageUsage;
        const version = req.params.version;
        const tileAsset = access.serverState.tileAssets.get(tileAssetId);
        if (!tileAsset || tileAsset.deleted) {
            res.sendStatus(404);
            return;
        }

        const actualVersion = tileAsset.getImageDataVersion(usage);
        if (actualVersion !== version) {
            res.sendStatus(404);
            return;
        }

        const image = tileAsset.getImageData(usage);
        if (!image) {
            res.sendStatus(404);
            return;
        }

        res.type("png");
        res.end(image);
    });
}

function getImage(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const id = +req.params.id;
        const imageAsset = access.serverState.images.get(id);
        if (!imageAsset || imageAsset.deleted) {
            res.sendStatus(404);
            return;
        }

        res.type("png");
        res.end(imageAsset.imageData);
    });
}

function getAnimationSkeletonBuffer(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const id = +req.params.id;

        const animationAsset = access.serverState.animationAssets.get(id);
        if (!animationAsset || animationAsset.deleted) {
            res.sendStatus(404);
            return;
        }

        res.end(animationAsset.skeleton);
    });
}

function getAnimationImageBuffer(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const id = +req.params.id;

        const animationAsset = access.serverState.animationAssets.get(id);
        if (!animationAsset || animationAsset.deleted) {
            res.sendStatus(404);
            return;
        }

        res.end(animationAsset.image);
    });
}

function getAnimationAtlasBuffer(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const id = +req.params.id;

        const animationAsset = access.serverState.animationAssets.get(id);
        if (!animationAsset || animationAsset.deleted) {
            res.sendStatus(404);
            return;
        }

        res.end(animationAsset.atlas);
    });
}

function getPublicModulesInMenu(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const playableModules = access.serverState.activeModules
            .map(module => module.snapshot)
            .filter(snapshot => snapshot.visibleInPublicMenu && snapshot.readyToPlay)
            .map(snapshot => createPlayableModule(snapshot, access.serverState));

        res.send(playableModules);
    });
}

