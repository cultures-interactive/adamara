import { AfterSave, AutoIncrement, BeforeSave, Column, CreatedAt, DataType, Model, PrimaryKey, Sequelize, Table, UpdatedAt } from "sequelize-typescript";
import { patchedSave } from "../../../server/helper/sequelizeUtils";

function waitUntilNextFrame() {
    return new Promise<void>(resolve => {
        setTimeout(() => resolve(), 0);
    });
}

const DB_URL = process.env.DB_URL;

export const sequelize = DB_URL && new Sequelize(DB_URL, {
    /*
    logging: (sql, options) => {
        const boundParameters = (options as any).bind as Array<any>;
        console.log(sql, boundParameters);
    },
    hooks: {
        afterSave: (instance) => {
            const instanceAny = instance as any;
            console.log(`${instanceAny.constructor.name} ${instanceAny.id} saved.`);
        }
    }
    */
});

@Table({
    tableName: "sequelize_test"
})
export class SequelizeTest extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    public id: number;

    @CreatedAt
    public readonly createdAt: Date;

    @UpdatedAt
    public readonly updatedAt: Date;

    @Column(DataType.INTEGER)
    public n: number;

    @Column(DataType.INTEGER)
    public someOtherValue: number;

    @BeforeSave
    public static onBeforeSave(instance: SequelizeTest) {
        //console.log("Before save", instance);
    }

    @AfterSave
    public static onAfterSave(instance: SequelizeTest) {
        //console.log("After save", instance);
    }
}

if (sequelize) {
    beforeEach(async () => {
        sequelize.addModels([SequelizeTest]);
        await SequelizeTest.sync({ force: true });
    });

    afterEach(async () => {
        await SequelizeTest.drop();
    });
} else {
    test.only('Skipping sequelize tests because DB_URL is not set', () => {
        console.warn('Skipping sequelize tests because DB_URL is not set');
    });
}

