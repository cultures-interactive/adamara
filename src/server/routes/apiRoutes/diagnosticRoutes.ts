import { Router } from "express";
import { errorWrapper } from "../../helper/routerUtils";

export function diagnosticRoutes() {
    const router = Router();

    router.get("/available", getAvailable());

    return router;
}

function getAvailable() {
    return errorWrapper(async (_, res) => {
        res.sendStatus(200);
    });
}
