import { Container } from "pixi.js";
import { Size3DModel } from "../../../../shared/resources/Size3DModel";
import { halfTileHeight, halfTileWidth } from "../../../helper/pixiHelpers";
import { Generic2DHandle } from "./Generic2DHandle";

interface ReversalOptions {
    removeOffsetXY: boolean;
    removeSizeXY: boolean;
    removeOffsetZ: boolean;
    removeSizeZ: boolean;
}

interface HandleConfig {
    sX: number;
    sY: number;
    sZ: number;
    reversal: ReversalOptions;
}

const keepOffsetXY: ReversalOptions = {
    removeOffsetXY: false,
    removeSizeXY: true,
    removeOffsetZ: true,
    removeSizeZ: true
};

const keepOffsetAndSizeXY: ReversalOptions = {
    removeOffsetXY: false,
    removeSizeXY: false,
    removeOffsetZ: true,
    removeSizeZ: true
};

const keepZ: ReversalOptions = {
    removeOffsetXY: true,
    removeSizeXY: true,
    removeOffsetZ: false,
    removeSizeZ: false
};

const centerHandle: HandleConfig = { sX: 0.5, sY: 0.5, sZ: 0, reversal: keepOffsetXY };
const backHandleX: HandleConfig = { sX: 0, sY: 0.5, sZ: 0, reversal: keepOffsetAndSizeXY };
const frontHandleX: HandleConfig = { sX: 1, sY: 0.5, sZ: 0, reversal: keepOffsetAndSizeXY };
const backHandleY: HandleConfig = { sX: 0.5, sY: 0, sZ: 0, reversal: keepOffsetAndSizeXY };
const frontHandleY: HandleConfig = { sX: 0.5, sY: 1, sZ: 0, reversal: keepOffsetAndSizeXY };
const bottomHandle: HandleConfig = { sX: 1, sY: 0, sZ: 0, reversal: keepZ };
const topHandle: HandleConfig = { sX: 1, sY: 0, sZ: 1, reversal: keepZ };

const handleColorCenter = 0x65A2E1;
const handleColorX = 0x0861BE;
const handleColorY = handleColorX;
const handleColorZ = 0x053A72;

interface SizeAndHandleManagerTarget {
    offsetX: number;
    offsetY: number;
    internalOffsetZ: number;
    size: Size3DModel;

    setOffsetX(value: number): void;
    setOffsetY(value: number): void;
    setInternalOffsetZ(value: number): void;
    setSizeX(value: number): void;
    setSizeY(value: number): void;
    setSizeZ(value: number): void;
}

export class SizeAndHandleManager<Target extends SizeAndHandleManagerTarget> {
    private handles = new Array<Generic2DHandle>();
    private backHandleX: Generic2DHandle;
    private frontHandleX: Generic2DHandle;
    private backHandleY: Generic2DHandle;
    private frontHandleY: Generic2DHandle;
    private bottomHandle: Generic2DHandle;
    private topHandle: Generic2DHandle;

    private _tileAsset: Target;

