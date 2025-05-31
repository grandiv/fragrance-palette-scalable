#!/bin/bash
set -e

# This script is executed as the postgres user by the entrypoint script

echo "Running setup-master.sh to configure master for replication..."

# Create replication user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_REPLICATION_USER:-replicator}') THEN
            CREATE USER ${POSTGRES_REPLICATION_USER:-replicator} WITH REPLICATION LOGIN PASSWORD '${POSTGRES_REPLICATION_PASSWORD:-replicatorpass}';
            RAISE NOTICE 'User ${POSTGRES_REPLICATION_USER:-replicator} created.';
        ELSE
            RAISE NOTICE 'User ${POSTGRES_REPLICATION_USER:-replicator} already exists. Altering password just in case.';
            ALTER USER ${POSTGRES_REPLICATION_USER:-replicator} WITH PASSWORD '${POSTGRES_REPLICATION_PASSWORD:-replicatorpass}';
        END IF;
    END
    \$\$;
EOSQL

# Create replication slot if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_replication_slots WHERE slot_name = 'replica_slot_1') THEN
            PERFORM pg_create_physical_replication_slot('replica_slot_1');
            RAISE NOTICE 'Replication slot replica_slot_1 created.';
        ELSE
            RAISE NOTICE 'Replication slot replica_slot_1 already exists.';
        END IF;
    END
    \$\$;
EOSQL

echo "Modifying $PGDATA/pg_hba.conf to allow replication..."
# Ensure the line is not duplicated if the script somehow runs more than once on the same $PGDATA
if ! grep -q "host replication ${POSTGRES_REPLICATION_USER:-replicator} 0.0.0.0/0 md5" "$PGDATA/pg_hba.conf"; then
    echo "host replication ${POSTGRES_REPLICATION_USER:-replicator} 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
fi
if ! grep -q "host all ${POSTGRES_USER:-postgres} 0.0.0.0/0 md5" "$PGDATA/pg_hba.conf"; then # For backend access
    echo "host all ${POSTGRES_USER:-postgres} 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
fi


echo "Ensuring replication settings in $PGDATA/postgresql.conf for master..."
# Use a temporary file to avoid issues with direct append/sed if settings exist
CONF_FILE="$PGDATA/postgresql.conf"
TEMP_CONF_FILE="$PGDATA/postgresql.conf.tmp"
cp "$CONF_FILE" "$TEMP_CONF_FILE"

# Ensure settings are present or update them
declare -A settings_to_ensure=(
    ["listen_addresses"]="'*'"
    ["wal_level"]="replica"
    ["max_wal_senders"]="5"
    ["wal_keep_size"]="128MB" # For PG13+, use wal_keep_segments for older versions
    ["hot_standby"]="on"
)

for key in "${!settings_to_ensure[@]}"; do
    value="${settings_to_ensure[$key]}"
    if grep -q "^\s*#*\s*${key}\s*=" "$TEMP_CONF_FILE"; then
        sed -i "s|^\s*#*\s*${key}\s*=.*|${key} = ${value}|" "$TEMP_CONF_FILE"
    else
        echo "${key} = ${value}" >> "$TEMP_CONF_FILE"
    fi
done

mv "$TEMP_CONF_FILE" "$CONF_FILE"

echo "PostgreSQL master configuration updated by setup-master.sh."
# The PostgreSQL server will reload this config upon starting.