#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Fragrance Palette Kubernetes Environment${NC}"

# Kill port forwarding processes
if [ -f .k8s_port_forwards ]; then
    echo -e "${YELLOW}🔗 Stopping port forwarding...${NC}"
    while read pid; do
        if [ ! -z "$pid" ]; then
            kill $pid 2>/dev/null && echo -e "${GREEN}✅ Stopped port forward (PID: $pid)${NC}"
        fi
    done < .k8s_port_forwards
    rm .k8s_port_forwards
fi

# Kill any remaining kubectl port-forward processes
echo -e "${YELLOW}🧹 Cleaning up any remaining port forwards...${NC}"
pkill -f "kubectl port-forward" 2>/dev/null || true

# Delete all resources in namespace
echo -e "${YELLOW}🗑️  Deleting Kubernetes resources...${NC}"
kubectl delete all --all -n fragrance-palette
kubectl delete pvc --all -n fragrance-palette
kubectl delete configmaps --all -n fragrance-palette
kubectl delete secrets --all -n fragrance-palette

# Wait for cleanup
echo -e "${YELLOW}⏳ Waiting for cleanup...${NC}"
kubectl wait --for=delete pods --all -n fragrance-palette --timeout=60s 2>/dev/null || true

# Optionally delete the namespace
read -p "Do you want to delete the fragrance-palette namespace? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🏷️ Deleting namespace...${NC}"
    kubectl delete namespace fragrance-palette
fi

# Check for any remaining Docker containers
echo -e "\n${YELLOW}🐳 Docker container status:${NC}"
docker ps | grep fragrance || echo "No fragrance containers running"

echo -e "${GREEN}✅ Kubernetes environment stopped${NC}"
echo -e "${BLUE}💡 To restart: ./scripts/start-k8s.sh${NC}"