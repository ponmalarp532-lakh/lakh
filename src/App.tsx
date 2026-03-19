import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Zap, 
  Target, 
  BarChart3, 
  BrainCircuit, 
  Calendar, 
  Users, 
  ShieldCheck,
  Loader2,
  Terminal,
  Menu,
  Plus,
  Trash2,
  History,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { LakhService, Message } from './services/lakhService';
import { cn } from './utils';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi, I am LAKH — your intelligent AI system. What do you want to build, solve, or improve today?",
};

const AGENTS = [
  { name: 'Reflex', icon: Zap, color: 'text-yellow-400' },
  { name: 'Model', icon: BrainCircuit, color: 'text-blue-400' },
  { name: 'Goal', icon: Target, color: 'text-red-400' },
  { name: 'Utility', icon: BarChart3, color: 'text-emerald-400' },
  { name: 'Learning', icon: Sparkles, color: 'text-purple-400' },
  { name: 'Planning', icon: Calendar, color: 'text-orange-400' },
  { name: 'Multi-Agent', icon: Users, color: 'text-pink-400' },
  { name: 'Autonomous', icon: ShieldCheck, color: 'text-cyan-400' },
];

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  activeAgentName: string;
  timestamp: number;
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lakhServiceRef = useRef<LakhService | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('lakh_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        const lastSession = parsed[0];
        setCurrentSessionId(lastSession.id);
        setMessages(lastSession.messages);
        const agent = AGENTS.find(a => a.name === lastSession.activeAgentName) || AGENTS[0];
        setActiveAgent(agent);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      lakhServiceRef.current = new LakhService(apiKey);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('lakh_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Interaction',
      messages: [INITIAL_MESSAGE],
      activeAgentName: AGENTS[0].name,
      timestamp: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([INITIAL_MESSAGE]);
    setActiveAgent(AGENTS[0]);
  };

  const switchSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      const agent = AGENTS.find(a => a.name === session.activeAgentName) || AGENTS[0];
      setActiveAgent(agent);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      if (updatedSessions.length > 0) {
        switchSession(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const updateCurrentSession = (newMessages: Message[], agentName: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        // Update title based on first user message if it's still default
        let newTitle = s.title;
        if (s.title === 'New Interaction') {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return { ...s, messages: newMessages, activeAgentName: agentName, title: newTitle, timestamp: Date.now() };
      }
      return s;
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !lakhServiceRef.current) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    setInput('');
    setIsLoading(true);

    // Simulate agent switching based on keywords for visual feedback
    const lowerInput = input.toLowerCase();
    let nextAgent = activeAgent;
    if (lowerInput.includes('plan') || lowerInput.includes('roadmap')) nextAgent = AGENTS[5];
    else if (lowerInput.includes('goal') || lowerInput.includes('achieve')) nextAgent = AGENTS[2];
    else if (lowerInput.includes('best') || lowerInput.includes('compare')) nextAgent = AGENTS[3];
    else if (lowerInput.includes('expert') || lowerInput.includes('team')) nextAgent = AGENTS[6];
    else if (lowerInput.includes('suggest') || lowerInput.includes('insight')) nextAgent = AGENTS[7];
    else nextAgent = AGENTS[1];
    
    setActiveAgent(nextAgent);

    try {
      let assistantContent = '';
      const stream = lakhServiceRef.current.sendMessageStream(input);
      
      const assistantMessage: Message = { role: 'assistant', content: '' };
      const finalMessages = [...updatedMessagesWithUser, assistantMessage];
      setMessages(finalMessages);
      
      for await (const chunk of stream) {
        assistantContent += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantContent;
          return newMessages;
        });
      }
      
      // Final update to session storage
      updateCurrentSession([...updatedMessagesWithUser, { role: 'assistant', content: assistantContent }], nextAgent.name);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'I encountered an error. Please check your connection or API key.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const AGENT_DESCRIPTIONS = [
    "Responds instantly to basic queries, greetings, and FAQs.",
    "Maintains conversation memory and understands context from previous messages.",
    "Helps achieve specific goals by breaking down tasks step-by-step.",
    "Suggests best options based on value, time, cost, and efficiency.",
    "Adapts based on user behavior and improves responses over time.",
    "Creates structured plans, roadmaps, and execution steps for business or study.",
    "Simulates multiple experts (e.g., Developer + Marketer) for complex discussions.",
    "Takes initiative and provides proactive insights without being asked."
  ];

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-sans">
      {/* Architecture Modal */}
      <AnimatePresence>
        {isArchitectureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsArchitectureModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">LAKH Architecture</h2>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Multi-Agent Intelligent System</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsArchitectureModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 text-zinc-400 rotate-45" />
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                {AGENTS.map((agent, i) => (
                  <div key={agent.name} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                      <agent.icon className={cn("w-5 h-5", agent.color)} />
                      <h3 className="font-bold text-sm">{agent.name} Agent</h3>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {AGENT_DESCRIPTIONS[i]}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-white/10 text-center">
                <p className="text-xs text-zinc-500 italic">
                  "LAKH dynamically switches between these agents to provide the most valuable response."
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <History className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Recent Chats</h2>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Your Interaction History</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 text-zinc-400 rotate-45" />
                </button>
              </div>
              
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500 text-sm">No recent chats found.</p>
                  </div>
                ) : (
                  sessions.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => {
                        switchSession(session.id);
                        setIsHistoryModalOpen(false);
                      }}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border",
                        currentSessionId === session.id 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : "bg-white/5 border-white/5 hover:border-white/10 text-zinc-300"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{session.title}</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          {new Date(session.timestamp).toLocaleDateString()} • {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="p-2 hover:bg-red-500/20 rounded-xl transition-all ml-4"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-white/10">
                <button 
                  onClick={() => {
                    createNewSession();
                    setIsHistoryModalOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors text-sm font-bold shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Start New Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Left Sidebar (Navigation) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/10 bg-zinc-900/50 flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Terminal className="w-5 h-5 text-zinc-950" />
                </div>
                <span className="font-bold text-xl tracking-tighter">LAKH</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-white/5 rounded-md transition-colors"
              >
                <Menu className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Active Intelligence</h4>
                <p className="text-xs text-zinc-300 leading-tight">
                  LAKH is currently optimizing your session using the <span className="text-emerald-400 font-bold">{activeAgent.name}</span> agent.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Recent Sessions</h3>
                {sessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => switchSession(session.id)}
                    className={cn(
                      "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs font-medium",
                      currentSessionId === session.id 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                    )}
                  >
                    <span className="truncate flex-1">{session.title}</span>
                    <button 
                      onClick={(e) => deleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button 
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors text-sm font-bold shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-zinc-900 border border-white/10 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-zinc-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold">LAKH Intelligence</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">System Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition-all"
            >
              <History className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Recent Chats</span>
            </button>

            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                isRightSidebarOpen 
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                  : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Architecture</span>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                isRightSidebarOpen ? "bg-emerald-400" : "bg-zinc-600"
              )} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "bg-zinc-800" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "max-w-[85%] space-y-2",
                  msg.role === 'user' ? "text-right" : ""
                )}>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-zinc-900 border border-white/5 rounded-tl-none text-zinc-300"
                  )}>
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.role === 'assistant' && msg.content === '' && (
                      <div className="flex gap-1 py-1">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'LAKH'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask LAKH to build, solve, or improve..."
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none min-h-[60px] max-h-[200px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 p-2 bg-emerald-500 text-zinc-950 rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest font-bold">
            Multi-Agent Intelligence System • v1.0.0
          </p>
        </div>
      </main>

      {/* Right Sidebar (Architecture Details) */}
      <AnimatePresence>
        {isRightSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-white/10 bg-zinc-900/50 flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Architecture</h3>
              </div>
              <button 
                onClick={() => setIsRightSidebarOpen(false)}
                className="p-1 hover:bg-white/5 rounded-md transition-colors"
              >
                <Plus className="w-5 h-5 text-zinc-400 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-[10px] text-zinc-500 leading-relaxed px-2">
                LAKH dynamically switches between these 8 agent types to optimize for your specific intent.
              </p>
              
              <div className="space-y-2">
                {AGENTS.map((agent, i) => (
                  <motion.div 
                    key={agent.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      activeAgent.name === agent.name 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <agent.icon className={cn("w-4 h-4", activeAgent.name === agent.name ? agent.color : "text-zinc-500")} />
                      <h4 className={cn(
                        "text-xs font-bold",
                        activeAgent.name === agent.name ? "text-white" : "text-zinc-400"
                      )}>
                        {agent.name} Agent
                      </h4>
                      {activeAgent.name === agent.name && (
                        <span className="ml-auto text-[8px] font-bold text-emerald-400 uppercase tracking-tighter bg-emerald-400/10 px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {AGENT_DESCRIPTIONS[i]}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-zinc-950/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">System Status</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Optimized</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
