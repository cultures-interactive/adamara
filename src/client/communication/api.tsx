import axios, { AxiosResponse, AxiosPromise, AxiosError } from "axios";
import { fromSnapshot } from "mobx-keystone";
import { GameMapGetResult } from "../../shared/definitions/apiResults/GameMapGetResult";
import { MapDataModel } from "../../shared/game/MapDataModel";
import { LogoutReason, userStore } from "../stores/UserStore";
import { TileImageUsage } from "../../shared/resources/TileAssetModel";
import { AuthCheckLoginStatusResult } from "../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { clientId } from "../data/clientId";
import { editorStore } from "../stores/EditorStore";
import { PlayableModule } from "../../shared/workshop/ModuleModel";

const axiosToServer = axios.create({
    headers: {
        'x-csrf-token': document.querySelector("meta[name=\"csrf-token\"]")?.getAttribute("content"),
    },
});

/* ----------------- */
/* -- Auth Routes -- */
/* ----------------- */

export async function authLogin(username: string, password: string) {
    return processAnswer<AuthCheckLoginStatusResult>(
        axiosToServer.post("/api/auth/login", {
            username,
            password
        })
    );
}

export function authLogout() {
    return processAnswer<void>(
        axiosToServer.post("/api/auth/logout")
    );
}

export async function authStatus() {
    return processAnswer<AuthCheckLoginStatusResult>(
        axiosToServer.get("/api/auth/status")
    );
}

/* --------------------- */
/* -- Resource routes -- */
/* --------------------- */

export async function resourceGetTileAssetImage(tileAssetId: string, usage: TileImageUsage, version: string, abortSignal: AbortSignal) {
    return await processAnswer<Blob>(
        axiosToServer.get(`/api/resources/tileAssetImage/${encodeURIComponent(tileAssetId)}/${usage}/${version}`, {
            responseType: "blob",
            signal: abortSignal
        })
    );
}

export async function resourceGetTileAssetAtlasImage(atlasImageName: string, abortSignal: AbortSignal) {
    return await processAnswer<Blob>(
        axiosToServer.get(`/tileAssetAtlasImage/${encodeURIComponent(atlasImageName)}`, {
            responseType: "blob",
            signal: abortSignal
        })
    );
}

export async function resourceGetImage(id: number, abortSignal: AbortSignal) {
    return await processAnswer<Blob>(
        axiosToServer.get(`/api/resources/image/${id}`, {
            responseType: "blob",
            signal: abortSignal
        })
    );
}

export async function resourceAnimationSkeletonBuffer(animationId: number) {
    return await processAnswer<ArrayBuffer>(
        axiosToServer.get(`/api/resources/animationSkeletonBuffer/${animationId}`, {
            responseType: "arraybuffer"
        })
    );
}

export async function resourceAnimationImageBuffer(animationId: number) {
    return await processAnswer<ArrayBuffer>(
        axiosToServer.get(`/api/resources/animationImageBuffer/${animationId}`, {
            responseType: "arraybuffer"
        })
    );
}

export async function resourceAnimationAtlasBuffer(animationId: number) {
    return await processAnswer<ArrayBuffer>(
        axiosToServer.get(`/api/resources/animationAtlasBuffer/${animationId}`, {
            responseType: "arraybuffer"
        })
    );
}

export async function resourcePublicModuleInMenu() {
    return await processAnswer<PlayableModule[]>(
        axiosToServer.get(`/api/resources/publicModulesInMenu`)
    );
}

/* ----------------- */
/* -- Game routes -- */
/* ----------------- */

export async function gameGetMap(id: number, abortSignal?: AbortSignal) {
    const result = await processAnswer<GameMapGetResult>(
        axiosToServer.get(`/api/game/maps/${id}`, {
            signal: abortSignal
        })
    );
    return fromSnapshot<MapDataModel>(result.mapDataSnapshot);
}

/* ------------------- */
/* -- Report routes -- */
/* ------------------- */

function catchReportingProblem(promise: Promise<void>) {
    promise.catch(e => {
        const axiosError = e as AxiosError;
        console.log(`Couldn't report to ${axiosError?.config.url} due to ${e}.`);
    });
}

export function reportSocketConnectionProblem(reason: string) {
    // Don't report if the server told us that it will shut down
    if (editorStore.serverWasShutDown)
        return;

    catchReportingProblem(processAnswer<void>(
        axiosToServer.post(`/api/report/socketConnectionProblem`, {
            clientId,
            reason
        })
    ));
}

export function reportSocketUnexpectedDisconnect(reason: string) {
    // Don't report if the server told us that it will shut down
    if (editorStore.serverWasShutDown)
        return;

    catchReportingProblem(processAnswer<void>(
        axiosToServer.post(`/api/report/socketUnexpectedDisconnect`, {
            clientId,
            reason
        })
    ));
}

/* ---------------------- */
/* -- Helper functions -- */
/* ---------------------- */

async function processAnswer<T>(axiosPromise: AxiosPromise) {
    try {
        const result = await axiosPromise as AxiosResponse<T>;
        return result.data;
    } catch (err) {
        if (err.response) {
            const { status } = err.response as AxiosResponse<T>;
            if (status === 401) {
                userStore.setLoggedOut(LogoutReason.ByServer);
            }
        }

        throw err;
    }
}