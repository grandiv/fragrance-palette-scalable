#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Fragrance Palette Status Check${NC}"

# Check Docker Compose services
echo -e "\n${YELLOW}🐳 Docker Compose Services:${NC}"
docker-compose ps

# Check service health
echo -e "\n${YELLOW}🏥 Service Health:${NC}"

check_service() {
    local url=$1
    local name=$2
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if echo "$response_code" | grep -q "200\|201\|301\|302"; then
        echo -e "   ✅ $name: UP (HTTP $response_code)"
    else
        echo -e "   ❌ $name: DOWN (HTTP $response_code)"
    fi
}

# Load balancer and applications
check_service "http://localhost" "NGINX Load Balancer"
check_service "http://localhost/api/health" "Load Balanced Backend"

# Individual backend instances
check_service "http://localhost:3001/api/health" "Backend-1"
check_service "http://localhost:3002/api/health" "Backend-2"
check_service "http://localhost:3003/api/health" "Backend-3"

# Frontend instances
check_service "http://localhost:3000" "Frontend-1"
check_service "http://localhost:3004" "Frontend-2"

# Infrastructure services
check_service "http://localhost:15672" "RabbitMQ Management"
check_service "http://localhost:9090" "Prometheus"
check_service "http://localhost:3030" "Grafana"
check_service "http://localhost:8080/health" "TGI (AI Service)"

echo -e "\n${YELLOW}💾 Database Status:${NC}"
# Check PostgreSQL Master
if docker-compose exec -T postgres-master pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "   ✅ PostgreSQL Master: UP"
    # Check database exists
    if docker-compose exec -T postgres-master psql -U postgres -d fragrances -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "   ✅ Fragrances Database: ACCESSIBLE"
    else
        echo -e "   ❌ Fragrances Database: NOT ACCESSIBLE"
    fi
else
    echo -e "   ❌ PostgreSQL Master: DOWN"
fi

# Check PostgreSQL Replicas
if docker-compose exec -T postgres-replica-1 pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "   ✅ PostgreSQL Replica-1: UP"
    # Check replication status
    if docker-compose exec -T postgres-replica-1 psql -U postgres -d fragrances -c "SELECT pg_is_in_recovery();" >/dev/null 2>&1; then
        echo -e "   ✅ Replica-1: IN RECOVERY MODE"
    fi
else
    echo -e "   ❌ PostgreSQL Replica-1: DOWN"
fi

if docker-compose exec -T postgres-replica-2 pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "   ✅ PostgreSQL Replica-2: UP"
    # Check replication status
    if docker-compose exec -T postgres-replica-2 psql -U postgres -d fragrances -c "SELECT pg_is_in_recovery();" >/dev/null 2>&1; then
        echo -e "   ✅ Replica-2: IN RECOVERY MODE"
    fi
else
    echo -e "   ❌ PostgreSQL Replica-2: DOWN"
fi

# Check Redis
if docker-compose exec -T redis-master redis-cli ping >/dev/null 2>&1; then
    echo -e "   ✅ Redis: UP"
else
    echo -e "   ❌ Redis: DOWN"
fi

# Show replication status
echo -e "\n${YELLOW}🔄 Replication Status:${NC}"
REPLICATION_COUNT=$(docker-compose exec -T postgres-master psql -U postgres -t -c "SELECT count(*) FROM pg_stat_replication;" 2>/dev/null | tr -d ' \n' || echo "0")
if [ "$REPLICATION_COUNT" -gt 0 ]; then
    echo -e "   ✅ Active Replicas: $REPLICATION_COUNT"
    docker-compose exec -T postgres-master psql -U postgres -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;" 2>/dev/null || true
else
    echo -e "   ⚠️  No active replicas detected"
fi

# Show resource usage
echo -e "\n${YELLOW}📈 Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | head -15

# Show recent logs for any failed services
echo -e "\n${YELLOW}📜 Recent Errors (if any):${NC}"
docker-compose logs --tail=5 2>/dev/null | grep -i "error\|fail\|exception" | tail -5 || echo "   No recent errors found"

echo -e "\n${BLUE}📋 Quick Commands:${NC}"
echo -e "   • Start all: ./scripts/start-local.sh"
echo -e "   • Stop all: ./scripts/stop-local.sh"
echo -e "   • Performance test: ./scripts/performance-test.sh"
echo -e "   • Load test: ./scripts/load-test.sh"
echo -e "   • View logs: docker-compose logs -f [service-name]"
echo -e "   • Scale backend: docker-compose up -d --scale backend-1=2"
echo -e "   • Monitor real-time: ./scripts/monitor-performance.sh"

echo -e "\n${BLUE}🧪 Performance Testing:${NC}"
echo -e "   • Basic performance: ./scripts/performance-test.sh"
echo -e "   • Heavy load test: ./scripts/load-test.sh"
echo -e "   • Stress test: ./scripts/stress-test.sh"
echo -e "   • Scalability test: ./scripts/scalability-test.sh"

read -rp "🔸 Press [Enter] to close this window…"
