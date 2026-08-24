FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/server .

# Directory for SQLite database file
RUN mkdir -p /app/data

ENV PORT=5000
ENV DB_PATH=/app/data/safeguarding.db
ENV JWT_SECRET=safeguarding_secret_key_2026

EXPOSE 5000

VOLUME ["/app/data"]

CMD ["./server"]
