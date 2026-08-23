# MongoDB → SQLite Migration

1. [x] Update `go.mod`: remove mongo driver, add `modernc.org/sqlite`
2. [x] Add `internal/app/store.go`: open SQLite, init schema
3. [x] Update `internal/app/models.go`: int64 IDs, keep string public IDs
4. [x] Update `internal/app/server.go`: DB bootstrap to SQLite
5. [x] Update `internal/app/auth.go`: rewrite with SQL
6. [x] Update `internal/app/messages.go`: rewrite with SQL
7. [x] Update `internal/app/staff.go`: rewrite with SQL
8. [x] Update `internal/app/threads.go`: rewrite with SQL
9. [x] Update `internal/app/server_test.go`: temp SQLite
10. [x] Update `backend-go/README.md` and `.gitignore`
11. [x] Run `go mod tidy` and `go build ./...`
12. [x] Run `go test ./...`
