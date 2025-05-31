#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Fragrance Palette Scalable Architecture${NC}"

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true

# Create necessary directories
echo -e "${YELLOW}📁 Creating configuration directories...${NC}"
mkdir -p config scripts monitoring/grafana/{provisioning,dashboards} nginx/conf.d reports

# Make scripts executable
chmod +x scripts/*.sh

# Check environment variables
# echo -e "${YELLOW}🔍 Checking environment variables...${NC}"
# if [ -z "$HF_TOKEN" ]; then
#     echo -e "${RED}❌ HF_TOKEN not set in .env file${NC}"
#     echo -e "${YELLOW}💡 Please add HF_TOKEN=your_token to .env${NC}"
#     exit 1
# fi

# if [ -z "$JWT_SECRET" ]; then
#     echo -e "${YELLOW}⚠️  JWT_SECRET not set, using default${NC}"
#     export JWT_SECRET="maisonmargielabythefireplace-super-secret-key-here"
# fi

# # Clean up any orphaned containers and networks
# echo -e "${YELLOW}🧹 Cleaning up orphaned resources...${NC}"
# docker container prune -f >/dev/null 2>&1 || true
# docker network prune -f >/dev/null 2>&1 || true

# Build Docker images first
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose build --no-cache

# Start infrastructure services first
echo -e "${YELLOW}📦 Starting infrastructure services...${NC}"
docker-compose up -d postgres-master redis-master

# Wait for infrastructure with proper health checks
echo -e "${YELLOW}⏳ Waiting for infrastructure services...${NC}"
for i in {1..12}; do
    if docker-compose exec -T postgres-master pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL master ready${NC}"
        break
    fi
    echo -e "${YELLOW}   Waiting for PostgreSQL master... ($i/12)${NC}"
    sleep 5
done

for i in {1..12}; do
    if docker-compose exec -T redis-master redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis ready${NC}"
        break
    fi
    echo -e "${YELLOW}   Waiting for Redis... ($i/12)${NC}"
    sleep 5
done

# Check if infrastructure is ready
echo -e "${YELLOW}🔍 Final infrastructure readiness check...${NC}"
if ! docker-compose exec -T postgres-master pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL master not ready after 60 seconds${NC}"
    echo -e "${YELLOW}💡 Check logs: docker-compose logs postgres-master${NC}"
    exit 1
fi

if ! docker-compose exec -T redis-master redis-cli ping >/dev/null 2>&1; then
    echo -e "${RED}❌ Redis not ready after 60 seconds${NC}"
    echo -e "${YELLOW}💡 Check logs: docker-compose logs redis-master${NC}"
    exit 1
fi

# Start RabbitMQ
echo -e "${YELLOW}📦 Starting message queue...${NC}"
docker-compose up -d rabbitmq

# Wait for RabbitMQ
echo -e "${YELLOW}⏳ Waiting for RabbitMQ...${NC}"
for i in {1..12}; do
    if curl -s -u admin:rabbitmqpw http://localhost:15672/api/overview >/dev/null 2>&1; then
        echo -e "${GREEN}✅ RabbitMQ ready${NC}"
        break
    fi
    echo -e "${YELLOW}   Waiting for RabbitMQ... ($i/12)${NC}"
    sleep 5
done

# Start replica databases
echo -e "${YELLOW}📦 Starting replica databases...${NC}"
docker-compose up -d postgres-replica-1 postgres-replica-2

# Wait for replicas to initialize
echo -e "${YELLOW}⏳ Waiting for replica databases to initialize...${NC}"
sleep 5

# Check replica status
for replica in postgres-replica-1 postgres-replica-2; do
    for i in {1..18}; do
        if docker-compose exec -T $replica pg_isready -U postgres >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $replica ready${NC}"
            break
        fi
        echo -e "${YELLOW}   Waiting for $replica... ($i/18)${NC}"
        sleep 5
    done
done

# Setup database schema and seed data
echo -e "${YELLOW}🗄️ Setting up database schema...${NC}"
docker-compose exec -T postgres-master psql -U postgres -d fragrances -c "
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS \"Formula\" CASCADE;
DROP TABLE IF EXISTS \"User\" CASCADE;
DROP TABLE IF EXISTS \"FragranceFamily\" CASCADE;

-- Create FragranceFamily table
CREATE TABLE \"FragranceFamily\" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  ingredients JSONB,
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create User table
CREATE TABLE \"User\" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Formula table
CREATE TABLE \"Formula\" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients JSONB,
  notes JSONB,
  \"userId\" INTEGER REFERENCES \"User\"(id) ON DELETE CASCADE,
  \"fragranceFamilyId\" INTEGER REFERENCES \"FragranceFamily\"(id) ON DELETE SET NULL,
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_email ON \"User\"(email);
CREATE INDEX IF NOT EXISTS idx_formula_user_id ON \"Formula\"(\"userId\");
CREATE INDEX IF NOT EXISTS idx_formula_fragrance_family_id ON \"Formula\"(\"fragranceFamilyId\");
CREATE INDEX IF NOT EXISTS idx_fragrance_family_name ON \"FragranceFamily\"(name);
"

# Check if schema creation was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema created successfully${NC}"
else
    echo -e "${RED}❌ Database schema creation failed${NC}"
    echo -e "${YELLOW}💡 Check logs: docker-compose logs postgres-master${NC}"
    exit 1
fi

# Seed initial data
echo -e "${YELLOW}🌱 Seeding initial data...${NC}"
docker-compose exec -T postgres-master psql -U postgres -d fragrances -c "
-- Insert fragrance families
INSERT INTO \"FragranceFamily\" (name, description, ingredients) VALUES
  ('Citrus', 'Fresh, zesty, and energizing scents', '[\"Lemon\", \"Orange\", \"Bergamot\", \"Grapefruit\", \"Lime\"]'),
  ('Floral', 'Elegant and feminine flower-based scents', '[\"Rose\", \"Jasmine\", \"Lavender\", \"Geranium\", \"Ylang Ylang\"]'),
  ('Woody', 'Warm, earthy, and sophisticated scents', '[\"Cedarwood\", \"Sandalwood\", \"Pine\", \"Vetiver\", \"Oak\"]'),
  ('Oriental', 'Rich, warm, and spicy scents', '[\"Vanilla\", \"Amber\", \"Cinnamon\", \"Clove\", \"Patchouli\"]'),
  ('Fresh', 'Clean, aquatic, and cooling scents', '[\"Marine\", \"Mint\", \"Green Leaves\", \"Cucumber\", \"Water Lily\"]'),
  ('Gourmand', 'Sweet, edible, and dessert-like scents', '[\"Chocolate\", \"Coffee\", \"Honey\", \"Caramel\", \"Vanilla\"]')
ON CONFLICT (name) DO NOTHING;

-- Insert demo user (password is 'password123')
INSERT INTO \"User\" (email, password, name) VALUES
  ('demo@fragrancepalette.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewReZSaWaVRfzuQ2', 'Demo User'),
  ('test@example.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewReZSaWaVRfzuQ2', 'Test User')
ON CONFLICT (email) DO NOTHING;
"

# Check if seeding was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Initial data seeded successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Initial data seeding had issues (might be duplicate data)${NC}"
fi

# Verify replication is working
echo -e "${YELLOW}🔄 Verifying database replication...${NC}"
REPLICATION_COUNT=$(docker-compose exec -T postgres-master psql -U postgres -t -c "SELECT count(*) FROM pg_stat_replication;" 2>/dev/null | tr -d ' \n' || echo "0")
if [ "$REPLICATION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Database replication active: $REPLICATION_COUNT replicas${NC}"
else
    echo -e "${YELLOW}⚠️  Database replication not yet active (replicas may still be syncing)${NC}"
fi

# Start application services with staggered startup
echo -e "${YELLOW}📦 Starting backend services...${NC}"
docker-compose up -d backend-1
sleep 5

echo -e "${YELLOW}📦 Starting additional backend instances...${NC}"
docker-compose up -d backend-2
sleep 5
docker-compose up -d backend-3

# Wait for backends to stabilize
echo -e "${YELLOW}⏳ Waiting for backend services to stabilize...${NC}"
sleep 5

# Check backend health before proceeding
echo -e "${YELLOW}🔍 Checking backend health...${NC}"
for i in {1..24}; do
    HEALTHY_BACKENDS=0
    
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        ((HEALTHY_BACKENDS++))
    fi
    if curl -s http://localhost:3002/api/health >/dev/null 2>&1; then
        ((HEALTHY_BACKENDS++))
    fi
    if curl -s http://localhost:3003/api/health >/dev/null 2>&1; then
        ((HEALTHY_BACKENDS++))
    fi
    
    if [ "$HEALTHY_BACKENDS" -ge 2 ]; then
        echo -e "${GREEN}✅ $HEALTHY_BACKENDS backend services are healthy${NC}"
        break
    fi
    
    echo -e "${YELLOW}   Waiting for backends... ($HEALTHY_BACKENDS/3 healthy, attempt $i/24)${NC}"
    sleep 5
done

# Start frontend services
echo -e "${YELLOW}📦 Starting frontend services...${NC}"
docker-compose up -d frontend-1
sleep 5
docker-compose up -d frontend-2

# Wait for frontends
echo -e "${YELLOW}⏳ Waiting for frontend services...${NC}"
sleep 5

# Check frontend health
echo -e "${YELLOW}🔍 Checking frontend health...${NC}"
for i in {1..12}; do
    HEALTHY_FRONTENDS=0
    
    if curl -s -I http://localhost:3000 >/dev/null 2>&1; then
        ((HEALTHY_FRONTENDS++))
    fi
    if curl -s -I http://localhost:3004 >/dev/null 2>&1; then
        ((HEALTHY_FRONTENDS++))
    fi
    
    if [ "$HEALTHY_FRONTENDS" -ge 1 ]; then
        echo -e "${GREEN}✅ $HEALTHY_FRONTENDS frontend services are healthy${NC}"
        break
    fi
    
    echo -e "${YELLOW}   Waiting for frontends... ($HEALTHY_FRONTENDS/2 healthy, attempt $i/12)${NC}"
    sleep 5
done

# Start load balancer (after backends and frontends are ready)
echo -e "${YELLOW}⚖️ Starting load balancer...${NC}"
docker-compose up -d nginx

# Wait for NGINX to initialize
sleep 5

# Test load balancer
echo -e "${YELLOW}🔍 Testing load balancer...${NC}"
for i in {1..6}; do
    if curl -s http://localhost/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Load balancer is healthy${NC}"
        break
    fi
    echo -e "${YELLOW}   Waiting for load balancer... ($i/6)${NC}"
    sleep 5
done

# Start monitoring services
echo -e "${YELLOW}📊 Starting monitoring services...${NC}"
docker-compose up -d prometheus grafana node-exporter

# Start Redis Sentinel (if configured)
echo -e "${YELLOW}📦 Starting Redis Sentinel...${NC}"
docker-compose up -d redis-sentinel 2>/dev/null || echo "Redis Sentinel not configured or failed to start"

# Start TGI (resource intensive, start last)
echo -e "${YELLOW}🤖 Starting AI services (this may take a while)...${NC}"
docker-compose up -d tgi

# Final comprehensive health check
echo -e "${YELLOW}🔍 Final comprehensive health check...${NC}"
sleep 5

# Count healthy services
HEALTHY_SERVICES=0
TOTAL_SERVICES=0

services=(
    "http://localhost:3001/api/health:Backend-1"
    "http://localhost:3002/api/health:Backend-2"
    "http://localhost:3003/api/health:Backend-3"
    "http://localhost:3000:Frontend-1"
    "http://localhost:3004:Frontend-2"
    "http://localhost/health:Load-Balancer"
    "http://localhost:15672:RabbitMQ"
    "http://localhost:9090:Prometheus"
    "http://localhost:3030:Grafana"
)

for service in "${services[@]}"; do
    url="${service%%:*}"
    name="${service##*:}"
    ((TOTAL_SERVICES++))
    
    if curl -s "$url" >/dev/null 2>&1; then
        ((HEALTHY_SERVICES++))
        echo -e "   ✅ $name: healthy"
    else
        echo -e "   ❌ $name: unhealthy"
    fi
done

echo -e "\n${GREEN}✅ All services started!${NC}"
echo -e "${BLUE}📊 Service Health: $HEALTHY_SERVICES/$TOTAL_SERVICES services healthy${NC}"

echo -e "\n${BLUE}📊 Access Points:${NC}"
echo -e "   • 🌐 Main Application: http://localhost"
echo -e "   • 🔧 Backend APIs: http://localhost:3001, :3002, :3003"
echo -e "   • 🎨 Frontend: http://localhost:3000, :3004"
echo -e "   • 🤖 TGI API: http://localhost:8080"
echo -e "   • 🐰 RabbitMQ: http://localhost:15672 (admin/rabbitmqpw)"
echo -e "   • 📊 Prometheus: http://localhost:9090"
echo -e "   • 📈 Grafana: http://localhost:3030 (admin/admin123)"

echo -e "\n${BLUE}🔑 Demo Credentials:${NC}"
echo -e "   • Email: demo@fragrancepalette.com"
echo -e "   • Password: password123"

echo -e "\n${YELLOW}💡 Useful Commands:${NC}"
echo -e "   • Check status: ./scripts/status-local.sh"
echo -e "   • Performance test: ./scripts/performance-test.sh"
echo -e "   • Load test: ./scripts/load-test.sh"
echo -e "   • Monitor performance: ./scripts/monitor-performance.sh"
echo -e "   • View logs: docker-compose logs -f [service-name]"
echo -e "   • Stop services: ./scripts/stop-local.sh"

if [ "$HEALTHY_SERVICES" -ge 6 ]; then
    echo -e "\n${GREEN}🎉 System is ready for use and performance testing!${NC}"
    echo -e "${BLUE}🧪 Run ./scripts/performance-test.sh to start testing${NC}"
else
    echo -e "\n${YELLOW}⚠️  Some services are not healthy. Check logs for details.${NC}"
    echo -e "${YELLOW}💡 Run ./scripts/status-local.sh for detailed status${NC}"
fi

echo -e "\n${BLUE}🚀 Startup completed! The system is running.${NC}"