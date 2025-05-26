#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Fragrance Palette Service Status${NC}"
echo "=================================="

# Function to check port status
check_port() {
    local port=$1
    local service=$2
    local url=$3
    
    if lsof -i:$port >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $service (Port $port): RUNNING${NC}"
        if [ ! -z "$url" ]; then
            echo -e "   🔗 URL: $url"
        fi
    else
        echo -e "${RED}❌ $service (Port $port): STOPPED${NC}"
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local service=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|302"; then
        echo -e "${GREEN}✅ $service HTTP: HEALTHY${NC}"
    else
        echo -e "${RED}❌ $service HTTP: UNHEALTHY${NC}"
    fi
}

echo -e "\n${YELLOW}🐳 Docker Containers:${NC}"
docker-compose ps

echo -e "\n${YELLOW}📡 Port Status:${NC}"
check_port 3000 "Frontend (Next.js)" "http://localhost:3000"
check_port 3001 "Backend (Express)" "http://localhost:3001"
check_port 8080 "TGI (AI Service)" "http://localhost:8080"
check_port 5432 "PostgreSQL Master" ""
check_port 5433 "PostgreSQL Replica" ""
check_port 6379 "Redis" ""
check_port 5672 "RabbitMQ" ""
check_port 15672 "RabbitMQ Management" "http://localhost:15672"
check_port 80 "NGINX Load Balancer" "http://localhost:80"

echo -e "\n${YELLOW}🏥 Health Checks:${NC}"
check_http "http://localhost:3001/api/health" "Backend API"
check_http "http://localhost:3000" "Frontend"
check_http "http://localhost:15672" "RabbitMQ Management"

echo -e "\n${YELLOW}🔍 Process Information:${NC}"
echo "Node.js processes:"
ps aux | grep -E "(node|npm)" | grep -v grep || echo "No Node.js processes found"

echo -e "\n${BLUE}📋 Quick Commands:${NC}"
echo "• Start all services: ./scripts/start-local.sh"
echo "• Stop all services: ./scripts/stop-local.sh"
echo "• Check status: ./scripts/status-local.sh"
echo "• Test components: ./scripts/test-components.sh"