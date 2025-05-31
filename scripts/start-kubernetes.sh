#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Fragrance Palette on Docker Desktop Kubernetes${NC}"

# # Check if Docker Desktop Kubernetes is enabled
# if ! kubectl cluster-info | grep -q "docker-desktop"; then
#     echo -e "${RED}❌ Docker Desktop Kubernetes is not running${NC}"
#     echo -e "${YELLOW}💡 Enable Kubernetes in Docker Desktop Settings -> Kubernetes -> Enable Kubernetes${NC}"
#     exit 1
# fi

# # Switch to docker-desktop context
# echo -e "${YELLOW}🔄 Switching to docker-desktop context...${NC}"
# kubectl config use-context docker-desktop

# Build Docker images (they'll be available in Docker Desktop)
echo -e "${YELLOW}🐳 Building Docker images...${NC}"

# Build backend image
echo -e "${BLUE}Building backend image...${NC}"
docker build -t fragrance-backend:latest ./backend

# Build frontend image  
echo -e "${BLUE}Building frontend image...${NC}"
docker build -t fragrance-frontend:latest ./frontend

# Create namespace if it doesn't exist
echo -e "${YELLOW}🏷️ Creating namespace...${NC}"
kubectl create namespace fragrance-palette --dry-run=client -o yaml | kubectl apply -f -

# Apply Kubernetes manifests in order
echo -e "${YELLOW}📦 Deploying infrastructure services...${NC}"

# Apply secrets and configmaps first
echo -e "${BLUE}Applying secrets and configmaps...${NC}"
kubectl apply -f k8s/secrets.yaml -n fragrance-palette
kubectl apply -f k8s/configmaps.yaml -n fragrance-palette

# Deploy storage components
echo -e "${BLUE}Deploying storage services...${NC}"
kubectl apply -f k8s/postgres.yaml -n fragrance-palette
kubectl apply -f k8s/redis.yaml -n fragrance-palette
kubectl apply -f k8s/rabbitmq.yaml -n fragrance-palette

# Wait for storage services
echo -e "${YELLOW}⏳ Waiting for storage services (60s)...${NC}"
sleep 60

# Check storage service status
echo -e "${YELLOW}🔍 Checking storage services...${NC}"
kubectl get pods -n fragrance-palette

# Deploy TGI (this takes time)
echo -e "${BLUE}Deploying TGI service...${NC}"
kubectl apply -f k8s/tgi.yaml -n fragrance-palette

# Deploy application services
echo -e "${BLUE}Deploying application services...${NC}"
kubectl apply -f k8s/backend.yaml -n fragrance-palette
kubectl apply -f k8s/frontend.yaml -n fragrance-palette
kubectl apply -f k8s/nginx.yaml -n fragrance-palette

# Deploy monitoring (if available)
if [ -f k8s/prometheus.yaml ] && [ -f k8s/grafana.yaml ]; then
    echo -e "${YELLOW}📊 Deploying monitoring stack...${NC}"
    kubectl apply -f k8s/prometheus.yaml -n fragrance-palette
    kubectl apply -f k8s/grafana.yaml -n fragrance-palette
fi

# Wait for application services with longer timeout
echo -e "${YELLOW}⏳ Waiting for application services (this may take several minutes)...${NC}"
kubectl wait --for=condition=ready pod -l app=backend --timeout=600s -n fragrance-palette
kubectl wait --for=condition=ready pod -l app=frontend --timeout=300s -n fragrance-palette
kubectl wait --for=condition=ready pod -l app=nginx --timeout=300s -n fragrance-palette

# Set up port forwarding for easy access
echo -e "${YELLOW}🔗 Setting up port forwarding...${NC}"

# Kill any existing port forwards
pkill -f "kubectl port-forward" 2>/dev/null || true
sleep 2

# Main application access
kubectl port-forward service/nginx-service 8080:80 -n fragrance-palette &
NGINX_PF_PID=$!

# Backend direct access
kubectl port-forward service/backend-service 3001:3001 -n fragrance-palette &
BACKEND_PF_PID=$!

# Frontend direct access  
kubectl port-forward service/frontend-service 3000:3000 -n fragrance-palette &
FRONTEND_PF_PID=$!

# RabbitMQ management
kubectl port-forward service/rabbitmq-service 15672:15672 -n fragrance-palette &
RABBITMQ_PF_PID=$!

# Monitoring services (if deployed)
if kubectl get service prometheus-service -n fragrance-palette >/dev/null 2>&1; then
    kubectl port-forward service/prometheus-service 9090:9090 -n fragrance-palette &
    PROMETHEUS_PF_PID=$!
fi

if kubectl get service grafana-service -n fragrance-palette >/dev/null 2>&1; then
    kubectl port-forward service/grafana-service 3030:3000 -n fragrance-palette &
    GRAFANA_PF_PID=$!
fi

# Store PIDs for cleanup
echo "$NGINX_PF_PID $BACKEND_PF_PID $FRONTEND_PF_PID $RABBITMQ_PF_PID $PROMETHEUS_PF_PID $GRAFANA_PF_PID" > .k8s_port_forwards

# Wait a moment for port forwarding to establish
sleep 5

echo -e "${GREEN}✅ Kubernetes deployment completed!${NC}"
echo -e "${BLUE}📊 Access points:${NC}"
echo -e "   • 🌐 Main Application: http://localhost:8080"
echo -e "   • 🔧 Backend API: http://localhost:3001"
echo -e "   • 🎨 Frontend: http://localhost:3000"
echo -e "   • 🐰 RabbitMQ Management: http://localhost:15672 (admin/admin123)"
echo -e "   • 📊 Prometheus: http://localhost:9090"
echo -e "   • 📈 Grafana: http://localhost:3030 (admin/admin123)"

echo -e "\n${YELLOW}💡 Useful commands:${NC}"
echo -e "   • Check status: ./scripts/status-k8s.sh"
echo -e "   • View logs: kubectl logs -f deployment/backend-deployment -n fragrance-palette"
echo -e "   • Stop services: ./scripts/stop-k8s.sh"

echo -e "\n${GREEN}🎉 Ready to use! Press Ctrl+C to stop port forwarding${NC}"

# Keep script running to maintain port forwards
trap 'echo -e "\n${YELLOW}Port forwarding will continue in background${NC}"; exit 0' INT
wait