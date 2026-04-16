import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Search, Mic, MicOff, Send, Loader2, MapPin, ExternalLink, User, Stethoscope, X, Activity, Phone, Navigation, Map, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

const Badge = ({ children, color = 'blue', className }: { children: React.ReactNode; color?: 'blue' | 'red' | 'green' | 'yellow'; className?: string }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100'
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', colors[color], className)}>
      {children}
    </span>
  );
};

// Types for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface AISearchBarProps {
  className?: string;
}

export interface AISearchBarHandle {
  searchNearby: () => void;
}

export const AISearchBar = forwardRef<AISearchBarHandle, AISearchBarProps>(({ className }, ref) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useImperativeHandle(ref, () => ({
    searchNearby: () => {
      handleSearch("", true);
    }
  }));

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleSearch(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError('Mic access denied. Try opening the app in a new tab if you are in a preview.');
        } else if (event.error === 'network') {
          setMicError('Network error. Please check your internet connection.');
        } else {
          setMicError(`Error: ${event.error}`);
        }
        setTimeout(() => setMicError(null), 5000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Get location
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location', error);
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const toggleListening = () => {
    setMicError(null);
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setQuery('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition', e);
        setMicError('Could not start microphone. Please try again.');
      }
    }
  };

  const handleSearch = async (searchQuery: string = query, isLocationOnly: boolean = false) => {
    const finalQuery = isLocationOnly ? "Find the best hospitals near my current location" : searchQuery;
    if (!finalQuery.trim()) return;

    setIsLoading(true);
    setAdvice(null);
    setHospitals([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '') {
        setAdvice("AI search is currently unavailable. Please try again later.");
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: isLocationOnly 
          ? `Find the best hospitals near my current location: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}.`
          : `I am experiencing these symptoms: ${finalQuery}. Current location: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}.`,
        config: {
          systemInstruction: `You are a professional AI Health Assistant for HealthBridge, an app for migrant workers in India. Provide clear, empathetic, and actionable advice. Always include a strong medical disclaimer that you are an AI and not a doctor. 
          
          Return your response as a JSON object with two keys:
          1. 'advice': A markdown string containing possible causes, immediate advice, and safe home remedies.
          2. 'hospitals': An array of nearby hospital objects.
          
          For each hospital, include:
          - name: Full name of the hospital.
          - type: "Private" or "Government".
          - distance: Approximate travel time (e.g., "10-15 mins").
          - address: Full physical address.
          - phone: Contact number in +91 format.
          - maps_link: Google Maps search link (https://www.google.com/maps/search/?api=1&query=Hospital+Name+City).
          - directions_link: Google Maps direction link (https://www.google.com/maps/dir/?api=1&destination=Hospital+Name+City).
          - website: Official website URL if available.
          
          Use the Google Search tool to find real, nearby clinics and hospitals in India based on the user's location. Ensure all links are valid and usable.`,
          tools: [{ googleSearch: {} }],
          toolConfig: {
            includeServerSideToolInvocations: true,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              advice: { type: Type.STRING },
              hospitals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    distance: { type: Type.STRING },
                    address: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    maps_link: { type: Type.STRING },
                    directions_link: { type: Type.STRING },
                    website: { type: Type.STRING }
                  },
                  required: ["name", "address", "maps_link", "directions_link"]
                }
              }
            },
            required: ["advice", "hospitals"]
          }
        },
      });

      const jsonStr = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(jsonStr);
        setAdvice(parsed.advice);
        setHospitals(parsed.hospitals || []);
      } catch (e) {
        setAdvice(jsonStr);
      }
    } catch (error: any) {
      console.error('AI Search Error:', error);
      setAdvice(`Sorry, I encountered an error while searching. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = () => {
    setAdvice(null);
    setHospitals([]);
    setIsLoading(false);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="px-2 flex justify-between items-end mb-1">
        <div>
          <h3 className="text-lg font-display flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-red-500" />
            Describe Symptoms
          </h3>
          <p className="text-xs text-slate-500">Get instant AI advice and find nearby hospitals.</p>
        </div>
        {!location && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold animate-pulse border border-slate-100">
            <Loader2 className="w-3 h-3 animate-spin" />
            Detecting Location...
          </div>
        )}
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-[#8E8E93] group-focus-within:text-red-500 transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Describe your symptoms (e.g., 'fever and cough')"
          className="w-full bg-white border border-slate-200 rounded-[2rem] py-5 pl-14 pr-28 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)]"
        />
        <div className="absolute inset-y-2 right-2 flex items-center gap-2">
          <AnimatePresence>
            {micError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute right-0 bottom-full mb-4 w-64 bg-white border border-red-100 p-4 rounded-2xl shadow-xl z-50 text-center"
              >
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MicOff className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-xs font-bold text-slate-800 mb-1">Microphone Blocked</p>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                  Browser blocked the microphone. Please enable permissions or open the app in a new tab.
                </p>
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 underline"
                >
                  Open in New Tab
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={toggleListening}
            className={cn(
              "p-3 rounded-full transition-all active:scale-90",
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-50 text-[#8E8E93] hover:bg-slate-100"
            )}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(advice || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden relative"
          >
            <button 
              onClick={clearResponse}
              className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all active:scale-90 z-30"
            >
              <X className="w-5 h-5" />
            </button>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-400 animate-pulse">Consulting AI Health Assistant...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-red-600" />
                  </div>
                  <h4 className="font-display font-bold text-[#1D1D1F]">AI Health Advice</h4>
                </div>
                
                {advice && (
                  <div className="prose prose-sm max-w-none text-[#1D1D1F] leading-relaxed">
                    <ReactMarkdown>{advice}</ReactMarkdown>
                  </div>
                )}

                {hospitals.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h5 className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      Nearby Hospitals & Sources
                    </h5>
                    <div className="grid gap-4">
                      {hospitals.map((hospital, idx) => (
                        <div key={idx} className="p-6 bg-[#FBFBFD] rounded-3xl border border-slate-100 hover:border-red-100 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h6 className="font-bold text-slate-900 text-lg">{hospital.name}</h6>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge color={hospital.type?.toLowerCase().includes('gov') ? 'green' : 'blue'} className="text-[10px]">
                                  {hospital.type || 'Hospital'}
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hospital.distance}</span>
                              </div>
                            </div>
                            {hospital.website && (
                              <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-xl shadow-sm hover:text-red-500 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-500 mb-6 flex items-start gap-2">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            {hospital.address}
                          </p>

                          <div className="grid grid-cols-3 gap-2">
                            <a 
                              href={hospital.maps_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                            >
                              <Map className="w-3 h-3" />
                              View on Map
                            </a>
                            <a 
                              href={hospital.directions_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all"
                            >
                              <Navigation className="w-3 h-3" />
                              Directions
                            </a>
                            {hospital.phone && (
                              <a 
                                href={`tel:${hospital.phone}`}
                                className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-100 transition-all"
                              >
                                <Phone className="w-3 h-3" />
                                Call Now
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
