import { nanoid } from 'nanoid';
import Docker from 'dockerode';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../../db/index.js';
import { deployContainer } from '../deployer/index.js';
import { logEmitter } from '../logEmitter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docker = new Docker();

interface Project {
    id: string;
    name: string;
    repo_url: string;
    branch: string;
    env_vars: string;
    buildpack?: string;
}

interface BuildOptions {
    commitSha?: string;
    commitMessage?: string;
}

interface Buildpack {
    name: string;
    detect: (files: string[]) => boolean;
    dockerfile: (envVars: Record<string, string>) => string;
}

// Buildpack definitions - supports 9 languages/frameworks
const buildpacks: Buildpack[] = [
    {
        name: 'nodejs',
        detect: (files) => files.includes('package.json'),
        dockerfile: (envVars) => `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build --if-present
EXPOSE ${envVars.PORT || 3000}
CMD ["npm", "start"]
`,
    },
    {
        name: 'python',
        detect: (files) => files.includes('requirements.txt') || files.includes('pyproject.toml'),
        dockerfile: (envVars) => `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt* pyproject.toml* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || pip install --no-cache-dir .
COPY . .
EXPOSE ${envVars.PORT || 8000}
CMD ["sh", "-c", "python app.py 2>/dev/null || python main.py 2>/dev/null || python -m uvicorn main:app --host 0.0.0.0 --port \${PORT:-8000}"]
`,
    },
    {
        name: 'go',
        detect: (files) => files.includes('go.mod'),
        dockerfile: (envVars) => `FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o main .
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE ${envVars.PORT || 8080}
CMD ["./main"]
`,
    },
    {
        name: 'ruby',
        detect: (files) => files.includes('Gemfile'),
        dockerfile: (envVars) => `FROM ruby:3.3-slim
WORKDIR /app
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs
COPY Gemfile* ./
RUN bundle install --without development test
COPY . .
RUN if [ -f "Rakefile" ]; then bundle exec rake assets:precompile 2>/dev/null || true; fi
EXPOSE ${envVars.PORT || 3000}
CMD ["sh", "-c", "bundle exec rails server -b 0.0.0.0 -p \${PORT:-3000} 2>/dev/null || bundle exec ruby app.rb"]
`,
    },
    {
        name: 'rust',
        detect: (files) => files.includes('Cargo.toml'),
        dockerfile: (envVars) => `FROM rust:1.75-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY . .
RUN touch src/main.rs && cargo build --release
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/* ./
EXPOSE ${envVars.PORT || 8080}
CMD ["./app"]
`,
    },
    {
        name: 'java',
        detect: (files) => files.includes('pom.xml') || files.includes('build.gradle') || files.includes('build.gradle.kts'),
        dockerfile: (envVars) => `FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN if [ -f "mvnw" ]; then chmod +x mvnw && ./mvnw package -DskipTests; elif [ -f "pom.xml" ]; then apt-get update && apt-get install -y maven && mvn package -DskipTests; elif [ -f "gradlew" ]; then chmod +x gradlew && ./gradlew build -x test; fi
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar 2>/dev/null || true
COPY --from=builder /app/build/libs/*.jar app.jar 2>/dev/null || true
EXPOSE ${envVars.PORT || 8080}
CMD ["java", "-jar", "app.jar"]
`,
    },
    {
        name: 'php',
        detect: (files) => files.includes('composer.json') || files.includes('index.php'),
        dockerfile: () => `FROM php:8.3-apache
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev libfreetype6-dev libzip-dev unzip && docker-php-ext-configure gd --with-freetype --with-jpeg && docker-php-ext-install gd pdo pdo_mysql zip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY . .
RUN if [ -f "composer.json" ]; then composer install --no-dev --optimize-autoloader; fi
RUN chown -R www-data:www-data /var/www/html && a2enmod rewrite
EXPOSE 80
CMD ["apache2-foreground"]
`,
    },
    {
        name: 'elixir',
        detect: (files) => files.includes('mix.exs'),
        dockerfile: (envVars) => `FROM elixir:1.16-alpine AS builder
WORKDIR /app
RUN mix local.hex --force && mix local.rebar --force
ENV MIX_ENV=prod
COPY mix.exs mix.lock ./
COPY config config
RUN mix deps.get --only prod && mix deps.compile
COPY . .
RUN mix compile && mix release
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache libstdc++ openssl ncurses-libs
COPY --from=builder /app/_build/prod/rel/app ./
EXPOSE ${envVars.PORT || 4000}
CMD ["bin/app", "start"]
`,
    },
    {
        name: 'static',
        detect: (files) => files.includes('index.html'),
        dockerfile: () => `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`,
    },
];

// Detect buildpack from files
function detectBuildpack(files: string[]): Buildpack | null {
    for (const bp of buildpacks) {
        if (bp.detect(files)) {
            return bp;
        }
    }
    return null;
}

// Create deployment record
function createDeployment(projectId: string, commitSha?: string): any {
    const id = nanoid();
    db.prepare(`
    INSERT INTO deployments (id, project_id, status, commit_sha)
    VALUES (?, ?, 'building', ?)
  `).run(id, projectId, commitSha || null);

    return db.prepare('SELECT * FROM deployments WHERE id = ?').get(id);
}

