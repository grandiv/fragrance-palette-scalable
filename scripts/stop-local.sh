#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Fragrance Palette Services${NC}"

# Stop any running performance tests
echo -e "${YELLOW}🔄 Stopping any running performance tests...${NC}"
pkill -f "hey" 2>/dev/null || true
pkill -f "newman" 2>/dev/null || true
pkill -f "performance-test" 2>/dev/null || true

# Stop all services gracefully
echo -e "${YELLOW}📦 Stopping all Docker Compose services...${NC}"
docker-compose stop

# Give services time to shut down gracefully
echo -e "${YELLOW}⏳ Waiting for graceful shutdown...${NC}"
sleep 10

# Force stop if needed
echo -e "${YELLOW}🔄 Forcing stop of any remaining services...${NC}"
docker-compose down

# Clean up any hanging containers
echo -e "${YELLOW}🧹 Cleaning up containers...${NC}"
docker container prune -f >/dev/null 2>&1 || true

# Show final status
echo -e "\n${YELLOW}📊 Final Status:${NC}"
RUNNING_CONTAINERS=$(docker-compose ps -q | wc -l)
if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
    echo -e "   ✅ All services stopped"
else
    echo -e "   ⚠️  $RUNNING_CONTAINERS containers still running"
    docker-compose ps
fi

# Optional operations (commented out by default)
echo -e "\n${YELLOW}💡 Optional cleanup commands:${NC}"
echo -e "   • Remove volumes: docker-compose down -v"
echo -e "   • Remove images: docker-compose down --rmi all"
echo -e "   • Clean all Docker: docker system prune -a"
echo -e "   • Remove test data: rm -rf reports/"

# Uncomment these if you want automatic cleanup
# echo -e "${YELLOW}🗑️ Removing volumes...${NC}"
# docker-compose down -v

# echo -e "${YELLOW}🧹 Cleaning up unused images...${NC}"
# docker image prune -f

echo -e "${GREEN}✅ All services stopped!${NC}"
echo -e "${BLUE}💡 To restart: ./scripts/start-local.sh${NC}"

read -rp "🔸 Press [Enter] to close this window…"
