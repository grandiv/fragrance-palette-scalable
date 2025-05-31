#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Fragrance Palette Scalable Architecture${NC}"

# Create necessary directories
echo -e "${YELLOW}📁 Creating configuration directories...${NC}"
mkdir -p config scripts monitoring/grafana/{provisioning,dashboards} nginx/conf.d reports

# Make scripts executable
chmod +x scripts/*.sh

# Check environment variables
echo -e "${YELLOW}🔍 Checking environment variables...${NC}"
if [ -z "$HF_TOKEN" ]; then
    echo -e "${RED}❌ HF_TOKEN not set in .env file${NC}"
    echo -e "${YELLOW}💡 Please add HF_TOKEN=your_token to .env${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  JWT_SECRET not set, using default${NC}"
    export JWT_SECRET="your-super-secret-jwt-key-here"
fi

# Build Docker images first
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose build

# Start infrastructure services first
echo -e "${YELLOW}📦 Starting infrastructure services...${NC}"
docker-compose up -d postgres-master redis-master rabbitmq

# Wait for infrastructure
echo -e "${YELLOW}⏳ Waiting for infrastructure services...${NC}"
sleep 30

# Start replica databases
echo -e "${YELLOW}📦 Starting replica databases...${NC}"
docker-compose up -d postgres-replica-1 postgres-replica-2

# Wait for replicas
echo -e "${YELLOW}⏳ Waiting for replica databases...${NC}"
sleep 60

# Setup database schema
echo -e "${YELLOW}🗄️ Setting up database schema...${NC}"
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
cd ..

# Start application services
echo -e "${YELLOW}📦 Starting application services...${NC}"
docker-compose up -d backend-1 backend-2 backend-3 frontend-1 frontend-2

# Wait for applications
echo -e "${YELLOW}⏳ Waiting for application services...${NC}"
sleep 45

# Start load balancer
echo -e "${YELLOW}⚖️ Starting load balancer...${NC}"
docker-compose up -d nginx

# Start monitoring
echo -e "${YELLOW}📊 Starting monitoring services...${NC}"
docker-compose up -d prometheus grafana node-exporter

# Start TGI (resource intensive, start last)
echo -e "${YELLOW}🤖 Starting AI services...${NC}"
docker-compose up -d tgi

# Wait for everything to stabilize
echo -e "${YELLOW}⏳ Final stabilization wait...${NC}"
sleep 30

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
echo -e "   • Performance test: ./scripts/performance-test.sh"
echo -e "   • Load test: ./scripts/load-test.sh"
echo -e "   • Monitor performance: ./scripts/monitor-performance.sh"
echo -e "   • View logs: docker-compose logs -f [service-name]"
echo -e "   • Stop services: ./scripts/stop-local.sh"

echo -e "\n${GREEN}🧪 Ready for performance testing!${NC}"
echo -e "${BLUE}Run ./scripts/performance-test.sh to start comprehensive testing${NC}"

read -rp "🔸 Press [Enter] to close this window…"
