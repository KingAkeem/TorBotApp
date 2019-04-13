#! /bin/bash

export TORBOT_ADDRESS=127.0.0.1
export TORBOT_PORT=9050

cd ../server/
go run main.go

