FROM docker.io/library/node:20.9.0 as base
WORKDIR /app

FROM base as dev
CMD exec /bin/bash -c "npm install && npm run dev"

FROM base as build
COPY package.json .
COPY package-lock.json .
RUN npm ci --ignore-scripts
COPY public public
COPY src src
COPY .env.production .
COPY .gitignore .
COPY env.d.ts .
COPY index.html .
COPY postcss.config.js .
COPY tailwind.config.js .
COPY tsconfig.app.json .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY vite.config.ts .
RUN npm run build

FROM scratch as dist
COPY --from=build /app/dist /
