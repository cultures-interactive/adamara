import { Model } from "sequelize-typescript";
import { logger } from "../integrations/logging";
import { startSegment } from "newrelic";

/**
 * Workaround for a race condition bug (https://github.com/sequelize/sequelize/issues/14510) in
 * Sequelize Model.save() that sometimes leads to fields being marked as not changed.
 * 
 * Example:
 * 1. instance.someField = 1;
 * 2. instance.save(); (without awaiting)
 * 3. Wait at least one frame, but not enough for instance.save() to complete.
 * 4. instance.someField = 2;
 * 5. Once the instance.save() completes, instance.changed("someField") will be false despite being someField = 1 in the database.
 * 
 * You can see detailed code reproducing this in sequelize.tests.ts.
 * 
 * This method fixes that by:
 * 1. Reading all currently changed values (those are the values that will be saved).
 * 2. Calling await instance.save()
 * 3. Checking if any values (except "id", "updatedAt" and "createdAt") are actually different than before, and if so...
 *   3a. Mark them as changed.
 *   3b. Go back to step 1 and save again.
 * 4. Finish once all saved values are still the same after saving.
 * 
 * WARNING: If you use this function, values that are changed while patchedSave() is running might get
 * saved in the database. I don't think this is a case anywhere in our app, but don't use this if you aren't
 * sure yet if your instance might be in a state that should not be saved to the database after patchedSave().
 * 
 * @param instance The instance to call instance.save() on.
 * @returns A promise that resolves once the instance is properly saved.
 */
export async function patchedSave(instance: Model) {
    return startSegment(`Sequelize: Saving ${instance.constructor.name} ${instance.id}`, false, async () => {
        return patchedSaveWithoutMonitoring(instance);
    });
}

async function patchedSaveWithoutMonitoring(instance: Model) {
    let fieldsChangedDuringSaving: boolean;

    do {
        const changedFields = instance.changed() || [];
        const wasNewRecord = instance.isNewRecord;

        if (!changedFields && !wasNewRecord)
            return;

        // Read values before saving
        const valuesBeforeSaving = new Map<string, any>(changedFields.map(field => [field, instance.getDataValue(field)]));

        // Save
        const result = await instance.save();

        if (wasNewRecord) {
            const changedAfterSave = instance.changed();
            if (changedAfterSave !== false)
                throw Error("Would've expected that the instance.changed() === false after saving a new record. Something changed in the sequelize save() method: " + changedAfterSave);

            // If this instance was a new record (one that was not saved in the database before), the save() was an INSERT INTO
            // and *all* values were automatically set to unchanged, not just the ones that were in instance.changed() before saving.
            // Apart from a few special fields, any field that now exists in dataValues and is not in changedFields was probably
            // changed while instance.save() was processing. Those fields were undefined before (otherwise they would've been in
            // instance.changed()) and should be added to the fields we will check later.
            for (const field of Object.keys((result as any).dataValues)) {
                if ((field === "id") || (field === "updatedAt") || (field === "createdAt"))
                    continue;

                if (changedFields.indexOf(field) === -1) {
                    changedFields.push(field);
                    valuesBeforeSaving.set(field, undefined);
                }
            }
        }

        fieldsChangedDuringSaving = false;

        // Check if any values have changed from their values before saving
        for (const field of changedFields) {
            const valueAfterSaving = instance.getDataValue(field);

            // If a value is different...
            if (valuesBeforeSaving.get(field) !== valueAfterSaving) {
                // ...mark it as changed and set the value before saving in _previousDataValues
                instance.changed(field as any, true);
                (instance as any)._previousDataValues[field] = valuesBeforeSaving.get(field);

                logger.info("sequelize thought that a field was unchanged after saving, but it actually was changed. Triggering a resave. ", {
                    instance: `${instance.constructor.name} ${instance.id}`,
                    field,
                    before: processDebugOutputValue(valuesBeforeSaving.get(field)),
                    now: processDebugOutputValue(valueAfterSaving)
                });

                fieldsChangedDuringSaving = true;
            }
        }

        // If we had any fields that were changed during saving, save again.
        // (We cannot just wait until a second save() is triggered, because if two save() calls
        // overlap with really unfortunate timing, values might get lost)
    } while (fieldsChangedDuringSaving);
}

function processDebugOutputValue(value: any) {
    const maxOutputLength = 10000;
    if ((value instanceof String) && (value.length > maxOutputLength)) {
        value = `[Value was too long: ${value.length} characters]`;
    }
    return value;
}