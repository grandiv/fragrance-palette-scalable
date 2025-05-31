#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Fragrance Palette Kubernetes Status (Docker Desktop)${NC}"

# Check current context
echo -e "\n${YELLOW}🎮 Kubernetes Context:${NC}"
kubectl config current-context

# Check cluster info
echo -e "\n${YELLOW}🏗️ Cluster Info:${NC}"
kubectl cluster-info | head -3

# Check namespace
echo -e "\n${YELLOW}🏷️ Namespace Status:${NC}"
kubectl get namespace fragrance-palette 2>/dev/null || echo "Namespace not found"

# Check all pods in our namespace
echo -e "\n${YELLOW}🚀 Pod Status:${NC}"
kubectl get pods -n fragrance-palette -o wide

# Check services
echo -e "\n${YELLOW}🌐 Service Status:${NC}"
kubectl get services -n fragrance-palette

# Check deployments
echo -e "\n${YELLOW}📦 Deployment Status:${NC}"
kubectl get deployments -n fragrance-palette

# Check persistent volumes
echo -e "\n${YELLOW}💾 Storage Status:${NC}"
kubectl get pv,pvc -n fragrance-palette

# Check ConfigMaps and Secrets
echo -e "\n${YELLOW}🔐 Configuration Status:${NC}"
kubectl get configmaps,secrets -n fragrance-palette

# Check resource usage (if metrics server is available)
echo -e "\n${YELLOW}📈 Resource Usage:${NC}"
kubectl top nodes 2>/dev/null || echo "Metrics server not available"
kubectl top pods -n fragrance-palette 2>/dev/null || echo "Pod metrics not available"

# Health checks using port forwards
echo -e "\n${YELLOW}🔍 Health Checks:${NC}"

check_endpoint() {
    local url=$1
    local service=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q "200\|302\|404"; then
        echo -e "${GREEN}✅ $service: HEALTHY${NC}"
    else
        echo -e "${RED}❌ $service: UNHEALTHY or NOT ACCESSIBLE${NC}"
    fi
}

# Only check if port forwards are active
if lsof -i:8080 >/dev/null 2>&1; then
    check_endpoint "http://localhost:8080" "Main Application (NGINX)"
else
    echo -e "${YELLOW}⚠️  Main Application: Port forward not active (port 8080)${NC}"
fi

if lsof -i:3001 >/dev/null 2>&1; then
    check_endpoint "http://localhost:3001/api/health" "Backend API"
else
    echo -e "${YELLOW}⚠️  Backend API: Port forward not active (port 3001)${NC}"
fi

if lsof -i:3000 >/dev/null 2>&1; then
    check_endpoint "http://localhost:3000" "Frontend"
else
    echo -e "${YELLOW}⚠️  Frontend: Port forward not active (port 3000)${NC}"
fi

if lsof -i:15672 >/dev/null 2>&1; then
    check_endpoint "http://localhost:15672" "RabbitMQ Management"
else
    echo -e "${YELLOW}⚠️  RabbitMQ Management: Port forward not active (port 15672)${NC}"
fi

# Show recent events
echo -e "\n${YELLOW}📜 Recent Events:${NC}"
kubectl get events -n fragrance-palette --sort-by=.metadata.creationTimestamp | tail -10

# Show port forwarding status
echo -e "\n${YELLOW}🔗 Port Forwarding Status:${NC}"
if [ -f .k8s_port_forwards ]; then
    echo "Active port forwards:"
    ps aux | grep "kubectl port-forward" | grep -v grep || echo "No active port forwards found"
else
    echo "No port forward tracking file found"
fi

# Quick commands
echo -e "\n${BLUE}📋 Quick Commands:${NC}"
echo "• Start environment: ./scripts/start-k8s.sh"
echo "• Stop environment: ./scripts/stop-k8s.sh"
echo "• View logs: kubectl logs -f deployment/backend-deployment -n fragrance-palette"
echo "• Shell into pod: kubectl exec -it deployment/backend-deployment -n fragrance-palette -- sh"
echo "• Delete everything: kubectl delete namespace fragrance-palette"