export interface AccessCodeConfig {
    length: number;
}

export const workshopAdminAccessCodeConfig: AccessCodeConfig = {
    length: 10
};

export const workshopPlayCodeConfig: AccessCodeConfig = {
    length: 6
};

export const standaloneModulePlayCodeConfig: AccessCodeConfig = {
    length: 6
};

export const moduleParticipantAccessCodeConfig: AccessCodeConfig = {
    length: 6
};

function generateAccesscode(config: AccessCodeConfig) {
    let result = '';

    // 0 might look too similar to a big O. l (small L) and 1 (number) might look too similar.
    const characters = 'abcdefghijkmnopqrstuvwxyz23456789';

    const { length } = config;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function generateUniqueAccesscode(config: AccessCodeConfig, doesAccesscodeExist: (accesscode: string) => boolean) {
    let newAccesscode = "";
    do {
        newAccesscode = generateAccesscode(config);
    } while (doesAccesscodeExist(newAccesscode)); // On the off chance that a code gets generated that is already used, make a new one
    return newAccesscode;
}