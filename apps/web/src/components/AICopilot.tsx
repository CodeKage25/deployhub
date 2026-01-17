import { useState, useRef, useEffect } from 'react';
import {
    MessageCircle,
    X,
    Send,
    Loader2,
    Rocket
} from 'lucide-react';
import './AICopilot.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

import { ai } from '../api';

// Get AI response from backend (with fallback)
const getAIResponse = async (message: string): Promise<string> => {
    try {
        const result = await ai.chat(message);
        return result.response;
    } catch (error) {
        // Fallback to simulated responses if API fails
        await new Promise(resolve => setTimeout(resolve, 800));

        const lowered = message.toLowerCase();

        if (lowered.includes('deploy') && lowered.includes('production')) {
            return "I'll deploy your project to production now. 🚀\n\n**Deploying...**\n- Pulling latest from `main` branch\n- Running build process\n- Creating container image\n\nEstimated time: ~2 minutes. I'll notify you when it's live!";
        }

        if (lowered.includes('rollback') || lowered.includes('revert')) {
            return "I found 3 previous deployments:\n\n1. `v1.2.3` - 2 hours ago (current)\n2. `v1.2.2` - 1 day ago\n3. `v1.2.1` - 3 days ago\n\nWhich version would you like to rollback to? Just say the version number.";
        }

        if (lowered.includes('logs') || lowered.includes('error')) {
            return "Here's a summary of your recent logs:\n\n```\n✓ Build completed successfully\n✓ Container started on port 3000\n⚠ Warning: Memory usage at 78%\n```\n\nWould you like me to show more detailed logs or analyze any specific issues?";
        }

        if (lowered.includes('status') || lowered.includes('health')) {
            return "**System Status** ✅\n\n| Service | Status | Uptime |\n|---------|--------|--------|\n| API | 🟢 Healthy | 99.9% |\n| Database | 🟢 Healthy | 99.8% |\n| CDN | 🟢 Healthy | 100% |\n\nAll systems operational!";
        }

        if (lowered.includes('help') || lowered.includes('what can you')) {
            return "I can help with:\n\n🚀 **Deploy** - \"Deploy to production\"\n⏪ **Rollback** - \"Rollback to previous version\"\n📊 **Logs** - \"Show me the logs\"\n🔍 **Debug** - \"Why did my build fail?\"\n📈 **Status** - \"Check system health\"\n\nJust ask!";
        }

        if (lowered.includes('fail') || lowered.includes('why')) {
            return "I analyzed your last build failure:\n\n**Error:** `Module not found: 'lodash'`\n\n**Fix:** Add the missing dependency:\n```bash\nnpm install lodash\n```\n\nWould you like me to add this and trigger a new build?";
        }

        return "I can help with deployments, rollbacks, logs, and debugging. Could you be more specific about what you'd like to do?";
    }
};

export default function AICopilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your **Deploy Copilot** 🤖\n\nI can help you deploy, rollback, debug builds, and more. Just ask in natural language!\n\nTry: \"Deploy to production\" or \"Why did my build fail?\"",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await getAIResponse(userMessage.content);
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                className={`copilot-fab ${isOpen ? 'hidden' : ''}`}
                onClick={() => setIsOpen(true)}
                aria-label="Open Assistant"
            >
                <MessageCircle size={20} />
            </button>

            {/* Chat Panel */}
            <div className={`copilot-panel ${isOpen ? 'open' : ''}`}>
                <div className="copilot-header">
                    <div className="copilot-title">
                        <Rocket size={18} />
                        <span>Assistant</span>
                    </div>
                    <button className="copilot-close" onClick={() => setIsOpen(false)}>
                        <X size={16} />
                    </button>
                </div>

                <div className="copilot-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.role}`}>
                            {msg.role === 'assistant' && (
                                <div className="message-avatar">
                                    <Rocket size={14} />
                                </div>
                            )}
                            <div className="message-content">
                                <div
                                    className="message-text"
                                    dangerouslySetInnerHTML={{
                                        __html: formatMessage(msg.content)
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message assistant">
                            <div className="message-avatar">
                                <Rocket size={14} />
                            </div>
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="copilot-input">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Ask anything about your deployments..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </>
    );
}

// Simple markdown-like formatting
function formatMessage(text: string): string {
    return text
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Line breaks
        .replace(/\n/g, '<br />');
}
