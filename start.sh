#!/usr/bin/env bash

# Tear down existing containers and volumes
docker-compose down -v

# Build and start containers in detached mode
docker-compose up -d --build 