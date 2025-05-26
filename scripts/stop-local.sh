#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping Fragrance Palette Development Environment${NC}"

# Stop Docker containers
echo -e "${YELLOW}🐳 Stopping Docker containers...${NC}"
docker-compose down

# Kill Node.js processes
echo -e "${YELLOW}🔧 Stopping Node.js processes...${NC}"
pkill -f "node src/app.js" 2>/dev/null && echo -e "${GREEN}✅ Backend stopped${NC}" || echo -e "${YELLOW}ℹ️  No backend process found${NC}"
pkill -f "npm run dev" 2>/dev/null && echo -e "${GREEN}✅ Frontend npm process stopped${NC}" || echo -e "${YELLOW}ℹ️  No frontend npm process found${NC}"
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}✅ Next.js process stopped${NC}" || echo -e "${YELLOW}ℹ️  No Next.js process found${NC}"

# Check for any remaining processes on our ports
echo -e "${YELLOW}🔍 Checking for processes on development ports...${NC}"

# Function to kill process on specific port
kill_port() {
    local port=$1
    local service=$2
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔫 Killing $service process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null && echo -e "${GREEN}✅ $service stopped${NC}" || echo -e "${RED}❌ Failed to stop $service${NC}"
    else
        echo -e "${GREEN}✅ Port $port is free${NC}"
    fi
}

# Kill processes on development ports
kill_port 3000 "Frontend"
kill_port 3001 "Backend"
kill_port 8080 "TGI"
kill_port 5432 "PostgreSQL"
kill_port 6379 "Redis"
kill_port 5672 "RabbitMQ"
kill_port 15672 "RabbitMQ Management"

echo -e "${GREEN}🎉 All services stopped successfully!${NC}"