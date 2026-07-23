FROM node:20-bookworm-slim

# Install FFMPEG, Python 3, pip, and OpenCV dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install OpenCV for Python (using break-system-packages because this is a dedicated container)
RUN pip3 install opencv-python --break-system-packages

WORKDIR /app

# Install Node dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy source code and scripts
COPY . .

# Expose port
EXPOSE 8080

# Run the server
CMD ["node", "server.js"]
