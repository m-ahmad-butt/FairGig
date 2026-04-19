FROM public.ecr.aws/docker/library/node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ARG VITE_AGENT_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_GEOCODING_API_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AGENT_URL=$VITE_AGENT_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_GEOCODING_API_URL=$VITE_GEOCODING_API_URL

RUN npm run build

FROM public.ecr.aws/docker/library/nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]