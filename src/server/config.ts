import dotenv from 'dotenv';
import findUp from 'find-up';
import path from 'path';
import fs from 'fs';

const IS_DEV = process.env.NODE_ENV !== 'production';

if (IS_DEV) {
    dotenv.config({ path: findUp.sync('.env') });
}

const packageJsonPath = path.join(process.cwd(), 'package.json');
const rawPackageJson = fs.readFileSync(packageJsonPath).toString();
const PackageJson = JSON.parse(rawPackageJson);
const { version: VERSION } = PackageJson;

// server
const SERVER_PORT = process.env.PORT || 3000;
const WEBPACK_PORT = 8085; // For dev environment only

const SSL_GENERATE_ROOT_CERT = process.env.SSL_GENERATE_ROOT_CERT;
const SSL_GENERATE_ROOT_KEY = process.env.SSL_GENERATE_ROOT_KEY;
const SSL_KEY = process.env.SSL_KEY;
const SSL_CERT = process.env.SSL_CERT;
const MAKE_HTTPS_SERVER = Boolean((SSL_GENERATE_ROOT_CERT && SSL_GENERATE_ROOT_KEY) || (SSL_KEY && SSL_CERT));

export { IS_DEV, VERSION, SERVER_PORT, WEBPACK_PORT, SSL_GENERATE_ROOT_CERT, SSL_GENERATE_ROOT_KEY, SSL_KEY, SSL_CERT, MAKE_HTTPS_SERVER };

export const SOUND_FOLDER = "assets/game/sounds";
export const SOUND_TYPES = ["mp3", "m4a"];