import { projectAngle, projectPosition, unProjectAngle } from "../../../helper/pixiHelpers";
import { MathE } from "../../../../shared/helper/MathExtension";
import { gameConstants } from "../../../data/gameConstants";

const recalculationAngleThreshold = 0.000001;

export class ViewAreaPolygon {

    private readonly viewRadius: number;
    private readonly angleStep: number;
    private readonly halfFov: number;

    private angleRad: number = 0;

    private previousCalculatedAngleStartEnd: number = null;
    private cachedAngles = { startAngle: 0, endAngle: 0 };

    private previousCalculatedAngleVertices: number = null;
    private cachedVertices: Array<number> = null;

    /**
     * Creates a new instance.
     * @param directionAngle The initial direction 'un-projected' angle.
     * @param viewRadiusInTiles The view radius as length in tiles.
     * @param color The color of the polygon.
     * @param resolution The resolution of the view area polygon.
     * @param fov The field of view in radiant.
     */
    public constructor(private directionAngle: number, viewRadiusInTiles: number, public color = 0x3333FF, public readonly resolution = 8, private fov = MathE.PI_HALF) {
        this.viewRadius = gameConstants.unProjectedTileSize * 1.5 + (gameConstants.unProjectedTileSize * (viewRadiusInTiles - 1));
        this.angleStep = fov / resolution;
        this.halfFov = fov / 2;
    }

    /**
     * Rotates the {@link ViewAreaPolygon} to the assigned angle in radiant.
     * @param angleRad The angle in radiant.
     */
    public setAngleRad(angleRad: number) {
        this.angleRad = angleRad;
    }

    private getUpdatedAngles() {
        if (!MathE.equalsApproximately(this.previousCalculatedAngleStartEnd, this.angleRad, recalculationAngleThreshold)) {
            this.previousCalculatedAngleStartEnd = this.angleRad;
            this.cachedAngles.startAngle = unProjectAngle(this.angleRad) + this.directionAngle - this.halfFov;
            this.cachedAngles.endAngle = this.cachedAngles.startAngle + this.fov;
        }

        return this.cachedAngles;
    }

    public getUpdatedVertices() {
        if (this.cachedVertices === null) {
            this.cachedVertices = [];
            this.cachedVertices.push(0, 0); // start
            for (let step = 0; step <= this.resolution; step++) this.cachedVertices.push(0, 0); // arc
            this.cachedVertices.push(0, 0); // end
        }

        if (!MathE.equalsApproximately(this.previousCalculatedAngleVertices, this.angleRad, recalculationAngleThreshold)) {
            this.previousCalculatedAngleVertices = this.angleRad;
            const { startAngle } = this.getUpdatedAngles();
            for (let step = 0; step <= this.resolution; step++) {
                const currentAngle = startAngle + (this.angleStep * step);
                const vertex = projectPosition([Math.cos(currentAngle) * this.viewRadius, Math.sin(currentAngle) * this.viewRadius, 0]);
                const vertexIndex = 2 * (step + 1); // first vertex is at 0, 0 and does not need to be rotated
                this.cachedVertices[vertexIndex] = vertex[0]; // x
                this.cachedVertices[vertexIndex + 1] = vertex[1]; // y
            }
        }

        return this.cachedVertices;
    }

    /**
     * Returns true if the assigned coordinate intersects this polygon.
     * Use coordinates that are relative to the origin of this polygon.
     * @param localX The local x coordinate.
     * @param localY The local y coordinate.
     * @return Returns true if the coordinate intersects.
     */
    public intersects(localX: number, localY: number): boolean {
        // Check if the point is inside the projected radius.
        const projectedDistanceFromOrigin = MathE.distance(0, 0, localX, localY * gameConstants.tileAspectRatio);
        if (projectedDistanceFromOrigin > this.viewRadius) {
            return false;
        }

        const { startAngle, endAngle } = this.getUpdatedAngles();

        // Check if the point is within the field of view angles.
        const pointAngle = MathE.angleBetween(0, 0, localX, localY);
        return MathE.isAngleBetween(projectAngle(startAngle), projectAngle(endAngle), pointAngle);
    }
}