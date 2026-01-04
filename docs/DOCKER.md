# Docker Optimization Guide

**Last Updated:** January 4, 2026
**Docker Image Version:** 2.0 (Optimized)

---

## Overview

The DigiByte Rosetta Server Docker image has been significantly optimized for production use with multi-stage builds, security improvements, and reduced image size.

### Key Improvements

**Version 2.0 Optimizations (January 2026):**
- ✅ **Multi-stage build** - Separates build and runtime environments
- ✅ **Node.js 20 LTS** - Upgraded from Node.js 14
- ✅ **Non-root user** - Runs as unprivileged `rosetta` user (UID 1000)
- ✅ **Smaller image size** - Removed build tools from final image
- ✅ **Better layer caching** - Optimized layer order for faster rebuilds
- ✅ **Security hardening** - Minimal attack surface, no unnecessary packages
- ✅ **Health checks** - Built-in container health monitoring
- ✅ **Production-ready** - `NODE_ENV=production` by default

---

## Build Architecture

### Three-Stage Build Process

#### Stage 1: Build DigiByte Core
- Compiles DigiByte Core from source
- Includes all build dependencies
- **Not included in final image** - only binaries are copied

#### Stage 2: Build Node.js Dependencies
- Installs Node.js production dependencies
- Uses `npm ci --only=production` for reproducible builds
- **Not included in final image** - only node_modules copied

#### Stage 3: Runtime Image
- Minimal Ubuntu base with runtime dependencies only
- Copies binaries from Stage 1
- Copies node_modules from Stage 2
- Runs as non-root user
- Final production-ready image

---

## Building the Image

### Basic Build (Mainnet)

```bash
docker build -t digibyte/rosetta:latest .
```

### Build with Options

```bash
# Mainnet with parallel build (faster on multi-core systems)
docker build -t digibyte/rosetta:mainnet \
  --build-arg parallize_build=4 \
  .

# Testnet
docker build -t digibyte/rosetta:testnet \
  --build-arg use_testnet=1 \
  --build-arg parallize_build=4 \
  .

# Regtest with simulated mining
docker build -t digibyte/rosetta:regtest \
  --build-arg use_regtest=1 \
  --build-arg regtest_simulate_mining=1 \
  --build-arg parallize_build=4 \
  .

# Custom DigiByte Core version
docker build -t digibyte/rosetta:v8.22.3 \
  --build-arg dgb_version=v8.22.3 \
  .
```

### Build Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `dgb_version` | `v8.22.2` | DigiByte Core version to build |
| `parallize_build` | `0` | Number of CPU cores for compilation (0 = single core) |
| `use_testnet` | `0` | Enable testnet mode (1 = enabled) |
| `use_regtest` | `0` | Enable regtest mode (1 = enabled) |
| `regtest_simulate_mining` | `0` | Simulate mining in regtest (1 = enabled) |
| `rpc_username` | `user` | RPC username |
| `rpc_password` | `pass` | RPC password |
| `prunesize` | `0` | Blockchain pruning in MB (0 = disabled) |
| `local_timezone` | `Europe/Berlin` | Container timezone |

---

## Running the Container

### Mainnet

```bash
docker run -d \
  --name digibyte-rosetta \
  -p 8080:8080 \
  -p 12024:12024 \
  -v digibyte-data:/data \
  digibyte/rosetta:latest
```

### Testnet

```bash
docker run -d \
  --name digibyte-rosetta-testnet \
  -p 8080:8080 \
  -p 12026:12026 \
  -v digibyte-testnet-data:/data \
  digibyte/rosetta:testnet
```

### Regtest (Development)

```bash
docker run -d \
  --name digibyte-rosetta-regtest \
  -p 8080:8080 \
  -p 18444:18444 \
  -v digibyte-regtest-data:/data \
  digibyte/rosetta:regtest
```

### Production Best Practices

```bash
docker run -d \
  --name digibyte-rosetta \
  --restart unless-stopped \
  --memory 8g \
  --cpus 4 \
  -p 8080:8080 \
  -p 12024:12024 \
  -v digibyte-data:/data \
  -v digibyte-utxo:/data/utxodb \
  --health-cmd="curl -f http://localhost:8080/network/list -X POST -H 'Content-Type: application/json' -d '{\"metadata\":{}}' || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  digibyte/rosetta:latest
```

---

## Security Features

### Non-Root User

The container runs as the `rosetta` user (UID 1000) instead of root:

