FROM node:22-slim

WORKDIR /app/server

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/server/data /app/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
