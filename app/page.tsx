'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Sparkles, Mail, MessageSquare, Moon, Sun, FileText, History, Trash2, Eye, Calendar, User, Building, Heart, Clock } from 'lucide-react';
interface EmailHistoryItem {
  id: number;
  timestamp: Date;
  thoughts: string;
  tone: string;
  length: string;
  variations: number;
  emails: string[];
  subjectLine: string;
  template: string | null;
}

interface Template {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  description: string;
  content: string;
}

export default function EmailWriter() {
  const [rawThoughts, setRawThoughts] = useState('');
  const [tone, setTone] = useState('professional');
  const [originalEmail, setOriginalEmail] = useState('');
  const [generatedEmails, setGeneratedEmails] = useState<string[]>([]);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOriginalEmail, setShowOriginalEmail] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [emailLength, setEmailLength] = useState('standard');
  const [numVariations, setNumVariations] = useState(1);
  const [subjectLine, setSubjectLine] = useState('');
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [emailThread, setEmailThread] = useState('');
  const [showEmailThread, setShowEmailThread] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('emailHistory');
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setEmailHistory(parsedHistory);
      } catch (error) {
        console.error('Error loading email history:', error);
      }
    }
    
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save to localStorage whenever emailHistory or darkMode changes
  useEffect(() => {
    localStorage.setItem('emailHistory', JSON.stringify(emailHistory));
  }, [emailHistory]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const tones = [
    { value: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
    { value: 'warm', label: 'Warm', description: 'Friendly and approachable' },
    { value: 'concise', label: 'Concise', description: 'Brief and to-the-point' },
    { value: 'casual', label: 'Casual', description: 'Relaxed and informal' },
    { value: 'persuasive', label: 'Persuasive', description: 'Compelling and influential' },
    { value: 'empathetic', label: 'Empathetic', description: 'Understanding and compassionate' }
  ];

  const lengthOptions = [
    { value: 'brief', label: 'Brief', description: '2-3 sentences' },
    { value: 'standard', label: 'Standard', description: '1-2 paragraphs' },
    { value: 'detailed', label: 'Detailed', description: '3+ paragraphs' }
  ];

  const templates: Template[] = [
    {
      id: 'follow-up',
      name: 'Follow-up',
      icon: Clock,
      category: 'Business',
      description: 'Following up on previous conversations',
      content: 'I wanted to follow up on our previous conversation about [topic]. I\'m reaching out to see if you\'ve had a chance to consider [specific ask] and if there\'s any additional information you need from me.'
    },
    {
      id: 'introduction',
      name: 'Introduction',
      icon: User,
      category: 'Networking',
      description: 'Introducing yourself or others',
      content: 'I hope this email finds you well. I\'m [your name] from [company/position], and I wanted to reach out to introduce myself and explore potential opportunities for [collaboration/partnership/connection].'
    },
    {
      id: 'meeting-request',
      name: 'Meeting Request',
      icon: Calendar,
      category: 'Business',
      description: 'Requesting meetings or calls',
      content: 'I would like to schedule a meeting to discuss [topic]. Would you be available for a [duration] call sometime next week? I\'m flexible with timing and can accommodate your schedule.'
    },
    {
      id: 'thank-you',
      name: 'Thank You',
      icon: Heart,
      category: 'Courtesy',
      description: 'Expressing gratitude',
      content: 'Thank you for [specific action/help/time]. Your [assistance/insights/support] was invaluable and helped [specific outcome]. I truly appreciate you taking the time to [specific action].'
    },
    {
      id: 'project-update',
      name: 'Project Update',
      icon: Building,
      category: 'Business',
      description: 'Sharing project progress',
      content: 'I wanted to provide an update on the [project name]. We\'ve made significant progress on [specific areas] and are currently [current status]. The next steps include [upcoming tasks] with an expected completion date of [timeline].'
    },
    {
      id: 'apology',
      name: 'Apology',
      icon: Heart,
      category: 'Courtesy',
      description: 'Professional apologies',
      content: 'I apologize for [specific issue]. I understand this may have caused [impact] and I take full responsibility. To remedy this situation, I will [specific actions] and ensure this doesn\'t happen again.'
    }
  ];

  // Groq API function
  const callGroqAPI = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Error calling Groq API:', error);
      throw new Error('Failed to generate content. Please try again.');
    }
  };

  const generateSubjectLine = async () => {
    if (!rawThoughts.trim() && !selectedTemplate) return;
    
    setIsGeneratingSubject(true);
    
    try {
      const content = selectedTemplate ? selectedTemplate.content : rawThoughts;
      const prompt = `Generate a clear, compelling email subject line for the following email content. The subject should be professional, specific, and encourage the recipient to open the email. Respond with ONLY the subject line, no quotes or additional text.

Email content: "${content}"

Tone: ${tone}`;

      const response = await callGroqAPI(prompt);
      setSubjectLine(response.trim().replace(/^["']|["']$/g, ''));
    } catch (error) {
      console.error('Error generating subject line:', error);
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  const generateEmail = async () => {
    if (!rawThoughts.trim() && !selectedTemplate) return;
    
    setIsLoading(true);
    setGeneratedEmails([]);
    setSelectedEmailIndex(0);
    
    try {
      const newEmails: string[] = [];
      
      for (let i = 0; i < numVariations; i++) {
        const originalEmailContext = originalEmail.trim() 
          ? `\n\nOriginal email being responded to:\n"${originalEmail}"`
          : '';
          
        const threadContext = emailThread.trim()
          ? `\n\nEmail thread context:\n"${emailThread}"`
          : '';
          
        const templateContext = selectedTemplate
          ? `\n\nUsing template: ${selectedTemplate.name}\nTemplate content: "${selectedTemplate.content}"`
          : '';
          
        const lengthInstruction = {
          brief: 'Keep it very brief - 2-3 sentences maximum.',
          standard: 'Write a standard length email - 1-2 paragraphs.',
          detailed: 'Write a detailed email - 3 or more paragraphs with comprehensive information.'
        }[emailLength];

        const variationNote = numVariations > 1 
          ? `\n\nThis is variation ${i + 1} of ${numVariations}. Make this version slightly different in approach or phrasing while maintaining the same core message.`
          : '';

        const content = selectedTemplate ? selectedTemplate.content : rawThoughts;
        
        const prompt = `Transform the following into a well-written email with a ${tone} tone. ${lengthInstruction}${variationNote}

Content: "${content}"${originalEmailContext}${threadContext}${templateContext}

Please respond with ONLY the email body content, no subject line, no additional commentary. The email should be complete and ready to send.`;

        const response = await callGroqAPI(prompt);
        newEmails.push(response.trim());
      }
      
      setGeneratedEmails(newEmails);
      
      // Save to history
      const historyEntry: EmailHistoryItem = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        thoughts: selectedTemplate ? `Template: ${selectedTemplate.name}` : rawThoughts,
        tone,
        length: emailLength,
        variations: newEmails.length,
        emails: newEmails,
        subjectLine: subjectLine || 'No subject',
        template: selectedTemplate?.name || null
      };
      
      setEmailHistory(prev => [historyEntry, ...prev]);
      
    } catch (error) {
      console.error('Error generating email:', error);
      setGeneratedEmails(['Sorry, there was an error generating your email. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (emailContent: string | null = null) => {
    const contentToCopy = emailContent || generatedEmails[selectedEmailIndex];
    if (contentToCopy) {
      try {
        const fullEmail = subjectLine ? `Subject: ${subjectLine}\n\n${contentToCopy}` : contentToCopy;
        await navigator.clipboard.writeText(fullEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const clearHistory = () => {
    setEmailHistory([]);
  };

  const deleteHistoryItem = (id: number) => {
    setEmailHistory(prev => prev.filter(item => item.id !== id));
  };

  const loadFromHistory = (historyItem: EmailHistoryItem) => {
    setRawThoughts(historyItem.thoughts.startsWith('Template:') ? '' : historyItem.thoughts);
    setTone(historyItem.tone);
    setEmailLength(historyItem.length);
    setGeneratedEmails(historyItem.emails);
    setSubjectLine(historyItem.subjectLine);
    setSelectedEmailIndex(0);
    setActiveTab('compose');
    
    // Find and set template if used
    const templateName = historyItem.template;
    if (templateName) {
      const template = templates.find(t => t.name === templateName);
      setSelectedTemplate(template || null);
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const content = await file.text();
      setEmailThread(content);
      setShowEmailThread(true);
    }
  };

  const filteredHistory = emailHistory.filter(item => {
    const matchesSearch = item.thoughts.toLowerCase().includes(historySearch.toLowerCase()) ||
                         item.subjectLine.toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter = historyFilter === 'all' || item.tone === historyFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-gray-50'
    }`}>
      {/* Header */}
      <div className={`backdrop-blur-sm border-b sticky top-0 z-10 transition-colors duration-300 ${
        darkMode 
          ? 'bg-slate-900/80 border-slate-700/50' 
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>AI Email Writer Pro</h1>
                <p className={`text-sm transition-colors duration-300 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Professional email creation with AI - Powered by Groq</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Navigation Tabs */}
              <div className={`flex rounded-xl p-1 transition-colors duration-300 ${
                darkMode ? 'bg-slate-800' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => setActiveTab('compose')}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'compose'
                      ? darkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-blue-600 shadow-sm'
                      : darkMode 
                        ? 'text-gray-400 hover:text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Compose</span>
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'templates'
                      ? darkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-blue-600 shadow-sm'
                      : darkMode 
                        ? 'text-gray-400 hover:text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Templates</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'history'
                      ? darkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-blue-600 shadow-sm'
                      : darkMode 
                        ? 'text-gray-400 hover:text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                  {emailHistory.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      darkMode ? 'bg-blue-500' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {emailHistory.length}
                    </span>
                  )}
                </button>
              </div>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  darkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section - Left Column */}
            <div className="space-y-6">
              {/* Template Selection */}
              {selectedTemplate && (
                <div className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700/50' 
                    : 'bg-white border-gray-200/50'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <selectedTemplate.icon className="w-5 h-5 text-blue-600" />
                      <h3 className={`font-semibold transition-colors duration-300 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>Using Template: {selectedTemplate.name}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className={`p-1 rounded-lg transition-colors duration-300 ${
                        darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{selectedTemplate.description}</p>
                </div>
              )}

              {/* Main Input */}
              <div className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700/50' 
                  : 'bg-white border-gray-200/50'
              }`}>
                <div className="flex items-center space-x-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h2 className={`text-lg font-semibold transition-colors duration-300 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>What do you want to say?</h2>
                </div>
                
                <textarea
                  value={rawThoughts}
                  onChange={(e) => setRawThoughts(e.target.value)}
                  placeholder={selectedTemplate ? 
                    "Add any specific details or modify the template..." : 
                    "Type your raw thoughts here... e.g., 'Need to follow up on the project timeline, ask about budget, mention the deadline is tight'"
                  }
                  className={`w-full h-32 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-slate-900 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Settings */}
              <div className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700/50' 
                  : 'bg-white border-gray-200/50'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>Email Settings</h3>
                
                {/* Tone Selection */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Tone</label>
                  <div className="grid grid-cols-2 gap-3">
                    {tones.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                          tone === t.value
                            ? darkMode 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-blue-500 bg-blue-50 text-blue-900'
                            : darkMode 
                              ? 'border-slate-600 hover:border-slate-500 text-gray-300 hover:bg-slate-700/50' 
                              : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{t.label}</div>
                        <div className={`text-xs transition-colors duration-300 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{t.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length Control */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Email Length</label>
                  <div className="grid grid-cols-3 gap-3">
                    {lengthOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setEmailLength(option.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                          emailLength === option.value
                            ? darkMode 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-blue-500 bg-blue-50 text-blue-900'
                            : darkMode 
                              ? 'border-slate-600 hover:border-slate-500 text-gray-300 hover:bg-slate-700/50' 
                              : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className={`text-xs transition-colors duration-300 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Variations */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Number of Variations</label>
                  <div className="flex space-x-3">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => setNumVariations(num)}
                        className={`px-4 py-2 rounded-xl border-2 transition-all duration-300 ${
                          numVariations === num
                            ? darkMode 
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                              : 'border-blue-500 bg-blue-50 text-blue-900'
                            : darkMode 
                              ? 'border-slate-600 hover:border-slate-500 text-gray-300 hover:bg-slate-700/50' 
                              : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateEmail}
                disabled={(!rawThoughts.trim() && !selectedTemplate) || isLoading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all flex items-center justify-center space-x-2 ${
                  (!rawThoughts.trim() && !selectedTemplate) || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating {numVariations > 1 ? `${numVariations} variations` : 'email'}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate {numVariations > 1 ? `${numVariations} Variations` : 'Email'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Output Section - Right Column */}
            <div className="space-y-6">
              {/* Subject Line Generator */}
              <div className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700/50' 
                  : 'bg-white border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold transition-colors duration-300 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>Subject Line</h3>
                  <button
                    onClick={generateSubjectLine}
                    disabled={(!rawThoughts.trim() && !selectedTemplate) || isGeneratingSubject}
                    className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 flex items-center space-x-1 ${
                      (!rawThoughts.trim() && !selectedTemplate) || isGeneratingSubject
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : darkMode 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isGeneratingSubject ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={subjectLine}
                  onChange={(e) => setSubjectLine(e.target.value)}
                  placeholder="Enter subject line or generate one..."
                  className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-slate-900 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Generated Email Display */}
              <div className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700/50' 
                  : 'bg-white border-gray-200/50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Send className="w-5 h-5 text-blue-600" />
                    <h2 className={`text-lg font-semibold transition-colors duration-300 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Your Email {generatedEmails.length > 1 && `(${selectedEmailIndex + 1} of ${generatedEmails.length})`}
                    </h2>
                  </div>
                  {generatedEmails.length > 0 && (
                    <div className="flex items-center space-x-2">
                      {generatedEmails.length > 1 && (
                        <div className="flex space-x-1">
                          {generatedEmails.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedEmailIndex(index)}
                              className={`w-8 h-8 rounded-lg transition-all duration-300 ${
                                selectedEmailIndex === index
                                  ? 'bg-blue-600 text-white'
                                  : darkMode 
                                    ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => copyToClipboard()}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                          copied
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : darkMode 
                              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600 border border-slate-600' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                {generatedEmails.length > 0 ? (
                  <div className={`rounded-xl p-4 min-h-[400px] transition-colors duration-300 ${
                    darkMode ? 'bg-slate-900' : 'bg-gray-50'
                  }`}>
                    {subjectLine && (
                      <div className={`border-b pb-3 mb-4 transition-colors duration-300 ${
                        darkMode ? 'border-slate-700' : 'border-gray-200'
                      }`}>
                        <span className={`text-sm font-medium transition-colors duration-300 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>Subject: </span>
                        <span className={`font-medium transition-colors duration-300 ${
                          darkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>{subjectLine}</span>
                      </div>
                    )}
                    <pre className={`whitespace-pre-wrap font-sans leading-relaxed transition-colors duration-300 ${
                      darkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {generatedEmails[selectedEmailIndex]}
                    </pre>
                  </div>
                ) : (
                  <div className={`rounded-xl p-4 min-h-[400px] flex items-center justify-center transition-colors duration-300 ${
                    darkMode ? 'bg-slate-900' : 'bg-gray-50'
                  }`}>
                    <div className="text-center">
                      <Mail className={`w-12 h-12 mx-auto mb-3 transition-colors duration-300 ${
                        darkMode ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-lg font-medium transition-colors duration-300 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>Your email will appear here</p>
                      <p className={`text-sm transition-colors duration-300 ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>Enter your thoughts and click "Generate Email" to get started</p>
                    </div>
                  </div>
                )}
              </div>

              {generatedEmails.length > 0 && (
                <div className={`rounded-2xl p-6 border transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800/30' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      darkMode ? 'text-blue-400' : 'text-blue-900'
                    }`}>AI Enhancement Applied</span>
                  </div>
                  <p className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>
                    Your email has been crafted with a <strong>{tone}</strong> tone, <strong>{emailLength}</strong> length{generatedEmails.length > 1 && `, with ${generatedEmails.length} variations`} and optimized for clarity and effectiveness.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>Email Templates</h2>
              <p className={`text-lg transition-colors duration-300 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Choose from pre-built templates for common email scenarios</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 hover:scale-105 cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700/50 hover:bg-slate-700' 
                    : 'bg-white border-gray-200/50 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSelectedTemplate(template);
                  setActiveTab('compose');
                }}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <template.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-semibold transition-colors duration-300 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>{template.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                        darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
                      }`}>{template.category}</span>
                    </div>
                  </div>
                  <p className={`text-sm mb-4 transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{template.description}</p>
                  <div className={`p-3 rounded-lg text-xs transition-colors duration-300 ${
                    darkMode ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-700'
                  }`}>
                    {template.content.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>Email History</h2>
                <p className={`text-lg transition-colors duration-300 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>View and manage your generated emails</p>
              </div>
              
              {emailHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 ${
                    darkMode 
                      ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-800/30' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {emailHistory.length > 0 ? (
              <div className="space-y-4">
                {filteredHistory.map((item) => (
                  <div key={item.id} className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700/50' 
                      : 'bg-white border-gray-200/50'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className={`font-semibold transition-colors duration-300 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>{item.subjectLine}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                            darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
                          }`}>{item.tone}</span>
                        </div>
                        <p className={`text-sm mb-2 transition-colors duration-300 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {item.thoughts.substring(0, 100)}{item.thoughts.length > 100 && '...'}
                        </p>
                        <p className={`text-xs transition-colors duration-300 ${
                          darkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => loadFromHistory(item)}
                          className={`p-2 rounded-lg transition-all duration-300 ${
                            darkMode 
                              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Load this email"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.emails[0])}
                          className={`p-2 rounded-lg transition-all duration-300 ${
                            darkMode 
                              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Copy email"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className={`p-2 rounded-lg transition-all duration-300 ${
                            darkMode 
                              ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' 
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className={`rounded-lg p-3 text-sm transition-colors duration-300 ${
                      darkMode ? 'bg-slate-900' : 'bg-gray-50'
                    }`}>
                      <div className={`transition-colors duration-300 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {item.emails[0].substring(0, 150)}{item.emails[0].length > 150 && '...'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 transition-colors duration-300 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No email history yet</h3>
                <p>Generated emails will appear here for easy access and reuse.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