```dockerfile
USER rosetta
WORKDIR /home/rosetta/rosetta-node
```

**Benefits:**
- Reduced attack surface
- Limited filesystem access
- Principle of least privilege
- Compliant with security best practices

### File Permissions

All application files are owned by `rosetta:rosetta`:

```bash
# Check ownership in running container
docker exec digibyte-rosetta ls -la /home/rosetta/rosetta-node
```

### Health Checks

Built-in health monitoring:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' digibyte-rosetta

# View health check logs
docker inspect --format='{{json .State.Health}}' digibyte-rosetta | jq
```

---

## Volume Management

### Recommended Volumes

```bash
# Create named volumes for persistence
docker volume create digibyte-data
docker volume create digibyte-utxo

# Run with volumes
docker run -d \
  -v digibyte-data:/data/.digibyte \
  -v digibyte-utxo:/data/utxodb \
  digibyte/rosetta:latest
```

### Data Persistence

| Path | Purpose | Size (Mainnet) |
|------|---------|----------------|
| `/data/.digibyte` | DigiByte blockchain data | ~60GB |
| `/data/utxodb` | UTXO index (LevelDB) | ~16GB |
| `/data/.digibyte/digibyte.conf` | Node configuration | <1KB |

### Backup Recommendations

```bash
# Stop container before backup
docker stop digibyte-rosetta

# Backup volumes
docker run --rm \
  -v digibyte-data:/source \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/digibyte-data-$(date +%Y%m%d).tar.gz -C /source .

docker run --rm \
  -v digibyte-utxo:/source \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/digibyte-utxo-$(date +%Y%m%d).tar.gz -C /source .

# Restart container
docker start digibyte-rosetta
```

---

## Performance Optimization

### Resource Limits

```bash
# Recommended for mainnet
docker run -d \
  --memory 8g \
  --memory-swap 10g \
  --cpus 4 \
  --pids-limit 1000 \
  digibyte/rosetta:latest
```

### Build Performance

```bash
# Use build cache from previous builds
docker build --cache-from digibyte/rosetta:latest \
  -t digibyte/rosetta:latest .

# Parallel compilation (requires sufficient RAM)
docker build --build-arg parallize_build=8 \
  --memory 16g \
  -t digibyte/rosetta:latest .
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs digibyte-rosetta

# Check specific service
docker exec digibyte-rosetta digibyte-cli -rpcuser=user -rpcpassword=pass getblockchaininfo
```

### Permission Issues

```bash
# If data directory has wrong permissions
docker exec -u root digibyte-rosetta chown -R rosetta:rosetta /data
```

### Health Check Failures

```bash
# Manual health check test
docker exec digibyte-rosetta curl -f http://localhost:8080/network/list \
  -X POST -H "Content-Type: application/json" -d '{"metadata":{}}'

# Check Node.js process
docker exec digibyte-rosetta ps aux | grep node
```

### Rebuild from Scratch

```bash
# Remove old image and build caches
docker rmi digibyte/rosetta:latest
docker builder prune -af

# Fresh build
docker build --no-cache -t digibyte/rosetta:latest .
```

---

## Migration from v1.0

### Breaking Changes

1. **User**: Container now runs as `rosetta` (UID 1000) instead of `root`
2. **Paths**: Application moved from `/root/rosetta-node` to `/home/rosetta/rosetta-node`
3. **Node.js**: Upgraded from v14 to v20 LTS
4. **Environment**: Set `/home/rosetta/env` instead of `~/env`

### Migration Steps

```bash
# Stop old container
docker stop digibyte-rosetta-old

# Backup data
docker cp digibyte-rosetta-old:/data ./backup-data

# Build new image
docker build -t digibyte/rosetta:v2 .

# Fix permissions on existing volume
docker run --rm -v digibyte-data:/data ubuntu chown -R 1000:1000 /data

# Start new container
docker run -d \
  --name digibyte-rosetta \
  -p 8080:8080 \
  -v digibyte-data:/data \
  digibyte/rosetta:v2
```

---

## Image Size Comparison

| Version | Size | Notes |
|---------|------|-------|
| v1.0 (Old) | ~2.5GB | Single-stage, includes build tools |
| v2.0 (New) | ~1.2GB | Multi-stage, runtime only |
| **Reduction** | **~52%** | Faster pulls, less storage |

---

## Additional Resources

- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Project Documentation](./PROJECT_STRUCTURE.md)
- [Local Setup Guide](./LOCAL_SETUP.md)
