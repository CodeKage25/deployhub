#!/bin/bash

# DeployHub VPS Setup Script
# Run this on a fresh Ubuntu 22.04+ VPS

set -e

echo "🚀 DeployHub VPS Setup"
echo "======================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./setup-vps.sh)${NC}"
    exit 1
fi

# Get domain from user
read -p "Enter your domain (e.g., deployhub.yourdomain.com) [or press Enter for IP only]: " DOMAIN
read -p "Enter your email for SSL certificates: " EMAIL

echo ""
echo -e "${GREEN}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${GREEN}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${YELLOW}Docker already installed${NC}"
fi

echo ""
echo -e "${GREEN}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose-plugin
    # Also install standalone for compatibility
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${YELLOW}Docker Compose already installed${NC}"
fi

echo ""
echo -e "${GREEN}Step 4: Installing Git...${NC}"
apt install -y git

echo ""
echo -e "${GREEN}Step 5: Creating app directory...${NC}"
mkdir -p /opt/deployhub
cd /opt/deployhub

echo ""
echo -e "${GREEN}Step 6: Cloning DeployHub...${NC}"
if [ -d "/opt/deployhub/.git" ]; then
    git pull
else
    # If running from the repo, copy files instead
    if [ -f "./docker-compose.yml" ]; then
        cp -r ./* /opt/deployhub/
    else
        echo -e "${YELLOW}Please copy your DeployHub files to /opt/deployhub/${NC}"
        echo "Run: scp -r /path/to/deployhub/* root@your-server:/opt/deployhub/"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Step 7: Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "JWT_SECRET=$JWT_SECRET" > .env
    echo -e "${GREEN}✅ Generated JWT secret${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

echo ""
echo -e "${GREEN}Step 8: Creating directories...${NC}"
mkdir -p certbot/www certbot/conf

echo ""
echo -e "${GREEN}Step 9: Starting DeployHub...${NC}"
docker-compose up -d --build

echo ""
echo -e "${GREEN}Step 10: Waiting for services to start...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ DeployHub is running!${NC}"
else
    echo -e "${RED}❌ Something went wrong. Check logs with: docker-compose logs${NC}"
    exit 1
fi

# SSL Setup
if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
    echo ""
    echo -e "${GREEN}Step 11: Setting up SSL...${NC}"
    
    # Get initial certificate
    docker-compose run --rm certbot certonly --webroot \
        --webroot-path /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # Update nginx.conf with domain
    sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf
    
    # Uncomment HTTPS config in nginx.conf
    sed -i 's/# server {/server {/g' nginx.conf
    sed -i 's/#     listen 443/    listen 443/g' nginx.conf
    sed -i 's/#     server_name/    server_name/g' nginx.conf
    sed -i 's/#     ssl_/    ssl_/g' nginx.conf
    sed -i 's/#     add_header/    add_header/g' nginx.conf
    sed -i 's/#     location/    location/g' nginx.conf
    sed -i 's/#         proxy_/        proxy_/g' nginx.conf
    sed -i 's/# }/}/g' nginx.conf
    
    # Enable HTTP to HTTPS redirect
    sed -i 's/# location \/ {/location \/ {/g' nginx.conf
    sed -i 's/#     return 301/    return 301/g' nginx.conf
    
    # Restart nginx
    docker-compose restart nginx
    
    echo -e "${GREEN}✅ SSL configured for $DOMAIN${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 DeployHub Setup Complete!${NC}"
echo "========================================"
echo ""
if [ -n "$DOMAIN" ]; then
    echo -e "Access your DeployHub at: ${GREEN}https://$DOMAIN${NC}"
else
    echo -e "Access your DeployHub at: ${GREEN}http://$(curl -s ifconfig.me):80${NC}"
fi
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Restart:       docker-compose restart"
echo "  Stop:          docker-compose down"
echo "  Update:        git pull && docker-compose up -d --build"
echo ""
