FROM node:20-slim

# Install curl for yt-dlp download
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download the yt-dlp standalone Linux binary (no Python dependency)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY server-deploy/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY server-deploy/server.js ./

ENV YTDLP_PATH=/usr/local/bin/yt-dlp
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
