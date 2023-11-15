import { Direction, DirectionHelper } from "../../../../shared/resources/DirectionHelper";
import { Spine, Color } from "@pixi-spine/all-4.1";

export const CharacterDefaultIdleDirection = Direction.East;
export const CharacterAnimationMixTimeDelay = 0.15;
export const CharacterAnimationPrefixWalk = "walk";
export const CharacterAnimationPrefixIdle = "idle";
export const CharacterAnimationSlotNamePostFixTintable = "tintable-1";
export const CharacterAnimationSkinColors = [
    "#FDE7AC", "#D49E7A", "#CC9662", "#B26544",
    "#F8D998", "#ECC091", "#B19066", "#7F4422",
    "#FDE3C4", "#EEBF7E", "#F0C283", "#5F330F",
    "#F9D4A0", "#BB6435", "#734017"//, "#291809" // Removed until we can properly integrate it
];
export const CharacterDefaultName = process.env.DEFAULT_PLAYER_NAME;

const LegacyBodyShapeNameToImageName: Map<string, string> = new Map([
    ["Koerpertyp_01", "Icon_Typ_1"],
    ["Koerpertyp_02", "Icon_Typ_2"],
    ["Koerpertyp_03", "Icon_Typ_3"],
    ["Koerpertyp_04", "Icon_Typ_4"],
    ["Koerpertyp_05", "Icon_Typ_5"],
    ["Koerpertyp_06", "Icon_Typ_6"]
]);

const BodyShapeNameToImageName: Map<string, string> = new Map([
    ["Typ 1", "Icon_Typ_1"],
    ["Typ 2", "Icon_Typ_2"],
    ["Typ 3", "Icon_Typ_3"],
    ["Typ 4", "Icon_Typ_4"],
    ["Typ 5", "Icon_Typ_5"],
    ["Typ 6", "Icon_Typ_6"]
]);

export function getImageNameByBodyType(bodyTypeName: string) {
    const name = BodyShapeNameToImageName.get(bodyTypeName);
    return name == null ? LegacyBodyShapeNameToImageName.get(bodyTypeName) : name;
}

function isAlreadyAnimating(spine: Spine, animationName: string) {
    if (!spine || !spine.state.tracks[0]) return false;
    return spine.state.tracks[0].animation.name == animationName;
}

function setAnimation(spine: Spine, animationName: string) {
    if (!spine || !spine.state) {
        console.warn("Animation data is missing.");
        return;
    }
    if (spine.state.hasAnimation(animationName)) {
        if (!isAlreadyAnimating(spine, animationName)) {
            spine.state.setAnimation(0, animationName, true);
        }
    }
}

/**
 * Returns true if the assigned {@link Spine} animation contains
 * all movement related animation states.
 * @param spine The animation to check.
 */
export function hasAllMovementStates(spine: Spine) {
    for (const direction of DirectionHelper.edgeDirections) {
        const walkAnimationName = CharacterAnimationPrefixWalk + DirectionHelper.getName(direction);
        const idleAnimationName = CharacterAnimationPrefixIdle + DirectionHelper.getName(direction);
        if (!spine.state.hasAnimation(walkAnimationName) || !spine.state.hasAnimation(idleAnimationName)) return false;
    }
    return true;
}

/**
 * Applied animation transitions for walk to idle and idle to walk transitions.
 * @param spine The animation.
 */
export function applyAnimationTransition(spine: Spine) {
    if (!spine) return;
    DirectionHelper.allDirections.forEach(direction => {
        const walkAnimationName = CharacterAnimationPrefixWalk + DirectionHelper.getName(direction);
        const idleAnimationName = CharacterAnimationPrefixIdle + DirectionHelper.getName(direction);
        if (spine.state.hasAnimation(walkAnimationName) && spine.state.hasAnimation(idleAnimationName)) {
            spine.stateData.setMix(walkAnimationName, idleAnimationName, CharacterAnimationMixTimeDelay);
            spine.stateData.setMix(idleAnimationName, walkAnimationName, CharacterAnimationMixTimeDelay);
        }
    });
}

/**
 * Applies the walk animation in the assigned {@link Direction}.
 * @param spine The animation.
 * @param direction The direction to walk to.
 */
export function applyWalkAnimation(spine: Spine, direction: Direction) {
    if (!spine) return;
    const walkDirection = DirectionHelper.getName(DirectionHelper.toAnimatableDirection(direction));
    setAnimation(spine, CharacterAnimationPrefixWalk + walkDirection);
}

/**
 * Applied the idle animation in the assigned {@link Direction}.
 * @param spine The animation.
 * @param direction The direction to idle to.
 */
export function applyIdleAnimation(spine: Spine, direction: Direction = null) {
    if (!spine) return;
    let facingDirection = DirectionHelper.getName(CharacterDefaultIdleDirection);
    if (direction != null) facingDirection = DirectionHelper.getName(DirectionHelper.toAnimatableDirection(direction));
    setAnimation(spine, CharacterAnimationPrefixIdle + facingDirection);
}

/**
 * Sets the tint of a the skin of the character.
 * @param spine the animation to tint.
 * @param color the color to use.
 * @return Returns this spine.
 */
export function setSkinTint(spine: Spine, color: Color) {
    if (!spine || !color) return;
    spine.skeleton.slots.forEach(slot => {
        if (slot.data.name.endsWith(CharacterAnimationSlotNamePostFixTintable)) {
            slot.color.set(color.r / 256, color.g / 256, color.b / 256, 1);
        }
    });
}


