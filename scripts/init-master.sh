#!/bin/bash
set -e

echo "🔧 Initializing PostgreSQL Master for replication..."

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
            CREATE USER replicator WITH REPLICATION LOGIN PASSWORD 'replicator123';
            RAISE NOTICE '✅ User replicator created.';
        ELSE
            RAISE NOTICE 'ℹ️  User replicator already exists.';
            ALTER USER replicator WITH PASSWORD 'replicator123';
        END IF;
    END
    \$\$;
EOSQL

# Create replication slots for replicas
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_replication_slots WHERE slot_name = 'replica_slot_1') THEN
            PERFORM pg_create_physical_replication_slot('replica_slot_1');
            RAISE NOTICE '✅ Replication slot replica_slot_1 created.';
        ELSE
            RAISE NOTICE 'ℹ️  Replication slot replica_slot_1 already exists.';
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_replication_slots WHERE slot_name = 'replica_slot_2') THEN
            PERFORM pg_create_physical_replication_slot('replica_slot_2');
            RAISE NOTICE '✅ Replication slot replica_slot_2 created.';
        ELSE
            RAISE NOTICE 'ℹ️  Replication slot replica_slot_2 already exists.';
        END IF;
    END
    \$\$;
EOSQL

echo "✅ Master database initialization completed"