#!/bin/bash

# DigiByte Rosetta Server Startup Script
# Sets environment variables from .env and starts the server

# Load environment variables
export RPC_HOST=127.0.0.1
export RPC_PORT=14022
export RPC_USER=johnnytest
export RPC_PASS='Il1ke2drive!'
export RPC_PROTO=http
export DGB_NETWORK=livenet
export HOST=127.0.0.1
export PORT=8080

# Start the server
exec node --max-old-space-size=4096 index.js
