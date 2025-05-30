# Muhammad Grandiv Lava Putra

# 22/493242/TK/54023

# Arsitektur Perangkat Lunak Kelas B

# A Scalable Architecture

## Fragrance Palette

Home perfumers and fragrance hobbyists often find it challenging to create basic perfume formulations that match their desired scent ideas. The Fragrance-Palette Generator simplifies this process by offering a beginner-friendly approach: users **describe** the kind of **scent** they want (e.g. "fresh citrus with hints of vanilla"), and the system identifies the appropriate fragrance family and suggests a simple **three-note structure** (top, middle, base) with clear **mixing instructions**. This approach makes perfume creation accessible even to beginners without requiring advanced knowledge of ingredient proportions or complex formulation techniques.

## Tech Stack Components:

1. React frontend
2. Express backend
3. Content Delivery Network with Cloudflare for static assets in landing page
4. Load Balancer with NGINX
5. Orchestration with Kubernetes
6. Caching with Redis for session data and formula results
7. Queueing with RabbitMQ for fetching domain knowledge -> generation -> fetching current database
8. PostgreSQL database (1 master for Write operations and 2 replicas for Read operations)
9. Monitoring with Grafana and Prometheus
10. AI inference with Text Generation Inference (TGI) using model Llama3-2-1B

## Local Testing (26/05 #1):

1. Run Text Generation Inference (TGI) on port 8080:80
2. Run Redis on port 6379:6379
3. Run RabbitMQ on port 5672:5672
4. Run `cd backend` and `npm start` on terminal
5. Run `cd ../frontend` and `npm run dev` again

## Local Testing with Docker-Compose (26/05 #2)

### Added script for orchestration with docker-compose

1. Run on terminal `./scripts/start-local.sh`
2. Make sure you have:
   - `.env` in root with `HUGGINGFACE_HUB_TOKEN` and `HF_TOKEN`
   - `.env` in `frontend` folder containing `NEXT_PUBLIC_API_URL=http://localhost:3001`
   - `.env` in `backend` folder containing `DATABASE_URL`, `DATABASE_URL_MASTER`, `DATABASE_URL_REPLICA`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `JWT_SECRET`, `LLM_URL`, `PORT`, `RABBITMQ_URL`, `REDIS_URL`, and `FRONTEND_URL`
3. To check the status of the services, run `./scripts/status-local.sh`
4. To stop the services run `./scripts/stop-local.sh`

### TODO:

1. Orchestrate in Kubernetes
2. Making sure webservers and replicas are working
