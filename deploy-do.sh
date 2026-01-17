#!/bin/bash

# DeployHub DigitalOcean Setup Script
# Run this on your fresh Ubuntu 22.04/24.04 Droplet

set -e

echo "🚀 Starting DeployHub Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential nginx certbot python3-certbot-nginx

# 2. Install Node.js 20
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 pnpm

# 3. Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed successfully."
fi

# 4. Clone Repository
echo "📥 Cloning DeployHub..."
# Replace with your repo URL if different
REPO_URL="https://github.com/CodeKage25/deployhub.git"
APP_DIR="/opt/deployhub"

if [ -d "$APP_DIR" ]; then
    echo "Updating existing repo..."
    cd $APP_DIR
    git pull
else
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# 5. Setup Environment
echo "⚙️ Setting up environment..."
if [ ! -f "apps/api/.env" ]; then
    echo "Creating API .env..."
    cat > apps/api/.env << EOL
PORT=3001
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://deployhub.io
MISTRAL_API_KEY=your_key_here
EOL
    echo "⚠️ Please update apps/api/.env with your real MISTRAL_API_KEY!"
fi

# 6. Install Dependencies & Build
echo "🔨 Building DeployHub..."
npm install
npm run build

# 7. Start Services with PM2
echo "🔥 Starting services..."
pm2 start ecosystem.config.js 2>/dev/null || pm2 start "npm run start --workspace=apps/api" --name "deployhub-api"
pm2 start "npm run preview --workspace=apps/web -- --port 3000 --host" --name "deployhub-web"
pm2 save
pm2 startup

# 8. Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/deployhub << EOL
server {
    listen 80;
    server_name deployhub.io;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

sudo ln -sfn /etc/nginx/sites-available/deployhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Deployment Setup Complete!"
echo "Next steps:"
echo "1. Update .env with your real keys"
echo "2. Update Nginx config with your actual domain"
echo "3. Run 'certbot --nginx' to enable HTTPS"
