export enum Gender {
    Neutral = "",
    Female = "_f",
    Male = "_m"
}

export const genders = Object.values(Gender);
export const gendersWithoutNeutral = genders.filter(value => !!value);