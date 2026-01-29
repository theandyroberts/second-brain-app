'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DocumentMeta {
  id: string;
  title: string;
  type: 'project' | 'journal' | 'concept';
  category?: string;
  date?: string;
  tags?: string[];
  summary?: string;
}

interface GroupedDocs {
  projects: { [category: string]: DocumentMeta[] };
  journals: DocumentMeta[];
  concepts: DocumentMeta[];
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [grouped, setGrouped] = useState<GroupedDocs>({ projects: {}, journals: [], concepts: [] });
  const [activeTab, setActiveTab] = useState<'all' | 'projects' | 'journals' | 'concepts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        
        // Group documents
        const g: GroupedDocs = { projects: {}, journals: [], concepts: [] };
        for (const doc of data) {
          if (doc.type === 'project') {
            const cat = doc.category || 'uncategorized';
            if (!g.projects[cat]) g.projects[cat] = [];
            g.projects[cat].push(doc);
          } else if (doc.type === 'journal') {
            g.journals.push(doc);
          } else if (doc.type === 'concept') {
            g.concepts.push(doc);
          }
        }
        setGrouped(g);
      });
  }, []);

  const filteredDocs = documents.filter(doc => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || 
             doc.summary?.toLowerCase().includes(q) ||
             doc.tags?.some(t => t.toLowerCase().includes(q));
    }
    if (activeTab === 'all') return true;
    return doc.type === activeTab.slice(0, -1);
  });

  const typeColors = {
    project: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    journal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    concept: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-lg">🧠</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Second Brain</h1>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 pl-10 w-64 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(['all', 'projects', 'journals', 'concepts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-2 text-xs opacity-50">
                  {tab === 'all' ? documents.length : 
                   tab === 'projects' ? Object.values(grouped.projects).flat().length :
                   tab === 'journals' ? grouped.journals.length : grouped.concepts.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'projects' && !searchQuery ? (
          // Grouped project view
          <div className="space-y-8">
            {Object.entries(grouped.projects).map(([category, docs]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h2>
                <div className="grid gap-3">
                  {docs.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} typeColors={typeColors} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat list view
          <div className="grid gap-3">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <p>No documents found</p>
                <p className="text-sm mt-2">Documents will appear here as you create them</p>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <DocumentCard key={doc.id} doc={doc} typeColors={typeColors} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function DocumentCard({ doc, typeColors }: { doc: DocumentMeta; typeColors: Record<string, string> }) {
  return (
    <Link
      href={`/doc/${doc.id}`}
      className="group block p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[doc.type]}`}>
              {doc.type}
            </span>
            {doc.category && (
              <span className="text-xs text-gray-500">
                {doc.category}
              </span>
            )}
          </div>
          <h3 className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
            {doc.title}
          </h3>
          {doc.summary && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{doc.summary}</p>
          )}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {doc.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {doc.date && (
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {doc.date}
          </div>
        )}
      </div>
    </Link>
  );
}
