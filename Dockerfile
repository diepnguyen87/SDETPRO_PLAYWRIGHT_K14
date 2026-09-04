FROM mcr.microsoft.com/playwright:v1.62.0-jammy

WORKDIR /app

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

CMD ["yarn", "test"]