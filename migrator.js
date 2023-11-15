require('./dist/server/config');
const { umzug } = require('./dist/server/database/db');

exports.umzug = umzug;

if (require.main === module) {
    umzug.runAsCLI();
}