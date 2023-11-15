FROM node:14-alpine3.11

ARG CAPROVER_GIT_COMMIT_SHA
ENV CAPROVER_GIT_COMMIT_SHA=${CAPROVER_GIT_COMMIT_SHA}

ARG DEBUG_SERVER_COLOR
ENV DEBUG_SERVER_COLOR=${DEBUG_SERVER_COLOR}

ARG SENTRY_DSN
ENV SENTRY_DSN=${SENTRY_DSN}

ARG SENTRY_ENV
ENV SENTRY_ENV=${SENTRY_ENV}

ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}

ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

ARG SERVICE_API_KEY
ENV SERVICE_API_KEY=${SERVICE_API_KEY}

ARG SERVER_BASE_URL
ENV SERVER_BASE_URL=${SERVER_BASE_URL}

ARG SKIP_CULLING_UNTIL_FIRST_RENDER
ENV SKIP_CULLING_UNTIL_FIRST_RENDER=${SKIP_CULLING_UNTIL_FIRST_RENDER}

ARG NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL
ENV NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL=${NETWORK_DIAGNOSTICS_EXTERNAL_PING_URL}

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY ./package.json /usr/src/app/
COPY ./package-lock.json /usr/src/app/

RUN apk add --no-cache --virtual .build-deps python make g++
RUN npm install && npm cache clean --force
RUN apk del .build-deps

COPY ./ /usr/src/app

RUN apk --no-cache add curl
RUN curl --location --request GET "${SERVER_BASE_URL}/api/service/shutdown" --header 'Content-Type: application/x-www-form-urlencoded' --data-urlencode "serviceApiKey=${SERVICE_API_KEY}" || echo "Couldn't send shutdown command to currently running server."

RUN npm run build

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80

CMD npm start