# Muhammad Grandiv Lava Putra

# 22/493242/TK/54023

# Arsitektur Perangkat Lunak Kelas B

# A Scalable Architecture

## Fragrance Palette

Home perfumers and fragrance hobbyists often find it challenging to create basic perfume formulations that match their desired scent ideas. The Fragrance-Palette Generator simplifies this process by offering a beginner-friendly approach: users **describe** the kind of **scent** they want (e.g. "fresh citrus with hints of vanilla"), and the system identifies the appropriate fragrance family and suggests a simple **three-note structure** (top, middle, base) with clear **mixing instructions**. This approach makes perfume creation accessible even to beginners without requiring advanced knowledge of ingredient proportions or complex formulation techniques.

## Tech Stack Components:

1. React frontend
2. Express backend
3. Load Balancer with NGINX
4. Orchestration
5. Caching with Redis for session data and formula results
6. Queueing with RabbitMQ for fetching domain knowledge -> generation -> fetching current database
7. PostgreSQL database (1 master for Write operations and 2 replicas for Read operations)
8. Monitoring with Grafana and Prometheus
9. AI inference with Text Generation Inference (TGI) using model Llama3-2-1B
