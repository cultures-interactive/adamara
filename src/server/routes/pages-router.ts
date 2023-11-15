import { Router } from 'express';
import { getManifest } from './manifest-manager';

export function pagesRouter() {
    const router = Router();

    router.get(`/**`, async (req, res) => {
        const manifest = await getManifest();
        const csrfToken = req.csrfToken && req.csrfToken();
        res.render("page.ejs", {
            manifest,
            csrfToken
        });
    });

    return router;
}
