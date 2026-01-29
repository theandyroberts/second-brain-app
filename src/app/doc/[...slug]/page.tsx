'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  type: 'project' | 'journal' | 'concept';
  category?: string;
  date?: string;
  tags?: string[];
  summary?: string;
  content: string;
  sections?: string[];
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = Array.isArray(params.slug) ? params.slug : [params.slug];
  const id = slug.join('/');

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Document not found');
        return res.json();
      })
      .then(data => {
        setDoc(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const typeColors = {
    project: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    journal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    concept: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">📄</div>
        <div className="text-gray-400">{error || 'Document not found'}</div>
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">
          ← Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[doc.type]}`}>
                  {doc.type}
                </span>
                {doc.category && (
                  <span className="text-xs text-gray-500">{doc.category}</span>
                )}
                {doc.date && (
                  <span className="text-xs text-gray-500">{doc.date}</span>
                )}
              </div>
              <h1 className="text-lg font-semibold truncate">{doc.title}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {doc.summary && (
          <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-gray-300 italic">{doc.summary}</p>
          </div>
        )}

        {doc.tags && doc.tags.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap">
            {doc.tags.map(tag => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Markdown Content */}
        <article className="prose prose-invert prose-violet max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
          prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
          prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-violet-400 prose-a:no-underline hover:prose-a:text-violet-300
          prose-code:text-violet-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/5
          prose-blockquote:border-violet-500/50 prose-blockquote:bg-white/[0.02] prose-blockquote:not-italic
          prose-strong:text-white prose-strong:font-semibold
          prose-ul:text-gray-300 prose-ol:text-gray-300
          prose-li:marker:text-gray-500
          prose-hr:border-white/10
          prose-table:text-sm
          prose-th:text-left prose-th:text-gray-400 prose-th:font-medium prose-th:border-b prose-th:border-white/10
          prose-td:border-b prose-td:border-white/5
        ">
          <MarkdownRenderer content={doc.content} />
        </article>

        {/* Sections */}
        {doc.sections && doc.sections.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/5">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Sections</h2>
            <div className="grid gap-2">
              {doc.sections.map(section => (
                <div key={section} className="text-gray-300 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  {section}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  // Simple markdown to HTML conversion
  const html = content
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold & Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote><p>$1</p></blockquote>')
    // Unordered lists
    .replace(/^\s*[-*] (.*$)/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Wrap list items
  const wrappedHtml = html
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/<\/li><br \/><li>/g, '</li><li>');

  return <div dangerouslySetInnerHTML={{ __html: `<p>${wrappedHtml}</p>` }} />;
}
