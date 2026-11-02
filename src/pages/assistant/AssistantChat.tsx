import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Shield, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export const AssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I'm SmartBiz Assistant. I can assist you with your store's sales totals, inventory alerts, outstanding receivables, replenishment advice, and GST reports. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/assistant/chat', { message: textToSend });
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an error communicating with the local business engine.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const cannedQueries = [
    "What are today's sales?",
    'Which items are low in stock?',
    'What are my top selling products?',
    'Do we have unpaid invoices?',
    'How do I bulk import products?',
  ];

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              SmartBiz AI Assistant
              <span className="badge badge-blue text-[10px]">Restricted Local Agent</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Answers strictly from your local SQLite database. No external cloud dependencies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <Shield size={14} />
          <span>Local Data Privacy Active</span>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          return (
            <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={16} />
                </div>
              )}
              <div
                className={`max-w-xl p-3.5 rounded-xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-bl-none whitespace-pre-wrap'
                }`}
              >
                <div>{m.text}</div>
                <div
                  className={`text-[9px] mt-1 text-right ${
                    isUser ? 'text-blue-200' : 'text-slate-500'
                  }`}
                >
                  {m.time}
                </div>
              </div>
              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={16} />
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-slate-800 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-400">
              <span className="loading-spinner" />
              <span>Analyzing business database...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Canned Suggestions */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40 flex gap-2 overflow-x-auto">
        {cannedQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(query)}
            className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] whitespace-nowrap transition border border-slate-700/60"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
        <input
          type="text"
          placeholder="Ask a question about your sales, stock, or business..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-xs"
        />
        <button type="submit" disabled={!input.trim() || isLoading} className="btn btn-primary btn-sm flex items-center gap-1">
          <Send size={14} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
