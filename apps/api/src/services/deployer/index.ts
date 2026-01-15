import Docker from 'dockerode';

const docker = new Docker();

// Port allocation tracker
let nextPort = 4000;
const usedPorts = new Set<number>();

function allocatePort(): number {
    while (usedPorts.has(nextPort)) {
        nextPort++;
        if (nextPort > 5000) nextPort = 4000;
    }
    usedPorts.add(nextPort);
    return nextPort++;
}

export function releasePort(port: number) {
    usedPorts.delete(port);
}

interface ContainerInfo {
    containerId: string;
    port: number;
}

export async function deployContainer(
    imageName: string,
    projectName: string,
    envVars: Record<string, string> = {}
): Promise<ContainerInfo> {
    const port = allocatePort();
    const containerName = `deployhub-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    // Stop and remove any existing container with similar name
    try {
        const containers = await docker.listContainers({ all: true });
        for (const containerInfo of containers) {
            if (containerInfo.Names.some(n => n.includes(`deployhub-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`))) {
                const container = docker.getContainer(containerInfo.Id);
                try {
                    await container.stop();
                } catch { }
                await container.remove();
            }
        }
    } catch (error) {
        // Ignore errors when cleaning up
    }

    // Create environment variables array
    const envArray = Object.entries(envVars).map(([key, value]) => `${key}=${value}`);
    envArray.push(`PORT=${port}`);

    // Determine exposed port from image
    let exposedPort = port;
    try {
        const image = docker.getImage(imageName);
        const imageInfo = await image.inspect();
        const exposedPorts = imageInfo.Config.ExposedPorts;
        if (exposedPorts) {
            const firstPort = Object.keys(exposedPorts)[0];
            if (firstPort) {
                exposedPort = parseInt(firstPort.split('/')[0], 10);
            }
        }
    } catch { }

    // Create and start container
    const container = await docker.createContainer({
        Image: imageName,
        name: containerName,
        Env: envArray,
        ExposedPorts: {
            [`${exposedPort}/tcp`]: {},
        },
        HostConfig: {
            PortBindings: {
                [`${exposedPort}/tcp`]: [{ HostPort: String(port) }],
            },
            RestartPolicy: {
                Name: 'unless-stopped',
            },
        },
        Labels: {
            'deployhub.managed': 'true',
            'deployhub.project': projectName,
        },
    });

    await container.start();

    // Wait for container to be healthy
    await waitForHealth(container.id, port);

    return {
        containerId: container.id,
        port,
    };
}

async function waitForHealth(containerId: string, port: number, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const container = docker.getContainer(containerId);
            const info = await container.inspect();

            if (info.State.Running) {
                // Try to connect to the port
                const response = await fetch(`http://localhost:${port}`, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(1000),
                }).catch(() => null);

                if (response) {
                    return; // Container is responding
                }
            }
        } catch { }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Don't throw - container might still be starting
    console.log(`Container ${containerId} health check timed out, but continuing...`);
}

export async function stopContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);

    try {
        const info = await container.inspect();

        // Release port
        if (info.HostConfig.PortBindings) {
            for (const ports of Object.values(info.HostConfig.PortBindings)) {
                for (const binding of ports as any[]) {
                    if (binding.HostPort) {
                        releasePort(parseInt(binding.HostPort, 10));
                    }
                }
            }
        }

        await container.stop();
        await container.remove();
    } catch (error) {
        console.error(`Error stopping container ${containerId}:`, error);
    }
}

export async function restartContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.restart();
}

export async function getContainerLogs(containerId: string, tail = 100): Promise<string> {
    const container = docker.getContainer(containerId);

    const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
    });

    return logs.toString();
}

export async function listManagedContainers() {
    const containers = await docker.listContainers({
        all: true,
        filters: {
            label: ['deployhub.managed=true'],
        },
    });

    return containers.map((c) => ({
        id: c.Id,
        name: c.Names[0]?.replace('/', ''),
        project: c.Labels['deployhub.project'],
        status: c.State,
        ports: c.Ports,
    }));
}
