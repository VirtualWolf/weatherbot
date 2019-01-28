FROM node:10.15.0-alpine

RUN mkdir -p /opt/service && chown -R node: /opt/service
USER node
WORKDIR /opt/service
COPY package.json .
RUN yarn install --production && yarn cache clean
COPY . .

CMD npm start