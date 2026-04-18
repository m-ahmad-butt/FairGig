# grievance-service

## Run locally (without Docker)

1. npm install
2. npm run prisma:generate
3. npm run dev

## Health check

- GET /health

## Community Ranking and Clustering APIs

- GET /community/posts/top
  - Returns vote-based top CommunityPosts.
  - Supported query params:
    - limit (default 10, max 100)
    - platform
    - issue
    - status (pending | approved | rejected)

- GET /community/posts/clusters
  - Returns clustered CommunityPosts using title, platform, issue, and status.
  - Clusters are ranked by combined vote score.
  - Supported query params:
    - max_clusters (default 50, max 100)
    - per_cluster_limit (default 3, max 20)
    - title_similarity_threshold (0 to 1, default 0.35)
    - platform
    - issue
    - status (pending | approved | rejected)

Clustering algorithm summary:

1. Group posts by platform + issue + status.
2. Within each group, cluster titles by token similarity (Jaccard threshold).
3. Compute vote-based ranking per cluster using score = upvotes - downvotes.
4. Return top posts for each cluster.

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
