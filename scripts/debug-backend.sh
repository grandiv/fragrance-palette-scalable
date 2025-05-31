#!/bin/bash

echo "🔍 Debugging Backend Issues..."

echo "=== Backend-1 Logs ==="
docker-compose logs --tail=20 backend-1

echo -e "\n=== Backend-1 Container Status ==="
docker inspect backend-1 --format='{{.State.Status}}: {{.State.Error}}'

echo -e "\n=== Backend Environment Check ==="
docker-compose exec backend-1 env | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET|NODE_ENV)" || echo "Container not running"

echo -e "\n=== Database Connection Test ==="
docker-compose exec backend-1 node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => {
  console.log('✅ Database connected');
  process.exit(0);
}).catch(err => {
  console.log('❌ Database error:', err.message);
  process.exit(1);
});
" || echo "Cannot test - container not running"

echo -e "\n=== Port Check ==="
netstat -tlnp | grep :3001 || echo "Port 3001 not in use"