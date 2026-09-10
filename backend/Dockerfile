FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json eslint.config.mjs ./
COPY src ./src
COPY migrations ./migrations

EXPOSE 3000

CMD ["npm", "run", "dev"]
