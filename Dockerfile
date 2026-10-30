FROM mcr.microsoft.com/playwright:v1.64.0-jammy

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /app

RUN npm uninstall -g yarn && corepack enable

COPY package*.json yarn.lock .yarnrc.yml ./

RUN corepack install && yarn install --immutable

COPY . .

CMD ["yarn", "test"]