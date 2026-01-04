# ============================================================================
# Stage 1: Build DigiByte Core
# ============================================================================
FROM ubuntu:focal AS digibyte-builder

ARG dgb_version=v8.22.2
ARG arch=x86_64
ARG parallize_build=0

WORKDIR /build

# Install build dependencies
RUN DEBIAN_FRONTEND="noninteractive" apt-get update \
  && apt-get install -y --no-install-recommends \
    wget \
    git \
    build-essential \
    libtool \
    autotools-dev \
    automake \
    pkg-config \
    libssl-dev \
    libevent-dev \
    bsdmainutils \
    python3 \
    libboost-system-dev \
    libboost-filesystem-dev \
    libboost-chrono-dev \
    libboost-test-dev \
    libboost-thread-dev \
    libdb-dev \
    libdb++-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Clone and build DigiByte Core
RUN git clone https://github.com/DigiByte-Core/digibyte/ --branch ${dgb_version} --single-branch \
  && cd digibyte \
  && ./autogen.sh \
  && ./configure --without-gui --with-incompatible-bdb \
  && make $([ "$parallize_build" -gt 1 ] && echo "-j $(nproc)" || echo "") \
  && make install

# ============================================================================
# Stage 2: Build Node.js dependencies
# ============================================================================
FROM ubuntu:focal AS node-builder

# Install Node.js 20 LTS
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for dependency installation (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production \
  && npm cache clean --force

# ============================================================================
# Stage 3: Runtime image
# ============================================================================
FROM ubuntu:focal

ARG local_timezone=Europe/Berlin
ARG rpc_username=user
ARG rpc_password=pass
ARG offline=0
ARG use_testnet=0
ARG use_regtest=0
ARG regtest_simulate_mining=0
ARG prunesize=0

# Install runtime dependencies only
RUN DEBIAN_FRONTEND="noninteractive" apt-get update \
  && apt-get install -y --no-install-recommends \
    tzdata \
    curl \
    ca-certificates \
    libboost-system1.71.0 \
    libboost-filesystem1.71.0 \
    libboost-chrono1.71.0 \
    libboost-thread1.71.0 \
    libevent-2.1-7 \
    libdb5.3++ \
  && ln -fs /usr/share/zoneinfo/${local_timezone} /etc/localtime \
  && dpkg-reconfigure --frontend noninteractive tzdata \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS (runtime only)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash rosetta \
  && mkdir -p /data/.digibyte /data/utxodb \
  && chown -R rosetta:rosetta /data

# Copy DigiByte binaries from builder stage
COPY --from=digibyte-builder /usr/local/bin/digibyted /usr/local/bin/
COPY --from=digibyte-builder /usr/local/bin/digibyte-cli /usr/local/bin/

# Copy Node.js dependencies from builder stage
COPY --from=node-builder --chown=rosetta:rosetta /app/node_modules /home/rosetta/rosetta-node/node_modules

# Copy application code
COPY --chown=rosetta:rosetta package*.json /home/rosetta/rosetta-node/
COPY --chown=rosetta:rosetta config /home/rosetta/rosetta-node/config
COPY --chown=rosetta:rosetta index.js /home/rosetta/rosetta-node/index.js
COPY --chown=rosetta:rosetta src /home/rosetta/rosetta-node/src
COPY --chown=rosetta:rosetta test /home/rosetta/rosetta-node/test

# Create digibyte.conf
RUN echo "server=1" > /data/.digibyte/digibyte.conf \
  && echo "prune=${prunesize}" >> /data/.digibyte/digibyte.conf \
  && echo "maxconnections=865" >> /data/.digibyte/digibyte.conf \
  && echo "rpcallowip=127.0.0.1" >> /data/.digibyte/digibyte.conf \
  && echo "daemon=1" >> /data/.digibyte/digibyte.conf \
  && echo "rpcuser=${rpc_username}" >> /data/.digibyte/digibyte.conf \
  && echo "rpcpassword=${rpc_password}" >> /data/.digibyte/digibyte.conf \
  && echo "txindex=0" >> /data/.digibyte/digibyte.conf \
  && echo "# Uncomment below if you need Dandelion disabled for any reason" >> /data/.digibyte/digibyte.conf \
  && echo "# dandelion=0" >> /data/.digibyte/digibyte.conf \
  && echo "addresstype=bech32" >> /data/.digibyte/digibyte.conf \
  && echo "testnet=${use_testnet}" >> /data/.digibyte/digibyte.conf \
  && echo "rpcworkqueue=100" >> /data/.digibyte/digibyte.conf \
  && echo "regtest=${use_regtest}" >> /data/.digibyte/digibyte.conf \
  && echo "[regtest]" >> /data/.digibyte/digibyte.conf \
  && echo "rpcbind=127.0.0.1" >> /data/.digibyte/digibyte.conf \
  && echo "listen=1" >> /data/.digibyte/digibyte.conf \
  && chown rosetta:rosetta /data/.digibyte/digibyte.conf

# Set environment variables
ENV ROOTDATADIR="/data"
ENV ROSETTADIR="/home/rosetta/rosetta-node"
ENV DGB_VERSION="${dgb_version}"
ENV PORT="8080"
ENV HOST="0.0.0.0"
ENV DATA_PATH="/data/utxodb"
ENV RPC_USER="${rpc_username}"
ENV RPC_PASS="${rpc_password}"
ENV OFFLINE_MODE="${offline}"
ENV RUN_TESTS="1"
ENV NODE_ENV="production"

# Set network-specific environment variables
RUN if [ "$use_testnet" = "0" ] && [ "$use_regtest" = "0" ]; then \
      echo 'export RPC_PORT="14022"' >> /home/rosetta/env; \
      echo 'export DGB_NETWORK="livenet"' >> /home/rosetta/env; \
    elif [ "$use_testnet" = "1" ] && [ "$use_regtest" = "0" ]; then \
      echo 'export RPC_PORT="14023"' >> /home/rosetta/env; \
      echo 'export DGB_NETWORK="testnet"' >> /home/rosetta/env; \
    elif [ "$use_testnet" = "0" ] && [ "$use_regtest" = "1" ]; then \
      echo 'export RPC_PORT="18443"' >> /home/rosetta/env; \
      echo 'export DGB_NETWORK="regtest"' >> /home/rosetta/env; \
      echo "export REGTEST_SIMULATE_MINING=\"$regtest_simulate_mining\"" >> /home/rosetta/env; \
    else \
      echo 'export RPC_PORT=""' >> /home/rosetta/env; \
      echo 'export DGB_NETWORK=""' >> /home/rosetta/env; \
    fi \
  && chown rosetta:rosetta /home/rosetta/env

# Expose ports
# p2p mainnet, rpc mainnet, p2p testnet, rpc testnet, p2p regtest, rpc regtest, Rosetta HTTP
EXPOSE 12024/tcp 14022/tcp 12026/tcp 14023/tcp 18444/tcp 18443/tcp 8080/tcp

# Copy entrypoint script
COPY --chown=rosetta:rosetta docker-entrypoint.sh /home/rosetta/docker_entrypoint.sh
RUN chmod +x /home/rosetta/docker_entrypoint.sh

# Switch to non-root user
USER rosetta
WORKDIR /home/rosetta/rosetta-node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/network/list -X POST -H "Content-Type: application/json" -d '{"metadata":{}}' || exit 1

ENTRYPOINT ["/home/rosetta/docker_entrypoint.sh"]
