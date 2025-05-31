#!/bin/bash
set -e

echo "🔧 Setting up PostgreSQL Replica..."

# Function to wait for master
wait_for_master() {
    echo "⏳ Waiting for master database to be ready..."
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h postgres-master -p 5432 -U postgres -d fragrances >/dev/null 2>&1; then
            echo "✅ Master database is ready"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - waiting for master..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "❌ Master database not ready after $max_attempts attempts"
    return 1
}

# Check if this is a fresh container (no postgres data)
if [ ! -f "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "📥 Fresh replica container - setting up from master backup..."
    
    # Wait for master to be ready
    wait_for_master
    
    echo "📥 Creating base backup from master..."
    
    # Set password for replicator user
    export PGPASSWORD='replicator123'
    
    # Ensure data directory is empty
    rm -rf /var/lib/postgresql/data/*
    
    # Create base backup from master
    pg_basebackup \
        -h postgres-master \
        -p 5432 \
        -U replicator \
        -D /var/lib/postgresql/data \
        -P \
        -v \
        -R \
        -X stream \
        -W
    
    echo "🔧 Configuring replica settings..."
    
    # Override with our replica configuration
    cp /etc/postgresql/postgresql.conf /var/lib/postgresql/data/postgresql.conf
    
    # Ensure standby.signal exists (should be created by -R flag)
    touch /var/lib/postgresql/data/standby.signal
    
    # Set proper permissions
    chown -R postgres:postgres /var/lib/postgresql/data
    chmod 700 /var/lib/postgresql/data
    
    echo "✅ Replica setup completed successfully"
else
    echo "ℹ️  PostgreSQL data already exists - checking if replica is properly configured..."
    
    # Check if this is a proper replica (has standby.signal)
    if [ ! -f "/var/lib/postgresql/data/standby.signal" ]; then
        echo "⚠️  Missing standby.signal - this is not a proper replica!"
        echo "🔄 Reconfiguring as replica..."
        
        # Wait for master
        wait_for_master
        
        # Backup existing data
        mv /var/lib/postgresql/data /var/lib/postgresql/data.backup.$(date +%s)
        mkdir -p /var/lib/postgresql/data
        
        # Create fresh replica
        export PGPASSWORD='replicator123'
        pg_basebackup \
            -h postgres-master \
            -p 5432 \
            -U replicator \
            -D /var/lib/postgresql/data \
            -P \
            -v \
            -R \
            -X stream \
            -W
        
        # Override with our replica configuration
        cp /etc/postgresql/postgresql.conf /var/lib/postgresql/data/postgresql.conf
        touch /var/lib/postgresql/data/standby.signal
        
        # Set proper permissions
        chown -R postgres:postgres /var/lib/postgresql/data
        chmod 700 /var/lib/postgresql/data
        
        echo "✅ Replica reconfigured successfully"
    else
        echo "ℹ️  Replica is properly configured, updating configuration..."
        
        # Always ensure we have the correct configuration
        cp /etc/postgresql/postgresql.conf /var/lib/postgresql/data/postgresql.conf
        
        # Set proper permissions
        chown -R postgres:postgres /var/lib/postgresql/data
        chmod 700 /var/lib/postgresql/data
        
        echo "✅ Replica configuration updated"
    fi
fi

echo "🚀 Replica initialization complete"