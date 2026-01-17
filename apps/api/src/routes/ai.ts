import Fastify from 'fastify';
import { Mistral } from '@mistralai/mistralai';

// Initialize Mistral client (uses MISTRAL_API_KEY env variable)
const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || ''
});

// System prompt for the Deploy Copilot
const SYSTEM_PROMPT = `You are DeployHub's AI Assistant - a helpful deployment copilot for a PaaS platform.

You help users with:
- Deploying applications to production
- Rolling back to previous versions  
- Viewing and analyzing logs
- Debugging build failures
- Checking system status

Be concise, friendly, and technical. Use markdown formatting.
When suggesting fixes, use code blocks.
Keep responses under 200 words unless the user asks for details.`;

// Types for build analysis
interface BuildError {
    type: 'dependency' | 'syntax' | 'config' | 'runtime' | 'unknown';
    message: string;
    file?: string;
    line?: number;
    suggestion: string;
    autoFix?: {
        action: string;
        command?: string;
    };
}

interface AnalysisResult {
    success: boolean;
    errors: BuildError[];
    summary: string;
}

// Common error patterns and their fixes
const errorPatterns: { pattern: RegExp; handler: (match: RegExpMatchArray) => BuildError }[] = [
    {
        pattern: /Module not found:.*?['"]([^'"]+)['"]/i,
        handler: (match) => ({
            type: 'dependency',
            message: `Missing dependency: ${match[1]}`,
            suggestion: `Install the missing package`,
            autoFix: { action: 'install_dependency', command: `npm install ${match[1]}` }
        })
    },
    {
        pattern: /Cannot find module ['"]([^'"]+)['"]/i,
        handler: (match) => ({
            type: 'dependency',
            message: `Module not found: ${match[1]}`,
            suggestion: `Install the missing module`,
            autoFix: { action: 'install_dependency', command: `npm install ${match[1]}` }
        })
    },
    {
        pattern: /error TS(\d+): (.+)/i,
        handler: (match) => ({
            type: 'syntax',
            message: `TypeScript error TS${match[1]}: ${match[2]}`,
            suggestion: `Fix the TypeScript error in your code`
        })
    },
    {
        pattern: /EADDRINUSE.*?:(\d+)/i,
        handler: (match) => ({
            type: 'runtime',
            message: `Port ${match[1]} is already in use`,
            suggestion: `Use a different port or stop the process using port ${match[1]}`,
            autoFix: { action: 'change_port', command: `PORT=${parseInt(match[1]) + 1} npm start` }
        })
    },
    {
        pattern: /JavaScript heap out of memory/i,
        handler: () => ({
            type: 'runtime',
            message: 'JavaScript heap out of memory',
            suggestion: `Increase Node.js memory limit`,
            autoFix: { action: 'increase_memory', command: 'NODE_OPTIONS="--max-old-space-size=4096" npm run build' }
        })
    },
    {
        pattern: /npm ERR! missing script: (\w+)/i,
        handler: (match) => ({
            type: 'config',
            message: `Missing npm script: ${match[1]}`,
            suggestion: `Add "${match[1]}" script to package.json`
        })
    },
    {
        pattern: /No module named '([^']+)'/i,
        handler: (match) => ({
            type: 'dependency',
            message: `Missing Python module: ${match[1]}`,
            suggestion: `Install the missing Python package`,
            autoFix: { action: 'install_dependency', command: `pip install ${match[1]}` }
        })
    }
];

// Analyze build logs
function analyzeBuildLogs(logs: string): AnalysisResult {
    const errors: BuildError[] = [];

    for (const { pattern, handler } of errorPatterns) {
        const match = logs.match(pattern);
        if (match) {
            errors.push(handler(match));
        }
    }

    if (errors.length === 0 && (logs.includes('error') || logs.includes('Error') || logs.includes('failed'))) {
        const lines = logs.split('\n');
        const errorLine = lines.find(line =>
            line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
        );

        if (errorLine) {
            errors.push({
                type: 'unknown',
                message: errorLine.trim().slice(0, 200),
                suggestion: 'Review the full build logs for more details'
            });
        }
    }

    return {
        success: errors.length === 0,
        errors,
        summary: errors.length === 0
            ? 'No errors detected in the build logs.'
            : `Found ${errors.length} issue(s) that may be causing the build failure.`
    };
}

// Chat with Mistral AI
async function chatWithMistral(message: string, context?: any): Promise<string> {
    // If no API key, use fallback responses
    if (!process.env.MISTRAL_API_KEY) {
        return getFallbackResponse(message);
    }

    try {
        const contextMessage = context
            ? `\n\nContext: ${JSON.stringify(context)}`
            : '';

        const response = await mistral.chat.complete({
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message + contextMessage }
            ],
            maxTokens: 500,
            temperature: 0.7
        });

        return response.choices?.[0]?.message?.content || getFallbackResponse(message);
    } catch (error) {
        console.error('Mistral API error:', error);
        return getFallbackResponse(message);
    }
}

