FROM node:22-slim

# Prisma cần openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài thư viện trước để Docker tận dụng cache khi chỉ sửa code
COPY package*.json ./
RUN npm ci

# Sinh Prisma Client trong image
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

# Áp dụng migration rồi mới chạy server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]