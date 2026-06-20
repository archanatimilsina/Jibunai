FROM node:22.12.0-alpine

WORKDIR /backend

COPY package*.json /backend/

RUN npm install
RUN npm install express

COPY . .

CMD ["npm","run","dev"]
