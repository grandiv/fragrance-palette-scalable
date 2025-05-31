#!/bin/bash

echo "🧪 Testing Kubernetes Deployment..."

# Check if we're using docker-desktop context
if ! kubectl config current-context | grep -q "docker-desktop"; then
    echo "❌ Not using docker-desktop context"
    exit 1
fi

# Test namespace exists
echo "Testing namespace..."
kubectl get namespace fragrance-palette || echo "❌ Namespace not found"

# Test if all pods are running
echo "Checking pod status..."
RUNNING_PODS=$(kubectl get pods -n fragrance-palette | grep -c "Running")
TOTAL_PODS=$(kubectl get pods -n fragrance-palette --no-headers | wc -l)
echo "Running pods: $RUNNING_PODS/$TOTAL_PODS"

# Test backend health (if port forward is active)
if lsof -i:3001 >/dev/null 2>&1; then
    echo "Testing backend health..."
    curl -f http://localhost:3001/api/health || echo "❌ Backend health check failed"
else
    echo "⚠️  Backend port forward not active, testing with kubectl port-forward..."
    kubectl port-forward service/backend-service 3001:3001 -n fragrance-palette &
    PF_PID=$!
    sleep 5
    curl -f http://localhost:3001/api/health || echo "❌ Backend health check failed"
    kill $PF_PID
fi

# Test frontend (if port forward is active)
if lsof -i:3000 >/dev/null 2>&1; then
    echo "Testing frontend..."
    curl -f http://localhost:3000 || echo "❌ Frontend check failed"
fi

# Test main application (if port forward is active)
if lsof -i:8080 >/dev/null 2>&1; then
    echo "Testing main application..."
    curl -f http://localhost:8080 || echo "❌ Main application check failed"
fi

# Test database connectivity
echo "Testing database..."
kubectl exec -it deployment/postgres-master -n fragrance-palette -- psql -U postgres -d fragrances -c "SELECT 1;" || echo "❌ Database check failed"

# Test Redis
echo "Testing Redis..."
kubectl exec -it deployment/redis-deployment -n fragrance-palette -- redis-cli ping || echo "❌ Redis check failed"

# Test RabbitMQ
echo "Testing RabbitMQ..."
kubectl exec -it deployment/rabbitmq-deployment -n fragrance-palette -- rabbitmqctl status || echo "❌ RabbitMQ check failed"

echo "✅ Kubernetes testing completed!"