#! /bin/bash

export TOR_ADDRESS=127.0.0.1
export TOR_PORT=9050
export GET_LINKS_CONCURRENCY=5 # Determines maximum number of concurrent goroutines that can be run with get links operation.

cd ../server/
go run main.go

