# build stage
FROM node:lts-alpine as build-stage

ENV http_proxy "http://100.98.146.3:8080"
ENV https_proxy "http://100.98.146.3:8080"
ENV ftp_proxy "http://100.98.146.3:8080"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
