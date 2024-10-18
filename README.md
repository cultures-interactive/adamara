# Adamara: Harsh Waters

## Deutsche Version / German Version

Eine deutsche Version dieses Dokuments findet sich hier: [LIESMICH.pdf](https://cultures-interactive.github.io/adamara/LIESMICH.pdf).

Weitere Dokumente in Deutsch:
- [Workshop-Ablauf und Editor-Benutzung (PDF)](https://www.cultures-interactive.de/files/projekte/Call%20of%20Prev/Adamara_GUIDE_Workshop-Editor-Nutzung.pdf)
- [Mehr Informationen zum Projekt](https://www.cultures-interactive.de/de/Call-of-Prev-Projekt.html)

## Table of Contents

- [Introduction](#introduction)
- [Documentation](#documentation)
- [Database dump & game assets](#database-dump--game-assets)
- [System requirements](#system-requirements)
- [Development Setup](#development-setup)
- [Deploy on a server (using CapRover)](#deploy-on-a-server-using-caprover)
- [Run the server from a laptop in the local network](#run-the-server-from-a-laptop-in-the-local-network)
- [NPM commands](#npm-commands)
- [Environment variables](#environment-variables)
- [Who made this?](#who-made-this)

## Introduction

Adamara: Harsh Waters is a real-time collaborative game editor and an isometric RPG/adventure game. In combination, they are used in workshops for political education with young people:

1. The participants play the game.
2. Afterwards, they discuss their experiences in the game with the workshop group.
3. The next few days of the workshop, they organize into small teams and use the editor to create new experiences in the game (either as an add-on to the game, or to be played as standalone), which can then be played by other people.

You can find out more about the project here: https://www.cultures-interactive.de/en/the-project.html. (Note: "Call of Prev" was the working title and might still be mentioned on the project website.)

This project is open source. Code is shared under the [MIT License](https://www.tldrlegal.com/license/mit-license), and all assets and game content under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0). 

## Documentation

This README file provides an overview for developers on how to set up the app for development or deployment.

Additional documentation in English:
- [A quick overview of the different parts of the editor](documentation/using-the-editor.md)
- [Understanding the code](documentation/code-overview.md)
  - Folder structure
  - Technologies used
  - Real-time collaboration
  - Undo/redo
  - User roles
  - Optimizations on the client
  - Optimizations on the server
  - Isometric depth ordering
- [More information about the project](https://www.cultures-interactive.de/en/the-project.html)

Additional documentation in German:
- [Workshop-Ablauf und Editor-Benutzung (PDF)](https://www.cultures-interactive.de/files/projekte/Call%20of%20Prev/Adamara_GUIDE_Workshop-Editor-Nutzung.pdf)
- [Mehr Informationen zum Projekt](https://www.cultures-interactive.de/de/Call-of-Prev-Projekt.html)

## Database dump & game assets

A dump of the database (containing the full game and most game assets) is available here:
- https://drive.google.com/file/d/1Ugfe04A2NthHCSJajXdDPXv1MPDJBqZd/view (License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0))

The game assets (art, animations, sound etc.) are separately available here:
- https://drive.google.com/drive/folders/1a-X0hVuhpUyYIpwt0f7bFZegkuWGLIWU (License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0))

## Game Teaser

You can watch the German game teaser here:

[![Game teaser preview image](./documentation/images/teaser-video-thumbnail.jpg)](https://www.youtube.com/watch?v=EdVFUJPmzWE)

## System requirements

Server/development:
- RAM: 16 GB recommended (the server will use 4 - 6 GB RAM or more, depending on the amount of assets)
- Disk space: 20 GB free disk space (4 GB for the code and static assets, 1 GB for the database; more for Docker, CapRover and similar tools, caching, and the deployment process)

Clients (opening the editor/game web app):
- Browser: Google Chrome (other browsers may work, but are untested)
- RAM: 8 GB (the game/editor will use 2 - 3 GB)
- Tested most on our target device: Microsoft Surface Pro 6 (2018)
- At the time this readme is written, iOS [has a bug](https://github.com/socketio/socket.io/issues/4263) which might prevent the editor from connecting to the server.

## Development Setup

1. Install the node version mentioned in package.json (currently 14.17.1), for example via a version manager like [NVM Windows](https://github.com/coreybutler/nvm-windows) / [NVM (for Linux/macOS)](https://github.com/nvm-sh/nvm) (recommended), or directly from https://nodejs.org/dist/v14.17.1.
2. Pull this project.
3. Navigate to the project folder in your favourite terminal (e.g. in your IDE) and run `npm install`.
4. Install a MariaDB or MySQL database, for example via from [mariadb.org](https://mariadb.org/download) or by using the instructions described under [Setup Local Database via Docker (optional)](#setup-local-database-via-docker-optional).
5. With an SQL management tool (like HeidiSQL or phpmyadmin), create a new database `adamara` with a user `adamara`.
6. (Optional) Download a [database dump](#database-dump--game-assets) and load it into your local database to have a good starting point.
   - The recommended way to do this is via command line: `mysql -u root -p adamara < dump.sql`
   - If you are using any other way, make sure to check if any special characters (e.g. in the field `name` in the table `tile_asset`) were imported properly. (I have not found a way to properly set the encoding during import in HeidiSQL, which is why my preferred way is via command line.)
7. Copy `.env.template` to `.env`.
8. Adjust the placeholder of `DB_URL` in `.env` to match of your local database.
9. Run `npm run dev`.
10. Open http://localhost:3000.

### Setup Local Database via Docker (optional)
1. Install [Docker](https://www.docker.com/)
2. Save a [database dump](#database-dump--game-assets) from the server to:   
 `./dumps/<some name>.sql`  
  *(Note: all sql files in this dir will be imported)*
3. Create environment variables for your OS:
  `ADAMARA_DB_ROOT_PASSWORD`  
  `ADAMARA_DB_USER`  
  `ADAMARA_DB_USER_PASSWORD`  
  `ADAMARA_DB_NAME`
4. Run:  
 `docker-compose up` to start the database   
 `docker-compose stop` to stop the database
5. Make sure that `DB_URL` in `.env` matches the user/password/name that you set in step 3.

### Recommended Editor and Extensions

It is recommended (but not necessary) to work with [Visual Studio Code](https://code.visualstudio.com), a feature-rich but light-weight editor that is available for all major systems for free. The main advantage is that code formatting can be set up to conform with the project with minimal effort. Additionally, the extensions below make your work easier.

VSCode Extensions (can be installed by name via the "Extensions" window directly in VSCode):
- Must have:
  - `ESLint` for proper linting integration.
  - `i18n Ally` for fantastic support for our translation files.
  - `vscode-styled-components` (author: "Styled Components") for syntax highlighting for styled-components CSS-in-JavaScript.
- Situational (once you work with associated files):
  - `Jest Test Explorer` to get a built-in unit test UI.
  - `WebGL GLSL Editor` if you are modifying shaders in the project.
- Additional nice optional stuff:
  - `Color Picker` for in-editor color picking.
  - `NPM Audit` to get a visual report of the `npm audit` report (including recommended actions)

## Deploy on a server (using CapRover)

1. [Install and set up CapRover](https://caprover.com/docs/get-started.html) (until including step 3) on a server with at least 16 GB RAM.
   - The easiest (but definitely not the cheapest) way to do this is probably the DigitalOcean One-Click App mentioned in the document. Other alternatives are for example Hetzner using [this tutorial](https://community.hetzner.com/tutorials/install-caprover).
   - While 16 GB RAM is recommended for running the Adamara server, 8 GB RAM might work too. If you want to try that and it doesn't work, [create a swap file](https://linuxize.com/post/create-a-linux-swap-file/). If that doesn't help, you might want to upgrade to 16 GB and try again.
2. Open the CapRover frontend (https://captain.your-url.com).
3. Create MariaDB instance:
   1. "Apps" -> "Create new App" -> "One-Click Apps/Databases": "MariaDB"
      - App Name: `adamara-mariadb`
      - Password: fill in something
      - Can be left as default:
        - MariaDB Version: 10.4
        - Default server character set: utf8mb4
        - Default server collation: utf8mb4_unicode_ci
   2. Switch to your database under "Apps" -> "adamara-mariadb-db" and open the tab "Deployment".
   3. Scroll down to "Method 4: Deploy plain Dockerfile" and paste the following:
      ```
      FROM mariadb:10.4
      CMD ["--max-allowed-packet=100M", "--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci", "--skip-character-set-client-handshake"]
      ```
   4. Click "Deploy now".
4. Create the database:
   1. "Apps" -> "Create new App" -> "One-Click Apps/Databases": "phpmyadmin"
   2. Log into phpmyadmin (the database server that you just created is available under `srv-captain--adamara-mariadb-db`) and create a new database "adamara" with a user "adamara" that has all rights for the "adamara" database except GRANT.
   3. Optionally, if you want to use our database:
      1. Log into the server with an SSH client, e.g. PuTTY
      2. Download the [database dump](#database-dump--game-assets) and place it into `/var/lib/docker/volumes/captain--adamara-mariadb-db-data/_data` as `dump.sql`.
      3. `docker ps`
      4. Check what the current database app name is, e.g. `srv-captain--adamara-mariadb-db.1.ystl2yu4ygiiq1qsn8bjs6fgr`
      5. `docker exec -it srv-captain--adamara-mariadb-db.1.ystl2yu4ygiiq1qsn8bjs6fgr /bin/bash`
      6. `mysql -u root -p adamara < /var/lib/mysql/dump.sql`
4. Create the adamara server:
   1. "Apps" -> "Create new App"
      - Name: `adamara`
      - Has Persistent Data: Yes
   2. Click "Create New App".
   3. Switch to your app under "Apps" -> "adamara".
   4. Under "HTTP Settings":
      - Click "Enable HTTPS"
      - Activate "Websocket Support"
      - Click "Save & Update"
   5. Under "App Configs":
      - Environmental Variables: Bulk Edit, paste the content from [.env.deploy.template](.env.deploy.template) and fill in the values.
        - DB_URL: `mysql://adamara:YOUR_ADAMARA_DATABASE_USER_PASSWORD_FROM_STEP_4_2_HERE@srv-captain--adamara-mariadb-db:3306/adamara`
        - SESSION_SECRET: A random UUID
        - SERVICE_API_KEY: Another random UUID
        - ACCESS_CODE: The admin password you want to use to login in to the Adamara app
        - SERVER_BASE_URL: `https://adamara.YOUR-URL-GOES-HERE.com`
      - Persistent Directories:
        - Path in app: `/logs`, Label: `adamara-logs`
        - Path in app: `/temp`, Label: `adamara-temp`
      - Click "Save & Update"
   5. Under "Deployment":
      - Configure "Method 3: Deploy from Github/Bitbucket/Gitlab" to point to this (or your) repository and via "Save & Update" followed by "Force Build". (If CapRover complains about "1000 : Missing required Github/BitBucket/Gitlab field" because you are leaving the username/password empty for our public project, just enter something random into the `Username` and `Password` fields.)
      - Check "View Build Logs" to see if the build finishes correctly.
      - Check "View App Logs" to see if the app starts correctly. The start up is complete once you see:
        ```
        [info] App listening on port 80!
        ```
        

If everything went right, you should now have a running server available under https://app.YOUR-URL-GOES-HERE.COM.

There are a few tools that are also recommended, but not necessary:

- **NetData**: Built-in monitoring available under "Monitoring" in the CapRover main menu.
- **mysql-backup**: Automatic backups
  1. Create an app with persistent data.
  2. deploy via image name: `databack/mysql-backup:latest`
  3. Make a persistent directory `/backup` with label `adamara-mysql-backup`
  4. Set env variables:
     - DB_SERVER: `srv-captain--adamara-mariadb-db`
     - DB_USER: `root`
     - DB_PASS: Your database root password
     - DB_DUMP_TARGET: `/backup`
  5. Click "Save & Update"
- CapRover-Apps you can add:
  - **Dozzle**: Show log output for all docker containers.
  - **Portainer**: Manage docker containers.
  - **phpmyadmin**: Inspect your database content.
- **[Sentry.io](https://sentry.io)**: Error monitoring (configure via environment variables in the app)

## Run the server from a laptop in the local network

### About running a local server

To work with Adamara, a stable and fast internet connection is necessary. Unfortunately this might not be the case in your environment. Running the server from a laptop in a local network you control allows you to conduct a workshop even in situations where the internet is potentially slow or where it's unclear whether the wireless connection is strong enough.

Unfortunately, data cannot be merged between web servers / local servers.

Necessary equipment:
- A laptop with at least 16 GB RAM is recommended. (Starting a server will take 4 - 6 GB RAM or more, depending on the amount of assets.)
- A router.

### Initial router setup

1. Connect the server laptop to a router.
2. (Optional) Make sure that the laptop will always be assigned the same IPv4 by the router so you can set bookmarks on the clients.

### Server installation

1. Install the node version mentioned in [package.json](package.json) (under `engines` -> `node`; currently 14.17.1), for example via a version manager like [NVM Windows](https://github.com/coreybutler/nvm-windows) / [NVM (for Linux/macOS)](https://github.com/nvm-sh/nvm) (recommended), or directly from https://nodejs.org/dist/v14.17.1.
2. Pull/download this project.
3. Navigate to the project folder in your favourite terminal and run `npm install`.
4. Install a MariaDB or MySQL database, for example via from [mariadb.org](https://mariadb.org/download) or by using the instructions described under [Setup Local Database via Docker (optional)](#setup-local-database-via-docker-optional).
5. With an SQL management tool (like HeidiSQL or phpmyadmin), create a new database `adamara` with a user `adamara`.
6. Download our [database dump](#database-dump--game-assets), or your own from your main server, and load it into the database.
    - The recommended way to do this is via command line: `mysql -u root -p adamara < dump.sql`
    - If you are using any other way, make sure to check if any special characters (e.g. in the field `name` in the table `tile_asset`) were imported properly. (I have not found a way to properly set the encoding during import in HeidiSQL, which is why my preferred way is via command line.)
7. Copy `.env.local-server.template` to `.env`.
8. `.env`:
   - `DB_URL`: Replace the placeholder with your database access data.
   - `SESSION_SECRET`: Fill with a random string (at least 30 characters, e.g. a UUID)
   - `SERVICE_API_KEY`: Fill with a random string (at least 30 characters, e.g. a UUID)
   - `ACCESS_CODE`: Fill with the password that users should enter to open the page. Please **don't** use the same password as the main server.
9. SSL Root Certificate Generation
   - On Windows
      1. Run `tools\root-ca-generation-windows\generate-and-install-root-CA.bat`. Leave the window open for the next step.
      2. Copy `SSL_GENERATE_ROOT_CERT` and `SSL_GENERATE_ROOT_KEY` into `.env` (overwriting line #8 and #9).
   - On other systems
      1. Install [mkcert](https://github.com/FiloSottile/mkcert#installation).
      2. Find your root certificate path via `mkcert -CAROOT`.
      3. In the `.env` file:
         - Point `SSL_GENERATE_ROOT_CERT` to your `rootCA.pem` in the root certificate path.
         - Point `SSL_GENERATE_ROOT_KEY` to your `rootCA-key.pem` in the root certificate path.
      4. Create a folder `Root CA Installation Package`.
      5. Copy `mkcert.exe` into that folder.
      6. Copy `install-root-CA.bat_` into that folder an rename it to `install-root-CA.bat`.
      7. Copy `rootCA.pem` into that folder.
10. Copy the `tools\root-ca-generation-windows\Root CA Installation Package` folder to an USB stick.

### Start the server

1. Start the server by running `npm-run-dev.bat`.

### On the Windows (desktop/tablet) client

1. Connect the client to the router.
2. Install Google Chrome.
3. Attach the Root CA Installation Package USB stick.
4. Open USB stick and run `install-root-CA.bat`.
5. Detach USB stick.
6. Start Google Chrome.
7. Open the URL: `https://[server-ip-configured-in-the-router]:3000` (e.g. `https://192.168.178.55:3000`).

If you don't remember the IP you configured, look into the server console for the line `If you want to access this server from your local network, one of the following URLs should work in Google Chrome:`.

When using a local server, remember to also use this URL when printing workshop PDFs.

### On non-windows clients

You can follow the instructions above, but steps 3.-5. are replaced by the steps described [here](https://github.com/FiloSottile/mkcert#mobile-devices).

## NPM commands

- `npm run dev` - Client and server are in watch mode with source maps. Open http://localhost:3000 once it runs to see the app.
- `npm run test` - Runs jest tests
- `npm run lint` - Runs es-lint
- `npm run lint:fix` - Runs es-lint --fix
- `npm run build` - `dist` folder will include all the needed files, both client (Bundle) and server.
- `npm start` - Just runs `node ./dist/server/server.js`
- `npm start:prod` - sets `NODE_ENV` to `production` and then runs `node ./dist/server/server.js`. (Bypassing webpack proxy)
- `npm run migrate-up` - Run all database migrations that haven't executed yet. (Will also run automatically when the server is started via e.g. `npm run dev` or `npm start`.)
- `npm run migrate-down` - Call the "down" method on the latest executed migration, reversing it. Can be called multiple times to reverse multiple migrations.

## Environment variables

- `SERVER_BASE_URL`: Used in the docker build to shut down the currently running app on the server before building (`SERVER_BASE_URL/api/service/shutdown` is called via curl). Example value: `https://adamara-server.com`
- `SESSION_SECRET`: The session secret. ["Should be not easily parsed by a human and would best be a random set of characters"](http://expressjs.com/en/resources/middleware/session.html#secret). Example (that should not be used on a server because it is now public): `87e13481-9b3f-4e16-be2f-186858feabf2`
- `BASE_PATH`: The URL path from the server root for the React build. Example value: `/`
- `DB_URL`: The database URL string. Example value/format: `mysql://database_username:user_password@localhost:3306/database_name`
- `SERVICE_API_KEY`: A secure string to be used as an API key for the /api/service routes. A UUID is fine here. Example (that should not be used on a server because it is now public): `7125a0bc-80e6-4811-bba2-e07477bd99fb`
- `ACCESS_CODE`: The password used to access the editor (until we have proper user accounts). Example: `somepassword`
- `DEBUG_SERVER_COLOR`: Optional. A CSS color for the main menu background to make clear that you are on a special server, e.g. the feature test server, to keep you from accidentally doing important work there. Example values: `red`, `#8B0000`
- `THUMBNAIL_FOLDER`: The folder for the thumbnail generation. Example value: `temp/thumbnails`
- `NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL`: Optional. Used in the network diagnostics popup. An external URL to send a GET request to to see if we have an internet connection, even if our app server is down for some reason. Must include the protocol (e.g. `https://`). The pinged resource must have CORS headers that accept our request and return a positive status code. Default value: `https://dragonlab.de/projects/adamara/available.php`
- `SESSION_COOKIE_MAX_AGE`: Optional. Sets the time in milliseconds until the the session cookie expires. Default value: `31536000000` (a year)
- `DEACTIVATE_HELMET`: Optional. Set to `1` to deactivate Helmet security, which might be necessary if you want to access the dev server (`npm run dev`) from other devices in the local network. Only works if NODE_ENV is not set to `production`. Example value: `1`
- `DEFAULT_PLAYER_NAME`: Optional, and best kept empty (which is the default). Useful for development where you restart the game a lot without wanting to enter a name every time. Example value: `Player`
- `CLIENT_FORCE_PRODUCTION_MODE`: Optional; defaults to empty. Set to `1` if you want to remove local development debugging helpers in the client code without setting NODE_ENV to production, e.g. when you are running a local server in the network. Example value: `1`
- Logging:
  - `LOG_FOLDER`: Optional. The folder to write the logfiles to. If not set, no log files will be written. Example value: `logs`
  - `LOG_LEVEL`: Optional. The default log level. Defaults to `info` if not set. Values: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`
  - `LOG_LEVEL_CONSOLE`: Optional. Override `LOG_LEVEL` for console output.
  - `LOG_LEVEL_FILE_COMBINED`: Optional. Override `LOG_LEVEL` for the `combined.log` log file.
  - `LOG_LEVEL_NEW_RELIC`: Optional. Override `LOG_LEVEL` for logs that are sent to NewRelic.
- Sentry integration. Only needed if exceptions should be sent to Sentry:
  - `SENTRY_ENV`: The Sentry environment name reports from this server should be filed under. Example value: `feature-test-app`
  - `SENTRY_DSN`: The DSN url that this build should report to. Example value: `https://d1054791c29a4a6793ac2b9e293ae8cc@o1133894.ingest.sentry.io/6180776`
  - `SENTRY_AUTH_TOKEN`: The token of an Internal Integration (Team Settings -> Developer Settings -> New Internal Integration) with Read/Write access to the project. Used for uploading the source maps to Sentry. Example value: `143dfagh148944fcb4be46634ca6c9a234037135038c496040f6606848e91fae`
  - `SENTRY_ORG`: Sentry organisation slug. Used for uploading the source maps to Sentry. Example value: `cultures-interactive-ev`
  - `SENTRY_PROJECT`: Sentry project slug. Used for uploading the source maps to Sentry. Example value: `adamara`
- Atlas generation. Only needed if atlas generation should be used (which might never be advisable - we tested this at one point, but it actually lead to worse performance and crashes on bigger maps):
  - `ATLAS_FOLDER`: The folder where generated atlases are saved. If the folder does not have a file named "delete_this_file_to_regenerate_atlases_on_start" in them (which will be automatically created at the end of the atlas generation), new atlases will be generated when the app is started. Atlas generation only works if `THUMBNAIL_FOLDER` is set too. Example value: `temp/atlases`
  - `ATLAS_SIZE`: Optional. How big each side of atlas should be in pixels. Should be a power of 2. Default value: `2048`
  - `MIN_ATLAS_FILE_COUNT_PER_BATCH`: Optional. How many atlas files should *at least* be filled per batch. Lower values leads to a less optimal result by generating more atlases in total, but lead to less memory consumption during the generation process. Figuring out an optimal value here is best done by setting it to multiple values and observe the results in generated atlases, RAM usage and generation time. The default value should be sensible for an ATLAS_SIZE of 2048. Default value: `20`
- Feature Switches (either `0` to turn it off, `1` to turn it on):
  - `SKIP_CULLING_UNTIL_FIRST_RENDER` Default: 1
- Application Metrics Dashboard
  - `APP_METRICS_DASHBOARD`: If `APP_METRICS_DASHBOARD` is set to 1, a simple metrics dashboard will be available at /appmetrics-dash. If NODE_ENV=production, username and password (see below) are needed too. Note that this only works if the optionalDependency appmetrics-dash installs correctly - if not, either install whatever is missing on your system (probably node-gyp dependencies: https://github.com/nodejs/node-gyp#installation), or don't set this to 1. Default: `0`
  - `APP_METRICS_DASHBOARD_USERNAME`: Username for the dashboard. Auth is turned off if username/password aren't set. Example value: `user`
  - `APP_METRICS_DASHBOARD_PASSWORD`: Password for the dashboard. Auth is turned off if username/password aren't set. Example value: `my-auth-password`
- NewRelic APM integration
  - `NEW_RELIC_LICENSE_KEY`: The NewRelic license key for your account. Found at [`User`->`API keys`](https://one.eu.newrelic.com/admin-portal/api-keys/home), type "INGEST - LICENSE", `...`->`Copy Key`. Example value: `eu01xx3c417ca3f57d924d11595e351c3e14NRAL`
  - `NEW_RELIC_APP_NAME`: The name you want the app to appear under. Example value: `Adamara (Staging)`
  - Other `NEW_RELIC_*` parameters: See the [NewRelic Node.js agent configuration documentation](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/#exports_config).
  - `LOG_LEVEL_NEW_RELIC`: Optional. Override `LOG_LEVEL` for logs that are sent to NewRelic.
- SSL:
  - Manually specify SSL certificate. Both need to be set:
    - `SSL_CERT`: Optional. The path to the SSL certificate to needed use a HTTPS server. Example: `cert/localhost+1.pem`
    - `SSL_KEY`: Optional. The path to the SSL certificate key to needed use a HTTPS server. Example: `cert/localhost+1-key.pem`
  - Automatically generate SSL certificate for `localhost` and the current local IP in the network. Only works if `SSL_CERT`/`SSL_KEY` is not set. Both need to be set:
    - `SSL_GENERATE_ROOT_CERT`: Optional. The path to the SSL root certificate to generate an SSL certificate. Example: `C:\Users\someuser\AppData\Local\mkcert\rootCA.pem`
    - `SSL_GENERATE_ROOT_KEY`: Optional. The path to the SSL root certificate key to generate an SSL certificate. Example: `C:\Users\someuser\AppData\Local\mkcert\rootCA-key.pem`

Locally these variables are best set via the `.env` file which isn't checked into Git. `.env.template` is a file prefilled with the default/format values presented above.

## Who made this?

The game Adamara was produced as part of the project Call of Prev, a model project of cultures interactive e.V. The project was funded by the German Federal Ministry of Culture and Media.

- **Christian Kirschner**: Production Management
- **Silvia Weiß**: Co-Production Management
- **Sven Vössler**: Co-Production Management
- **Stefanie Ritter**: Co-Production Management
- **Tobias Wehrum**: Lead Programmer ([Portfolio](https://portfolio.dragonlab.de), [LinkedIn](https://www.linkedin.com/in/tobiaswehrum))
- **Lena Siess**: Programmer ([Twitter](https://twitter.com/GescheitGespiel))
- **Luca Hoffmann**: Programmer
- **Jendrik Johannes**: Programmer ([GitHub](https://github.com/jjohannes))
- **Kevin Blank**: Game Design ([Portfolio](https://www.blankkevin.de)]
- **Elham Nizam**: Game Design ([LinkedIn](https://www.linkedin.com/in/elham-nizam-a9646b17b), [Instagram](https://www.instagram.com/elhammgs), [TikTok](https://www.tiktok.com/@gamercampus), [YouTube](https://youtube.de/c/gamercampus), [Twitch](https://twitch.tv/dergamercampus), [Website](https://gamercampus.de))
- **Jaqueline Martin**: Lead Artist ([Website](https://www.gentleland.net), [LinkedIn](https://www.linkedin.com/in/jaqueline-martin-0b6b8a174))
- **Alexander Günther**: Game Artist / 2D Environment & Prop Assets ([Portfolio](https://www.behance.net/guenther-gamesystems))
- **Gastón Santibáñez Engemann**: Artist & Animator ([Portfolio](https://gastonsantibanez.com), [LinkedIn](https://www.linkedin.com/in/gastón-santibáñez-engemann-94172365)) 
- **Ilgin Özcelik**: Artist & Animator ([Website](https://ilginoe.com), [LinkedIn](https://www.linkedin.com/in/ilgin-oezcelik))
- **Kerstin Rilke**: Animation & Motion Design ([Website](https://kerstinrilke.de), [LinkedIn](https://www.linkedin.com/in/kerstin-rilke-815249230))
- **Fritz David Thiel**: Game Artist, Asset Creation, Asset Entry ([ArtStation](https://www.artstation.com/fdt2), [LinkedIn](https://www.linkedin.com/in/fdt2)) 
- **Lena Falkenhagen**: Narrative Lead ([LinkedIn](https://www.linkedin.com/in/lena-falkenhagen-9b2252103), [Twitter](https://twitter.com/LenaFalkenhagen), [Instagram](https://www.instagram.com/LenaFalkenhagen), [TikTok](https://www.tiktok.com/@user5762525161579)) 
- **Ivonne Vaziri-Elahi**: Narrative Designer / Writer ([Website](http://narrativedesign.de), [LinkedIn](https://www.linkedin.com/in/ivonne-vaziri-elahi-62a95711a))
- **Ingelis Wipfelder**: Narrative Designer / Writer ([Website](https://www.ingeliswipfeldernarrativedesign.com), [LinkedIn](https://www.linkedin.com/in/ingelis-wipfelder-5b0105193))
- **Jannik Jentsch**: Level Design ([LinkedIn](https://www.linkedin.com/in/jannik-jentsch-aab540196))
- **Miriam Oumar**: Content Design ([ArtStation](https://www.artstation.com/mirini/profile), [Portfolio](https://mibenayu.myportfolio.com ))
- **Katharina Baer**: Sound Design ([Website](https://katharina-baer.com))
- **Isi Weija**: Testing ([Twitter](https://twitter.com/IsiWiesel))
- **Marie Jäger**: Scientific Researcher
- **Csongor Baranyai**: UX Designer ([Website](http://csongorb.com), [Twitter](https://twitter.com/csongorb), [Mastodon](https://mastodon.social/@csongor))

(Are you missing from the list? Or do you want something changed? Send a mail to Tobias.Wehrum@dragonlab.de or change it yourself via a pull request here.)