// Update deployment status and logs
function updateDeployment(id: string, updates: Partial<{ status: string; logs: string; docker_image: string; container_id: string; port: number; finished_at: string }>) {
    const sets: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
        sets.push(`${key} = ?`);
        values.push(value);
    }

    values.push(id);
    db.prepare(`UPDATE deployments SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

// Append to deployment logs and emit for WebSocket
function appendLog(id: string, message: string) {
    const deployment = db.prepare('SELECT logs FROM deployments WHERE id = ?').get(id) as any;
    const logs = (deployment?.logs || '') + message + '\n';
    db.prepare('UPDATE deployments SET logs = ? WHERE id = ?').run(logs, id);

    // Emit for real-time WebSocket streaming
    logEmitter.emitLog(id, message);
}

// Main build function
export async function triggerBuild(project: Project, options: BuildOptions = {}) {
    const deployment = createDeployment(project.id, options.commitSha);
    const workDir = path.join(__dirname, '../../../.builds', deployment.id);

    // Run build asynchronously
    buildAsync(project, deployment.id, workDir, options).catch((error) => {
        console.error(`Build failed for ${project.name}:`, error);
        updateDeployment(deployment.id, {
            status: 'failed',
            finished_at: new Date().toISOString(),
        });
        appendLog(deployment.id, `❌ Build failed: ${error.message}`);
    });

    return deployment;
}

async function buildAsync(project: Project, deploymentId: string, workDir: string, options: BuildOptions) {
    try {
        appendLog(deploymentId, `🚀 Starting build for ${project.name}`);
        appendLog(deploymentId, `📦 Repository: ${project.repo_url}`);
        appendLog(deploymentId, `🌿 Branch: ${project.branch}`);

        // Create work directory
        await fs.mkdir(workDir, { recursive: true });

        // Clone repository
        appendLog(deploymentId, `\n📥 Cloning repository...`);
        const git = simpleGit();
        await git.clone(project.repo_url, workDir, ['--branch', project.branch, '--depth', '1']);
        appendLog(deploymentId, `✅ Repository cloned`);

        // Remove .git directory (not needed in Docker image, causes tar-fs issues)
        const gitDir = path.join(workDir, '.git');
        try {
            await fs.rm(gitDir, { recursive: true, force: true });
        } catch {
            // Ignore if .git doesn't exist
        }

        // List files for buildpack detection
        const files = await fs.readdir(workDir);
        appendLog(deploymentId, `📂 Files: ${files.filter(f => !f.startsWith('.')).join(', ')}`);

        // Check for existing Dockerfile
        let dockerfilePath = path.join(workDir, 'Dockerfile');
        let buildpackName = 'custom';

        if (!files.includes('Dockerfile')) {
            // Detect and generate Dockerfile
            const buildpack = detectBuildpack(files);
            if (!buildpack) {
                throw new Error('No suitable buildpack found and no Dockerfile present');
            }

            buildpackName = buildpack.name;
            appendLog(deploymentId, `🔍 Detected buildpack: ${buildpackName}`);

            const envVars = JSON.parse(project.env_vars || '{}');
            const dockerfileContent = buildpack.dockerfile(envVars);
            await fs.writeFile(dockerfilePath, dockerfileContent);
            appendLog(deploymentId, `📝 Generated Dockerfile`);
        } else {
            appendLog(deploymentId, `📄 Using existing Dockerfile`);
        }

        // Update project buildpack
        db.prepare('UPDATE projects SET buildpack = ? WHERE id = ?').run(buildpackName, project.id);

        // Build Docker image
        const imageName = `deployhub/${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}:${deploymentId.slice(0, 8)}`;
        appendLog(deploymentId, `\n🐳 Building Docker image: ${imageName}`);
        updateDeployment(deploymentId, { status: 'building' });

        const buildStream = await docker.buildImage(
            { context: workDir, src: ['.'] },
            { t: imageName }
        );

        // Stream build logs
        await new Promise<void>((resolve, reject) => {
            docker.modem.followProgress(
                buildStream,
                (err, result) => {
                    if (err) reject(err);
                    else resolve();
                },
                (event) => {
                    if (event.stream) {
                        const line = event.stream.replace(/\n$/, '');
                        if (line.trim()) {
                            appendLog(deploymentId, line);
                        }
                    }
                    if (event.error) {
                        appendLog(deploymentId, `❌ ${event.error}`);
                    }
                }
            );
        });

        appendLog(deploymentId, `✅ Image built successfully`);
        updateDeployment(deploymentId, { docker_image: imageName });

        // Deploy container
        appendLog(deploymentId, `\n🚢 Deploying container...`);
        updateDeployment(deploymentId, { status: 'deploying' });

        const envVars = JSON.parse(project.env_vars || '{}');
        const containerInfo = await deployContainer(imageName, project.name, envVars);

        appendLog(deploymentId, `✅ Container deployed: ${containerInfo.containerId.slice(0, 12)}`);
        appendLog(deploymentId, `🌐 Running on port: ${containerInfo.port}`);

        updateDeployment(deploymentId, {
            status: 'running',
            container_id: containerInfo.containerId,
            port: containerInfo.port,
            finished_at: new Date().toISOString(),
        });

        appendLog(deploymentId, `\n✨ Deployment complete!`);
        appendLog(deploymentId, `🔗 Access at: http://localhost:${containerInfo.port}`);

        // Notify WebSocket clients that build is complete
        logEmitter.emitStatus(deploymentId, 'running');

        // Cleanup work directory
        await fs.rm(workDir, { recursive: true, force: true });

    } catch (error: any) {
        appendLog(deploymentId, `\n❌ Build failed: ${error.message}`);
        updateDeployment(deploymentId, {
            status: 'failed',
            finished_at: new Date().toISOString(),
        });

        // Notify WebSocket clients that build failed
        logEmitter.emitStatus(deploymentId, 'failed');

        // Cleanup on failure
        try {
            await fs.rm(workDir, { recursive: true, force: true });
        } catch { }

        throw error;
    }
}
