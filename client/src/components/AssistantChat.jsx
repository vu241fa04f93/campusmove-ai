import React, { useState, useEffect, useRef } from 'react';
import { assistantApi } from '../api/assistantApi';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Clock,
  Navigation,
  Bus,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  Gauge,
  Layers,
} from 'lucide-react';

export const AssistantChat = ({
  onSelectRoute,
  onSelectStop,
  onSelectBus,
  onFocusMap,
}) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: "👋 Hi! I'm your CampusMove AI Transport Assistant. Ask me anything about live campus buses, ETAs, fastest routes, or delay alternatives!",
      intent: 'GENERAL_HELP',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    assistantApi
      .getSuggestions()
      .then((res) => {
        if (res.success && res.data) {
          setSuggestions(res.data);
        }
      })
      .catch(() => {
        // Fallback default suggestions
        setSuggestions([
          { id: '1', text: 'When will Bus 12 arrive?', intent: 'BUS_ETA' },
          { id: '2', text: 'Where is Bus 04 right now?', intent: 'BUS_LOCATION' },
          { id: '3', text: 'Fastest route to Central Library by 9 AM', intent: 'ROUTE_SEARCH' },
          { id: '4', text: 'Bus 04 is delayed. What should I take instead?', intent: 'ROUTE_SEARCH' },
          { id: '5', text: 'Show delayed buses', intent: 'BUS_STATUS' },
        ]);
      });
  }, []);

  const handleSend = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend.trim() : input.trim();
    if (!query || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${mins}`;

      const res = await assistantApi.sendMessage(query, { currentTime });

      const agentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: res.response || "I've processed your request.",
        intent: res.intent || 'GENERAL_HELP',
        trip: res.trip || (res.data?.recommendation ? res.data : null),
        data: res.data || null,
        success: res.success,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      console.error('[AssistantChat] Error sending message:', err);
      const errorMessage = {
        id: `error-${Date.now()}`,
        sender: 'agent',
        text: "I couldn't connect to the transit server. Please check your network or try again in a moment.",
        intent: 'ERROR',
        success: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        text: "👋 Hi! I'm your CampusMove AI Transport Assistant. Ask me anything about live campus buses, ETAs, fastest routes, or delay alternatives!",
        intent: 'GENERAL_HELP',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const getIntentBadge = (intent) => {
    switch (intent) {
      case 'BUS_ETA':
        return <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">⏱️ Bus ETA</span>;
      case 'BUS_LOCATION':
        return <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">📍 Live Tracking</span>;
      case 'ROUTE_SEARCH':
        return <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">🧭 Trip Planner</span>;
      case 'NEXT_STOP':
        return <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">🚏 Next Stop</span>;
      case 'BUS_STATUS':
        return <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">📊 Fleet Status</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
      {/* Assistant Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">CampusMove AI Agent</h3>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Natural Language Assistant & Deterministic Transport Solver
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          title="Reset Conversation"
          className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] space-y-2`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                {msg.sender === 'agent' && msg.intent && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CampusMove AI</span>
                    {getIntentBadge(msg.intent)}
                  </div>
                )}

                <div className="whitespace-pre-line text-slate-800">{msg.text}</div>

                <div
                  className={`text-[9px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Rich Trip Recommendation Card */}
              {msg.trip && msg.trip.recommendation && (
                <div className="bg-white border-2 border-indigo-200 rounded-2xl p-3.5 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Recommended Option
                    </span>
                    {msg.trip.recommendation.marginMinutes !== undefined && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ +{msg.trip.recommendation.marginMinutes} min safety buffer
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Departure</span>
                      <p className="font-black text-xs text-slate-800">{msg.trip.recommendation.departureTime}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Est. Arrival</span>
                      <p className="font-black text-xs text-blue-600">{msg.trip.recommendation.arrivalTime}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Duration</span>
                      <p className="font-black text-xs text-slate-800">{msg.trip.recommendation.totalDurationMinutes} mins</p>
                    </div>
                  </div>

                  {msg.trip.recommendation.steps && msg.trip.recommendation.steps.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Journey Breakdown:</p>
                      {msg.trip.recommendation.steps.map((st, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-slate-700 bg-slate-50/70 px-2 py-1 rounded-lg">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate">{st.description || st.instruction}</span>
                          <span className="font-semibold text-[10px] text-slate-500">{st.durationMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {onFocusMap && (
                      <button
                        onClick={onFocusMap}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Navigation className="w-3 h-3" /> View on Map
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Rich ETA Card */}
              {msg.intent === 'BUS_ETA' && msg.data && msg.data.busNumber && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{msg.data.busNumber}</div>
                      <div className="text-[10px] text-slate-500">Route: {msg.data.routeCode || 'Campus Line'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Estimated Arrival</span>
                    <div className="font-black text-blue-700 text-sm">~{msg.data.etaMinutes} mins</div>
                  </div>
                </div>
              )}

              {/* Rich Location Card */}
              {msg.intent === 'BUS_LOCATION' && msg.data && msg.data.location && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-900">{msg.data.busNumber || 'Fleet Vehicle'}</span>
                      <p className="text-[10px] text-slate-500">Speed: {msg.data.location.speed || 0} km/h • {msg.data.status?.toUpperCase()}</p>
                    </div>
                  </div>
                  {onFocusMap && (
                    <button
                      onClick={onFocusMap}
                      className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-700 transition"
                    >
                      Track Live
                    </button>
                  )}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-xs text-slate-500 font-medium pl-1">Analyzing live campus network...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-2.5 bg-slate-100/80 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-[10px] font-bold uppercase text-slate-400 px-1 whitespace-nowrap">Suggested:</span>
        {suggestions.slice(0, 5).map((s) => (
          <button
            key={s.id || s.text}
            onClick={() => handleSend(s.text)}
            className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 font-medium px-3 py-1 rounded-full whitespace-nowrap transition shadow-2xs"
          >
            {s.text}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask CampusMove AI (e.g. 'When will Bus 12 arrive?' or 'Route to Library by 9 AM')..."
            className="flex-1 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white text-xs text-slate-900 rounded-xl px-4 py-2.5 outline-none transition"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
