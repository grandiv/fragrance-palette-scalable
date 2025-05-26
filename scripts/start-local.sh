#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store process IDs
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
# cleanup() {
#     echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
#     # Kill backend process
#     if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
#         echo -e "${YELLOW}🔧 Stopping backend (PID: $BACKEND_PID)...${NC}"
#         kill -TERM $BACKEND_PID 2>/dev/null
#         wait $BACKEND_PID 2>/dev/null
#     fi
    
#     # Kill frontend process
#     if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
#         echo -e "${YELLOW}🎨 Stopping frontend (PID: $FRONTEND_PID)...${NC}"
#         kill -TERM $FRONTEND_PID 2>/dev/null
#         wait $FRONTEND_PID 2>/dev/null
#     fi
    
#     # Stop Docker containers
#     echo -e "${YELLOW}🐳 Stopping Docker containers...${NC}"
#     docker-compose down
    
#     # Kill any remaining Node.js processes (optional safety measure)
#     echo -e "${YELLOW}🧹 Cleaning up any remaining processes...${NC}"
#     pkill -f "node src/app.js" 2>/dev/null || true
#     pkill -f "npm run dev" 2>/dev/null || true
#     pkill -f "next dev" 2>/dev/null || true
    
#     echo -e "${GREEN}✅ All services stopped successfully!${NC}"
#     exit 0
# }

# # Set up signal handlers
# trap cleanup SIGINT SIGTERM EXIT

echo -e "${BLUE}🚀 Starting Fragrance Palette Local Development Environment${NC}"

# Start infrastructure services
echo -e "${YELLOW}📦 Starting infrastructure services...${NC}"
docker-compose up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are ready
echo -e "${YELLOW}🔍 Checking service health...${NC}"
docker-compose ps

# Set up database
echo -e "${YELLOW}🗄️ Setting up database...${NC}"
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed

# Start backend in background
echo -e "${YELLOW}🔧 Starting backend...${NC}"
npm start &
BACKEND_PID=$!
echo -e "${GREEN}Backend started with PID: $BACKEND_PID${NC}"

# Start frontend
echo -e "${YELLOW}🎨 Starting frontend...${NC}"
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started with PID: $FRONTEND_PID${NC}"

echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "${BLUE}🔀 Load Balancer: http://localhost:80${NC}"
echo -e "${BLUE}🐰 RabbitMQ Management: http://localhost:15672 (admin/admin123)${NC}"
echo -e "${BLUE}📊 Redis: localhost:6379${NC}"
echo -e "${BLUE}🤖 TGI: http://localhost:8080${NC}"

echo -e "\n${YELLOW}💡 Press Ctrl+C to stop all services${NC}"

# Keep script running and wait for signals
wait $BACKEND_PID $FRONTEND_PID