describe("unpatched: check that all bugs still exist for \"sequelize should not mark fields as unchanged without saving them\"", () => {
    test('NO BUG: Properly waiting works', async () => {
        const newInstance = new SequelizeTest();

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        await newInstance.save();

        newInstance.n = 1;

        // UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        await newInstance.save();

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be 1 :)
    });

    test('BUG: Start saving again before first save completes', async () => {
        const newInstance = new SequelizeTest();
        //newInstance.id = "some id";

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const insertIntoPromise = newInstance.save();

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() INSERT INTO has started, but before it has completed
        newInstance.n = 1;

        await newInstance.save();

        // Wait for the previous INSERT INTO
        await insertIntoPromise;

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(null);
    });

    test('BUG: Start saving again before first save completes, but then change the value again', async () => {
        const newInstance = new SequelizeTest();
        //newInstance.id = "some id";

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const insertIntoPromise = newInstance.save();

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() INSERT INTO has started, but before it has completed
        newInstance.n = 1;

        const firstSavePromise = newInstance.save();

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        newInstance.n = 2;

        await newInstance.save();

        await firstSavePromise;

        // Wait for the previous INSERT INTO
        await insertIntoPromise;

        expect(newInstance.n).toBe(2);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(null);
    });

    test('BUG: Minimal Example unawaited INSERT INTO + UPDATE', async () => {
        const newInstance = new SequelizeTest();
        //newInstance.id = "some id";

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const insertIntoPromise = newInstance.save();

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() INSERT INTO has started, but before it has completed
        newInstance.n = 1;

        // Wait for the previous INSERT INTO
        await insertIntoPromise;

        // Should be: UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        // ...but actually it won't even get called because newInstance.changed("n") === false
        await newInstance.save();

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(null); // Expected: 1, Received: null
    });

    test('BUG: Minimal Example awaited INSERT INTO + unawaited UPDATE + UPDATE', async () => {
        const newInstance = new SequelizeTest();

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        await newInstance.save();

        newInstance.n = 9999;

        // UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        const updatePromise = newInstance.save();

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() UPDATE has started, but before it has completed
        newInstance.n = 1;

        // Wait for the previous UPDATE
        await updatePromise;

        // Should be: UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        // ...but actually it won't even get called because newInstance.changed("n") === false
        await newInstance.save();

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(9999); // Expected: 1, Received: 9999
    });

    test('Bug Variant A: Have no initial value for n during INSERT INTO', async () => {
        const newInstance = new SequelizeTest();
        newInstance.id = 3;

        expect(newInstance.changed()).toStrictEqual(["id"]);

        // Unlike the previous test, we start INSERT INTO but don't await
        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const savePromise = newInstance.save();

        expect(newInstance.changed()).toStrictEqual(["id"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // changed("n") is still false
        expect(newInstance.changed()).toStrictEqual(["id"]);

        // We set n
        //console.log("Before setting n", newInstance);
        newInstance.n = 1;
        //console.log("After setting n", newInstance);

        // changed("n") is now true
        expect(newInstance.changed()).toStrictEqual(["id", "n"]);

        // Now we wait for the INSERT INTO to finish
        await savePromise;

        //console.log("After await savePromise", newInstance);

        // The INSERT INTO did not set n, but it also set changed("n") to false
        expect(newInstance.changed()).toStrictEqual(false); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database

        // Now we try to save our new value for n, but it doesn't do anything - it thinks there are no changes
        await newInstance.save();

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(null); // Expected: 1, Received: null
    });

    test('Bug Variant B: Have an initial value for n during INSERT INTO', async () => {
        const newInstance = new SequelizeTest();

        // This time we set n to 9999 in the INSERT INTO. No change to the bug.
        newInstance.n = 9999;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise = newInstance.save();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise;

        expect(newInstance.changed()).toStrictEqual(false); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database

        await newInstance.save();

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(9999); // Expected: 1, Received: 9999
    });

    test('NO BUG Variant C1: Properly await the first INSERT INTO (without n), then try to trigger the bug later by not awaiting an UPDATE with an unrelated value', async () => {
        const newInstance = new SequelizeTest();

        expect(newInstance.changed()).toStrictEqual(false);

        // This time we properly await the INSERT INTO...
        await newInstance.save();

        expect(newInstance.changed()).toStrictEqual(false);

        // ...but then set some value that is not n...
        newInstance.someOtherValue = 321;

        expect(newInstance.changed()).toStrictEqual(["someOtherValue"]);

        // ...and not properly await the save.
        const savePromise = newInstance.save();

        expect(newInstance.changed()).toStrictEqual(["someOtherValue"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["someOtherValue"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["someOtherValue", "n"]);

        await savePromise;

        // This works out well though. n is not written by the previous UPDATE and changed("n") stays true.
        expect(newInstance.changed()).toStrictEqual(["n"]);

        await newInstance.save();

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be 1 :)
    });

    test('Bug Variant C2: Properly await the first INSERT INTO (without n), then try to trigger the bug later by not awaiting an UPDATE with n', async () => {
        const newInstance = new SequelizeTest();
        await newInstance.save();

        // This time we do exactly the same as above, but instead of someOtherValue, we set n.
        newInstance.n = 321;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise = newInstance.save();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise;

        expect(newInstance.changed()).toStrictEqual(false); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database

        await newInstance.save();

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(321); // Expected: 1, Received: 321
    });

    test('Bug Variant C3: A C2 test with more steps', async () => {
        const newInstance = new SequelizeTest();
        await newInstance.save();

        // This time we do exactly the same as above, but instead of someOtherValue, we set n.
        newInstance.n = 321;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise = newInstance.save();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise;

        expect(newInstance.changed()).toStrictEqual(false); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database

        await newInstance.save();

        expect(newInstance.changed()).toStrictEqual(false);

        newInstance.n = 2;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise2 = newInstance.save();

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        newInstance.n = 3;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise2;

        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(2);

        expect(newInstance.changed()).toStrictEqual(false);

        await newInstance.save();

        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(2); // should be 3

        newInstance.n = 4;

        await newInstance.save();

        expect(newInstance.n).toBe(4);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(4);
    });
});

describe("patchedSave: sequelize should not mark fields as unchanged without saving them", () => {
    test('NO BUG: Properly waiting works', async () => {
        const newInstance = new SequelizeTest();

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        await patchedSave(newInstance);

        newInstance.n = 1;

        // UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        await patchedSave(newInstance);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be 1 :)
    });

    test('BUG: Start saving again before first save completes', async () => {
        const newInstance = new SequelizeTest();
        //newInstance.id = "some id";

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const insertIntoPromise = patchedSave(newInstance);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() INSERT INTO has started, but before it has completed
        newInstance.n = 1;

        await patchedSave(newInstance);

        // Wait for the previous INSERT INTO
        await insertIntoPromise;

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1);
    });

    test('BUG: Start saving again before first save completes, but then change the value again', async () => {
        const newInstance = new SequelizeTest();
        //newInstance.id = "some id";

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const insertIntoPromise = patchedSave(newInstance);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() INSERT INTO has started, but before it has completed
        newInstance.n = 1;

        const firstSavePromise = patchedSave(newInstance);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        newInstance.n = 2;

        await patchedSave(newInstance);

        await firstSavePromise;

        // Wait for the previous INSERT INTO
        await insertIntoPromise;

        expect(newInstance.n).toBe(2);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(2);
    });

    test('BUG: Minimal Example unawaited INSERT INTO + UPDATE', async () => {
        const newInstance = new SequelizeTest();
        //newInstance.id = "some id";

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const insertIntoPromise = patchedSave(newInstance);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() INSERT INTO has started, but before it has completed
        newInstance.n = 1;

        // Wait for the previous INSERT INTO
        await insertIntoPromise;

        // Should be: UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        // ...but actually it won't even get called because newInstance.changed("n") === false
        await patchedSave(newInstance);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Expected: 1, Received: null
    });

    test('BUG: Minimal Example awaited INSERT INTO + unawaited UPDATE + UPDATE', async () => {
        const newInstance = new SequelizeTest();

        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        await patchedSave(newInstance);

        newInstance.n = 9999;

        // UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        const updatePromise = patchedSave(newInstance);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // Set n after the previous save() UPDATE has started, but before it has completed
        newInstance.n = 1;

        // Wait for the previous UPDATE
        await updatePromise;

        // Should be: UPDATE `sequelize_test` SET `n`=?,`updatedAt`=? WHERE `id` = ?
        // ...but actually it won't even get called because newInstance.changed("n") === false
        await patchedSave(newInstance);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Expected: 1, Received: 9999
    });

    test('Bug Variant A: Have no initial value for n during INSERT INTO', async () => {
        const newInstance = new SequelizeTest();
        newInstance.id = 3;

        expect(newInstance.changed()).toStrictEqual(["id"]);

        // Unlike the previous test, we start INSERT INTO but don't await
        // INSERT INTO `sequelize_test` (`id`,`createdAt`,`updatedAt`) VALUES (?,?,?);
        const savePromise = patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(["id"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        // changed("n") is still false
        expect(newInstance.changed()).toStrictEqual(["id"]);

        // We set n
        //console.log("Before setting n", newInstance);
        newInstance.n = 1;
        //console.log("After setting n", newInstance);

        // changed("n") is now true
        expect(newInstance.changed()).toStrictEqual(["id", "n"]);

        // Now we wait for the INSERT INTO to finish
        await savePromise;

        //console.log("After await savePromise", newInstance);

        // The INSERT INTO did not set n, but it also set changed("n") to false
        //expect(newInstance.changed()).toStrictEqual(["n"]); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database
        expect(newInstance.changed()).toStrictEqual(false); // Our updated patchedSave repeats until no more problematic changed values are detected

        // Now we try to save our new value for n, but it doesn't do anything - it thinks there are no changes
        await patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be null
    });

    test('Bug Variant B: Have an initial value for n during INSERT INTO', async () => {
        const newInstance = new SequelizeTest();

        // This time we set n to 9999 in the INSERT INTO. No change to the bug.
        newInstance.n = 9999;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise = patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(["n"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise;

        //expect(newInstance.changed()).toStrictEqual(["n"]); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database
        expect(newInstance.changed()).toStrictEqual(false); // Our updated patchedSave repeats until no more problematic changed values are detected

        await patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be 9999
    });

    test('NO BUG Variant C1: Properly await the first INSERT INTO (without n), then try to trigger the bug later by not awaiting an UPDATE with an unrelated value', async () => {
        const newInstance = new SequelizeTest();

        expect(newInstance.changed()).toStrictEqual(false);

        // This time we properly await the INSERT INTO...
        await patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(false);

        // ...but then set some value that is not n...
        newInstance.someOtherValue = 321;

        expect(newInstance.changed()).toStrictEqual(["someOtherValue"]);

        // ...and not properly await the save.
        const savePromise = patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(["someOtherValue"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["someOtherValue"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["someOtherValue", "n"]);

        await savePromise;

        // This works out well though. n is not written by the previous UPDATE and changed("n") stays true.
        expect(newInstance.changed()).toStrictEqual(["n"]);

        await patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be 1 :)
    });

    test('Bug Variant C2: Properly await the first INSERT INTO (without n), then try to trigger the bug later by not awaiting an UPDATE with n', async () => {
        const newInstance = new SequelizeTest();
        await patchedSave(newInstance);

        // This time we do exactly the same as above, but instead of someOtherValue, we set n.
        newInstance.n = 321;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise = patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(["n"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise;

        //expect(newInstance.changed()).toStrictEqual(["n"]); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database
        expect(newInstance.changed()).toStrictEqual(false); // Our updated patchedSave repeats until no more problematic changed values are detected

        await patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(false);

        expect(newInstance.n).toBe(1);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(1); // Will be 321
    });

    test('Bug Variant C3: A C2 test with more steps', async () => {
        const newInstance = new SequelizeTest();
        await patchedSave(newInstance);

        // This time we do exactly the same as above, but instead of someOtherValue, we set n.
        newInstance.n = 321;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise = patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(["n"]);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        expect(newInstance.changed()).toStrictEqual(["n"]);

        newInstance.n = 1;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise;

        //expect(newInstance.changed()).toStrictEqual(["n"]); // this would be false, although it *really* should be ["n"] since n = 1 is not saved in the database
        expect(newInstance.changed()).toStrictEqual(false); // Our updated patchedSave repeats until no more problematic changed values are detected

        await patchedSave(newInstance);

        expect(newInstance.changed()).toStrictEqual(false);

        newInstance.n = 2;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        const savePromise2 = patchedSave(newInstance);

        // We wait a frame to give the save() time to actually start
        await waitUntilNextFrame();

        newInstance.n = 3;

        expect(newInstance.changed()).toStrictEqual(["n"]);

        await savePromise2;

        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(3); // Our updated patchedSave repeats until no more problematic changed values are detected

        //expect(newInstance.changed()).toStrictEqual(["n"]);
        expect(newInstance.changed()).toStrictEqual(false); // Our updated patchedSave repeats until no more problematic changed values are detected

        await patchedSave(newInstance);

        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(3);

        newInstance.n = 4;

        await patchedSave(newInstance);

        expect(newInstance.n).toBe(4);
        expect((await SequelizeTest.findByPk(newInstance.id)).n).toBe(4);
    });
});
