FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]
