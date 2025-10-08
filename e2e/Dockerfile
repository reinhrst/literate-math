# Use appropriate base image based on architecture
ARG TARGETARCH
FROM --platform=linux/${TARGETARCH} mcr.microsoft.com/playwright:v1.48.0-jammy

# Install dependencies for Obsidian (Electron app) and AppImage extraction
RUN apt-get update && apt-get install -y \
    wget \
    xvfb \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    libxss1 \
    libxtst6 \
    fuse \
    libfuse2 \
    file \
    squashfs-tools \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/lib/aarch64-linux-gnu/libz.so.1 /usr/lib/aarch64-linux-gnu/libz.so

# Download and install Obsidian AppImage (ARM64 or AMD64)
ARG OBSIDIAN_VERSION=1.7.7
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        wget -O /opt/obsidian.AppImage "https://github.com/obsidianmd/obsidian-releases/releases/download/v${OBSIDIAN_VERSION}/Obsidian-${OBSIDIAN_VERSION}-arm64.AppImage"; \
    else \
        wget -O /opt/obsidian.AppImage "https://github.com/obsidianmd/obsidian-releases/releases/download/v${OBSIDIAN_VERSION}/Obsidian-${OBSIDIAN_VERSION}.AppImage"; \
    fi

# Extract AppImage (requires FUSE or --appimage-extract will use built-in extractor)
# AppImage may fail to run but still extract successfully
RUN cd /opt \
    && chmod +x obsidian.AppImage \
    && (./obsidian.AppImage --appimage-extract || echo "AppImage extraction attempted") \
    && ls -la \
    && test -d squashfs-root \
    && mv squashfs-root obsidian \
    && rm obsidian.AppImage \
    && ln -s /opt/obsidian/obsidian /usr/local/bin/obsidian \
    && ls -la /usr/local/bin/obsidian

# Set working directory
WORKDIR /workspace

# Set display for Xvfb
ENV DISPLAY=:99

# Default command (can be overridden)
CMD ["/bin/bash"]
