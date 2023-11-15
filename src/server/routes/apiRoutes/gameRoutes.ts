import { Router } from "express";
import { GameMapGetResult } from "../../../shared/definitions/apiResults/GameMapGetResult";
import { NotFoundError } from "../../helper/errors/NotFoundError";
import { errorWrapper } from "../../helper/routerUtils";
import { RoutesAccessInterface } from "../RoutesAccessInterface";

export function gameRoutes(access: RoutesAccessInterface) {
    const router = Router();

    router.get("/maps/:id", getMap(access));

    return router;
}

function getMap(access: RoutesAccessInterface) {
    return errorWrapper(async (req, res) => {
        const mapId = +req.params.id;
        const gameMap = access.serverState.getMapById(mapId);
        if (!gameMap)
            throw new NotFoundError();

        const result: GameMapGetResult = {
            mapDataSnapshot: gameMap.mapSnapshot
        };
        res.json(result);
    });
}
