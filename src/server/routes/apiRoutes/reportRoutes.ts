import { Router } from "express";
import { logger } from "../../integrations/logging";
import { reportClientSocketConnectionProblem, reportClientSocketUnexpectedDisconnect } from "../../integrations/monitoring";
import { errorWrapper } from "../../helper/routerUtils";

export function reportRoutes() {
    const router = Router();

    router.post("/socketConnectionProblem", postSocketIOProblemWithReason("Connection problem", reportClientSocketConnectionProblem));
    router.post("/socketUnexpectedDisconnect", postSocketIOProblemWithReason("Unexpected disconnect", reportClientSocketUnexpectedDisconnect));

    return router;
}

function postSocketIOProblemWithReason(description: string, monitoringReporter: (reason: string, clientId: string) => void) {
    return errorWrapper(async (req, res) => {
        const clientId = req.body.clientId as string;
        const reason = req.body.reason as string;

        logger.warn(`Client ${clientId}: ${description} (${reason})`);
        monitoringReporter(reason, clientId);

        res.sendStatus(200);
    });
}