    public constructor(
        cameraContainer: Container,
        private addHandleCallback: (handle: Generic2DHandle) => void,
        private updateCallback: (t: Target, changeExecuter: () => void) => void,
        private isGroundCallback: (t: Target) => boolean
    ) {
        this.bottomHandle = this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorZ,
            () => !!this.target && !this.isGround,
            () => this.interpolatedTileToWorldPositionX(bottomHandle),
            () => this.interpolatedTileToWorldPositionY(bottomHandle),
            (x, y) => this.updateZ(this.bottomHandle.handleX, y, this.topHandle.handleX, this.topHandle.handleY)
        ));

        this.topHandle = this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorZ,
            () => !!this.target,
            () => this.interpolatedTileToWorldPositionX(topHandle),
            () => this.interpolatedTileToWorldPositionY(topHandle),
            (x, y) => this.updateZ(this.bottomHandle.handleX, this.bottomHandle.handleY, this.topHandle.handleX, y)
        ));

        this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorCenter,
            () => !!this.target && !this.isGround,
            () => this.interpolatedTileToWorldPositionX(centerHandle),
            () => this.interpolatedTileToWorldPositionY(centerHandle),
            (x, y) => {
                const tileX = this.interpolatedWorldToTilePositionX(x, y, centerHandle);
                const tileY = this.interpolatedWorldToTilePositionY(x, y, centerHandle);

                this.updateTarget(() => {
                    this.target.setOffsetX(tileX);
                    this.target.setOffsetY(tileY);
                });
            }
        ));

        this.backHandleX = this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorX,
            () => !!this.target && !this.isGround,
            () => this.interpolatedTileToWorldPositionX(backHandleX),
            () => this.interpolatedTileToWorldPositionY(backHandleX),
            (x, y) => this.updateX(x, y, this.frontHandleX.handleX, this.frontHandleX.handleY)
        ));

        this.frontHandleX = this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorX,
            () => !!this.target,
            () => this.interpolatedTileToWorldPositionX(frontHandleX),
            () => this.interpolatedTileToWorldPositionY(frontHandleX),
            (x, y) => this.updateX(this.backHandleX.handleX, this.backHandleX.handleY, x, y)
        ));

        this.backHandleY = this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorY,
            () => !!this.target && !this.isGround,
            () => this.interpolatedTileToWorldPositionX(backHandleY),
            () => this.interpolatedTileToWorldPositionY(backHandleY),
            (x, y) => this.updateY(x, y, this.frontHandleY.handleX, this.frontHandleY.handleY)
        ));

        this.frontHandleY = this.addHandle(new Generic2DHandle(
            cameraContainer,
            handleColorY,
            () => !!this.target,
            () => this.interpolatedTileToWorldPositionX(frontHandleY),
            () => this.interpolatedTileToWorldPositionY(frontHandleY),
            (x, y) => this.updateY(this.backHandleY.handleX, this.backHandleY.handleY, x, y)
        ));
    }

    private addHandle(handle: Generic2DHandle) {
        this.handles.push(handle);
        this.addHandleCallback(handle);
        return handle;
    }

    public get target() {
        return this._tileAsset;
    }

    public set target(value: Target) {
        this._tileAsset = value;
        this.handles.forEach(handle => handle.updatePosition());
    }

    private updateX(backWorldX: number, backWorldY: number, frontWorldX: number, frontWorldY: number) {
        const bX = this.isGround ? 0 : this.interpolatedWorldToTilePositionX(backWorldX, backWorldY, backHandleX);
        const fX = this.interpolatedWorldToTilePositionX(frontWorldX, frontWorldY, frontHandleX);

        this.updateTarget(() => {
            this.target.setOffsetX(bX);
            this.target.setSizeX(fX - this.target.offsetX);
        });
    }

    private updateY(backWorldX: number, backWorldY: number, frontWorldX: number, frontWorldY: number) {
        const bY = this.isGround ? 0 : this.interpolatedWorldToTilePositionY(backWorldX, backWorldY, backHandleX);
        const fY = this.interpolatedWorldToTilePositionY(frontWorldX, frontWorldY, frontHandleX);

        this.updateTarget(() => {
            this.target.setOffsetY(bY);
            this.target.setSizeY(fY - this.target.offsetY);
        });
    }

    private updateZ(bottomWorldX: number, bottomWorldY: number, topWorldX: number, topWorldY: number) {
        const bZ = this.isGround ? 0 : this.interpolatedWorldToTilePositionY(bottomWorldX, bottomWorldY, bottomHandle);
        const tZ = this.interpolatedWorldToTilePositionY(topWorldX, topWorldY, topHandle);

        this.updateTarget(() => {
            this.target.setInternalOffsetZ(-bZ);
            this.target.setSizeZ(-tZ * this.sizeDirection - this.target.internalOffsetZ);
        });
    }

    private getTileX(config: HandleConfig) {
        const { sX, sZ } = config;
        const { offsetX, internalOffsetZ, size } = this.target;
        const tileX = offsetX + sX * size.x - internalOffsetZ - sZ * size.z * this.sizeDirection;
        return tileX;
    }

    private getTileY(config: HandleConfig) {
        const { sY, sZ } = config;
        const { offsetY, internalOffsetZ, size } = this.target;
        const tileY = offsetY + sY * size.y - internalOffsetZ - sZ * size.z * this.sizeDirection;
        return tileY;
    }

    private interpolatedTileToWorldPositionX(config: HandleConfig) {
        const tileX = this.getTileX(config);
        const tileY = this.getTileY(config);
        let worldX = (tileX - tileY) * halfTileWidth;
        worldX += halfTileWidth;
        return worldX;
    }

    private interpolatedTileToWorldPositionY(config: HandleConfig) {
        const tileX = this.getTileX(config);
        const tileY = this.getTileY(config);
        return (tileX + tileY) * halfTileHeight;
    }

    private interpolatedWorldToTilePositionX(worldX: number, worldY: number, config: HandleConfig) {
        worldX -= halfTileWidth;
        let tileX = (worldX / halfTileWidth + worldY / halfTileHeight) / 2;

        const { reversal } = config;

        if (reversal.removeOffsetXY) {
            tileX -= this.target.offsetX;
        }

        if (reversal.removeSizeXY) {
            tileX -= this.target.size.x * config.sX;
        }

        if (reversal.removeOffsetZ) {
            tileX += this.target.internalOffsetZ;
        }

        if (reversal.removeSizeZ) {
            tileX += this.target.size.z * config.sZ * this.sizeDirection;
        }

        return tileX;
    }

    private interpolatedWorldToTilePositionY(worldX: number, worldY: number, config: HandleConfig) {
        worldX -= halfTileWidth;
        let tileY = (worldY / halfTileHeight - worldX / halfTileWidth) / 2;

        const { reversal } = config;

        if (reversal.removeOffsetXY) {
            tileY -= this.target.offsetY;
        }

        if (reversal.removeSizeXY) {
            tileY -= this.target.size.y * config.sY;
        }

        if (reversal.removeOffsetZ) {
            tileY += this.target.internalOffsetZ;
        }

        if (reversal.removeSizeZ) {
            tileY += this.target.size.z * config.sZ * this.sizeDirection;
        }

        return tileY;
    }

    private updateTarget(changeExecuter: () => void) {
        this.updateCallback(this.target, changeExecuter);
    }

    private get isGround() {
        return this.isGroundCallback(this.target);
    }

    private get sizeDirection() { return this.isGround ? -1 : 1; }
}