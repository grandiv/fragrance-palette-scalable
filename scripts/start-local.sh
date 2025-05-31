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

# Build Docker images first
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose build --no-cache

# Start infrastructure services first
echo -e "${YELLOW}📦 Starting infrastructure services...${NC}"
docker-compose up -d postgres-master redis-master

# Wait for infrastructure
echo -e "${YELLOW}⏳ Waiting for infrastructure services...${NC}"
sleep 5 #45

# Check if infrastructure is ready
echo -e "${YELLOW}🔍 Checking infrastructure readiness...${NC}"
if ! docker-compose exec -T postgres-master pg_isready -U postgres -d fragrances; then
    echo -e "${RED}❌ PostgreSQL master not ready${NC}"
    exit 1
fi

if ! docker-compose exec -T redis-master redis-cli ping; then
    echo -e "${RED}❌ Redis not ready${NC}"
    exit 1
fi

# Start RabbitMQ
echo -e "${YELLOW}📦 Starting message queue...${NC}"
docker-compose up -d rabbitmq

sleep 5 # 30

# Start replica databases
echo -e "${YELLOW}📦 Starting replica databases...${NC}"
docker-compose up -d postgres-replica-1 postgres-replica-2

# Wait for replicas
echo -e "${YELLOW}⏳ Waiting for replica databases...${NC}"
sleep 5 # 60

# Setup database schema on running master (not during build)
echo -e "${YELLOW}🗄️ Setting up database schema...${NC}"
docker-compose exec -T postgres-master psql -U postgres -d fragrances -c "
CREATE TABLE IF NOT EXISTS \"FragranceFamily\" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  ingredients JSONB,
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS \"User\" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS \"Formula\" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients JSONB,
  notes JSONB,
  \"userId\" INTEGER REFERENCES \"User\"(id),
  \"fragranceFamilyId\" INTEGER REFERENCES \"FragranceFamily\"(id),
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

# Seed initial data
echo -e "${YELLOW}🌱 Seeding initial data...${NC}"
docker-compose exec -T postgres-master psql -U postgres -d fragrances -c "
INSERT INTO \"FragranceFamily\" (name, description, ingredients) VALUES
  ('Citrus', 'Fresh, zesty, and energizing scents', '[\"Lemon\", \"Orange\", \"Bergamot\", \"Grapefruit\", \"Lime\"]'),
  ('Floral', 'Elegant and feminine flower-based scents', '[\"Rose\", \"Jasmine\", \"Lavender\", \"Geranium\", \"Ylang Ylang\"]'),
  ('Woody', 'Warm, earthy, and sophisticated scents', '[\"Cedarwood\", \"Sandalwood\", \"Pine\", \"Vetiver\", \"Oak\"]'),
  ('Oriental', 'Rich, warm, and spicy scents', '[\"Vanilla\", \"Amber\", \"Cinnamon\", \"Clove\", \"Patchouli\"]'),
  ('Fresh', 'Clean, aquatic, and cooling scents', '[\"Marine\", \"Mint\", \"Green Leaves\", \"Cucumber\", \"Water Lily\"]'),
  ('Gourmand', 'Sweet, edible, and dessert-like scents', '[\"Chocolate\", \"Coffee\", \"Honey\", \"Caramel\", \"Vanilla\"]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO \"User\" (email, password, name) VALUES
  ('demo@fragrancepalette.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewReZSaWaVRfzuQ2', 'Demo User')
ON CONFLICT (email) DO NOTHING;
"

# Start application services with staggered startup
echo -e "${YELLOW}📦 Starting backend services...${NC}"
docker-compose up -d backend-1
sleep 5 # 20
docker-compose up -d backend-2
sleep 5 # 20docker-compose up -d backend-3

# Wait for backends to stabilize
echo -e "${YELLOW}⏳ Waiting for backend services...${NC}"
sleep 5 # 60

# Check backend health before proceeding
echo -e "${YELLOW}🔍 Checking backend health...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend-1 is healthy${NC}"
        break
    fi
    echo -e "${YELLOW}   Waiting for backend-1... ($i/30)${NC}"
    sleep 5
done

# Start frontend services
echo -e "${YELLOW}📦 Starting frontend services...${NC}"
docker-compose up -d frontend-1 frontend-2

# Wait for frontends
echo -e "${YELLOW}⏳ Waiting for frontend services...${NC}"
sleep 5 # 45

# Start load balancer (after backends are ready)
echo -e "${YELLOW}⚖️ Starting load balancer...${NC}"
docker-compose up -d nginx

# Start monitoring
echo -e "${YELLOW}📊 Starting monitoring services...${NC}"
docker-compose up -d prometheus grafana node-exporter

# Start TGI (resource intensive, start last)
echo -e "${YELLOW}🤖 Starting AI services...${NC}"
docker-compose up -d tgi

# Final health check
echo -e "${YELLOW}🔍 Final health check...${NC}"
sleep 5 # 30

echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${BLUE}📊 Access points:${NC}"
echo -e "   • 🌐 Main Application: http://localhost"
echo -e "   • 🔧 Backend APIs: http://localhost:3001, :3002, :3003"
echo -e "   • 🎨 Frontend: http://localhost:3000, :3004"
echo -e "   • 🤖 TGI API: http://localhost:8080"
echo -e "   • 🐰 RabbitMQ: http://localhost:15672 (admin/rabbitmqpw)"
echo -e "   • 📊 Prometheus: http://localhost:9090"
echo -e "   • 📈 Grafana: http://localhost:3030 (admin/admin123)"

echo -e "\n${YELLOW}💡 Useful commands:${NC}"
echo -e "   • Check status: ./scripts/status-local.sh"
echo -e "   • View logs: docker-compose logs -f [service-name]"
echo -e "   • Stop services: ./scripts/stop-local.sh"

echo -e "\n${GREEN}🧪 Ready for performance testing!${NC}"
echo -e "${BLUE}Run ./scripts/status-local.sh to check all services${NC}"

read -rp "🔸 Press [Enter] to close this window…"
