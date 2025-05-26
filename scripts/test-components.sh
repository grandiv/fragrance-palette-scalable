#!/bin/bash

echo "🧪 Testing all components..."

# Test TGI
echo "Testing TGI..."
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Create a perfume name", "parameters": {"max_new_tokens": 20}}' || echo "❌ TGI failed"

# Test Redis
echo "Testing Redis..."
redis-cli ping || echo "❌ Redis failed"

# Test RabbitMQ
echo "Testing RabbitMQ..."
curl -u admin:admin123 http://localhost:15672/api/overview || echo "❌ RabbitMQ failed"

# Test PostgreSQL
echo "Testing PostgreSQL Master..."
PGPASSWORD=postgresmaster psql -h localhost -p 5432 -U postgres -d fragrances -c "SELECT 1;" || echo "❌ PostgreSQL Master failed"

echo "Testing PostgreSQL Replica..."
PGPASSWORD=postgresmaster psql -h localhost -p 5433 -U postgres -d fragrances -c "SELECT 1;" || echo "❌ PostgreSQL Replica failed"

# Test Backend Health
echo "Testing Backend Health..."
curl http://localhost:3001/api/health || echo "❌ Backend failed"

# Test Frontend
echo "Testing Frontend..."
curl -I http://localhost:3000 || echo "❌ Frontend failed"

# Test Load Balancer
echo "Testing Load Balancer..."
curl -I http://localhost:80 || echo "❌ Load Balancer failed"

echo "✅ Component testing completed!"