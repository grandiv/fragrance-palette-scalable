#!/bin/bash
set -e

echo "🔧 Starting PostgreSQL Replica Entrypoint..."

# Run replica setup
/usr/local/bin/setup-replica.sh

# Start PostgreSQL with the original entrypoint
exec docker-entrypoint.sh "$@"