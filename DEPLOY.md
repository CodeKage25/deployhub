# Deploying DeployHub (Full Production)

This guide deploys DeployHub with **full functionality** including building and deploying user projects.

## Prerequisites

- A VPS with **Ubuntu 22.04+** (DigitalOcean, Hetzner, Linode, etc.)
- Minimum: 1 vCPU, 1GB RAM, 25GB disk (~$5-6/month)
- Optional: A domain name

## Option 1: Quick Setup (Recommended)

### 1. Create a VPS

**DigitalOcean** (recommended):
1. Go to [digitalocean.com](https://digitalocean.com)
2. Create Droplet → Ubuntu 22.04 → Basic → $6/mo
3. Copy your droplet's IP address

**Hetzner** (cheapest):
1. Go to [hetzner.com/cloud](https://hetzner.com/cloud)
2. Create Server → Ubuntu 22.04 → CX11 → €3.79/mo

### 2. Upload DeployHub to Server

```bash
# From your local machine
scp -r /Users/mac/Downloads/deployhub root@YOUR_SERVER_IP:/opt/
```

### 3. SSH and Run Setup

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Go to deployhub directory
cd /opt/deployhub

# Make setup script executable
chmod +x setup-vps.sh

# Run setup (will install everything)
./setup-vps.sh
```

The script will:
- Install Docker & Docker Compose
- Generate a secure JWT secret
- Build and start DeployHub
- Optionally configure SSL

### 4. Access DeployHub

Open in browser: `http://YOUR_SERVER_IP`

---

## Option 2: Manual Setup

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

### 2. Clone/Upload DeployHub

```bash
mkdir -p /opt/deployhub
cd /opt/deployhub
# Upload your files here
```

### 3. Create Environment File

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
```

### 4. Start with Docker Compose

```bash
docker-compose up -d --build
```

---

## Adding SSL (HTTPS)

### With a Domain

1. Point your domain to the server IP (A record)

2. Get SSL certificate:
```bash
docker-compose run --rm certbot certonly --webroot \
    --webroot-path /var/www/certbot \
    --email your@email.com \
    --agree-tos \
    -d your-domain.com
```

3. Update `nginx.conf`:
   - Replace `your-domain.com` with your domain
   - Uncomment the HTTPS server block
   - Enable HTTP→HTTPS redirect

4. Restart nginx:
```bash
docker-compose restart nginx
```

---

## Useful Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f deployhub

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Update DeployHub
git pull
docker-compose up -d --build

# Check running containers
docker ps
```

---

## Firewall Setup (Optional but Recommended)

```bash
ufw allow 22     # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw enable
```

---

## What Works

✅ User authentication (register/login)
✅ Dashboard & project management
✅ **Building & deploying user projects** (Docker)
✅ Deployment logs
✅ Environment variables
✅ IaC Visualizer (Terraform/CloudFormation)
✅ Waitlist signup
✅ SSL/HTTPS support

---

## Troubleshooting

### Build fails with "Docker socket" error
```bash
# Ensure Docker socket is accessible
ls -la /var/run/docker.sock
chmod 666 /var/run/docker.sock
```

### Container not starting
```bash
docker-compose logs deployhub
```

### Port already in use
```bash
lsof -i :3001
kill -9 <PID>
```

### SSL certificate issues
```bash
# Check certificate status
docker-compose run --rm certbot certificates

# Force renew
docker-compose run --rm certbot renew --force-renewal
```

---

## Scaling (Future)

For handling more users/deployments:
- Upgrade VPS (more RAM/CPU)
- Use external PostgreSQL instead of SQLite
- Add container orchestration (Docker Swarm/K8s)
