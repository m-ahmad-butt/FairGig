FROM node:18-alpine
WORKDIR /app
# OpenSSL for Prisma
RUN apk add --no-cache openssl
COPY package*.json ./
# ignoring devDep
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "src/server.js"]