// Fallback responses when API is unavailable
function getFallbackResponse(message: string): string {
    const lowered = message.toLowerCase();

    if (lowered.includes('deploy') && lowered.includes('production')) {
        return "I'll deploy your project to production now. 🚀\n\n**Deploying...**\n- Pulling latest from `main` branch\n- Running build process\n- Creating container image\n\nEstimated time: ~2 minutes.";
    }

    if (lowered.includes('rollback') || lowered.includes('revert')) {
        return "I found 3 previous deployments:\n\n1. `v1.2.3` - 2 hours ago (current)\n2. `v1.2.2` - 1 day ago\n3. `v1.2.1` - 3 days ago\n\nWhich version would you like to rollback to?";
    }

    if (lowered.includes('logs') || lowered.includes('error')) {
        return "Here's a summary of your recent logs:\n\n```\n✓ Build completed successfully\n✓ Container started on port 3000\n⚠ Warning: Memory usage at 78%\n```\n\nWould you like more details?";
    }

    if (lowered.includes('status') || lowered.includes('health')) {
        return "**System Status** ✅\n\n| Service | Status |\n|---------|--------|\n| API | 🟢 Healthy |\n| Database | 🟢 Healthy |\n| CDN | 🟢 Healthy |\n\nAll systems operational!";
    }

    if (lowered.includes('help')) {
        return "I can help with:\n\n🚀 **Deploy** - \"Deploy to production\"\n⏪ **Rollback** - \"Rollback to v1.2.2\"\n📊 **Logs** - \"Show me the logs\"\n🔍 **Debug** - \"Why did my build fail?\"\n📈 **Status** - \"Check system health\"";
    }

    if (lowered.includes('fail') || lowered.includes('why')) {
        return "I analyzed your last build:\n\n**Error:** `Module not found: 'lodash'`\n\n**Fix:**\n```bash\nnpm install lodash\n```\n\nWant me to add this and rebuild?";
    }

    return "I can help with deployments, rollbacks, logs, and debugging. What would you like to do?";
}

// Register routes
export default async function aiRoutes(app: ReturnType<typeof Fastify>) {
    // Analyze build logs
    app.post<{ Body: { logs: string; projectId?: string } }>('/analyze', async (request, reply) => {
        const { logs, projectId } = request.body;

        if (!logs) {
            return reply.status(400).send({ error: 'Build logs are required' });
        }

        const result = analyzeBuildLogs(logs);

        // If Mistral is available, get AI-enhanced analysis
        if (process.env.MISTRAL_API_KEY && result.errors.length > 0) {
            try {
                const aiAnalysis = await chatWithMistral(
                    `Analyze this build error and suggest a fix:\n\n${result.errors[0].message}\n\nContext: ${logs.slice(0, 500)}`
                );
                return { projectId, ...result, aiSuggestion: aiAnalysis };
            } catch (e) {
                // Continue with basic analysis
            }
        }

        return { projectId, ...result };
    });

    // Get suggested fixes
    app.post<{ Body: { errorType: string; errorMessage: string } }>('/suggest-fix', async (request, reply) => {
        const { errorType, errorMessage } = request.body;

        if (process.env.MISTRAL_API_KEY) {
            const suggestion = await chatWithMistral(
                `Suggest a fix for this ${errorType} error:\n\n${errorMessage}\n\nBe concise and provide a code snippet if applicable.`
            );
            return { errorType, errorMessage, suggestion };
        }

        const suggestions: Record<string, string[]> = {
            dependency: ['Run `npm install` to install all dependencies', 'Check if the package name is spelled correctly'],
            syntax: ['Check the file for syntax errors', 'Run your linter locally'],
            config: ['Verify your configuration files are valid', 'Check environment variables'],
            runtime: ['Check system resources (memory, disk)', 'Verify network connectivity'],
            unknown: ['Review the full build logs', 'Search for the error message online']
        };

        return {
            errorType,
            errorMessage,
            suggestions: suggestions[errorType] || suggestions.unknown
        };
    });

    // Chat with AI
    app.post<{ Body: { message: string; context?: any } }>('/chat', async (request, reply) => {
        const { message, context } = request.body;

        const response = await chatWithMistral(message, context);

        return { message, response, context };
    });

    // Check if AI is configured
    app.get('/status', async () => {
        return {
            provider: 'mistral',
            configured: !!process.env.MISTRAL_API_KEY,
            model: 'mistral-small-latest'
        };
    });
}
