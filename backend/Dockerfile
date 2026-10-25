FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generuj klienta Prisma i skompiluj Nest (nie używamy start:dev / --watch na serwerze)
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Migracje przy starcie + lekki proces produkcyjny
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
