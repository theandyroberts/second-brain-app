import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BRAIN_PATH = process.env.BRAIN_PATH || path.join(process.env.HOME || '', 'second-brain');

export interface DocumentMeta {
  id: string;
  title: string;
  type: 'project' | 'journal' | 'concept';
  category?: string;
  date?: string;
  tags?: string[];
  summary?: string;
}

export interface Document extends DocumentMeta {
  content: string;
  sections?: string[];
}

function getMetaFromFile(metaPath: string): Partial<DocumentMeta> {
  try {
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading meta.json:', e);
  }
  return {};
}

function getBodyContent(docPath: string): { content: string; frontmatter: Record<string, any> } {
  const bodyPath = path.join(docPath, 'body.md');
  const indexPath = path.join(docPath, 'index.md');
  
  let filePath = bodyPath;
  if (!fs.existsSync(bodyPath) && fs.existsSync(indexPath)) {
    filePath = indexPath;
  }
  
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    return { content, frontmatter: data };
  }
  
  // Check if docPath itself is a .md file
  if (docPath.endsWith('.md') && fs.existsSync(docPath)) {
    const fileContent = fs.readFileSync(docPath, 'utf-8');
    const { data, content } = matter(fileContent);
    return { content, frontmatter: data };
  }
  
  return { content: '', frontmatter: {} };
}

export function getAllDocuments(): DocumentMeta[] {
  const documents: DocumentMeta[] = [];
  
  const types = ['projects', 'journals', 'concepts'] as const;
  
  for (const type of types) {
    const typePath = path.join(BRAIN_PATH, type);
    if (!fs.existsSync(typePath)) continue;
    
    const entries = fs.readdirSync(typePath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(typePath, entry.name);
      
      if (entry.isDirectory()) {
        // Check for nested documents (project folders with subdocs)
        const subEntries = fs.readdirSync(entryPath, { withFileTypes: true });
        const hasBody = subEntries.some(e => e.name === 'body.md' || e.name === 'index.md');
        
        if (hasBody) {
          // This is a document folder
          const meta = getMetaFromFile(path.join(entryPath, 'meta.json'));
          const { frontmatter } = getBodyContent(entryPath);
          
          documents.push({
            id: `${type}/${entry.name}`,
            title: frontmatter.title || meta.title || entry.name.replace(/-/g, ' '),
            type: type.slice(0, -1) as 'project' | 'journal' | 'concept',
            category: type === 'projects' ? entry.name : undefined,
            date: frontmatter.date || meta.date,
            tags: frontmatter.tags || meta.tags || [],
            summary: frontmatter.summary || meta.summary,
          });
        } else {
          // This is a category folder (like /projects/quizzydots/)
          for (const subEntry of subEntries) {
            const subPath = path.join(entryPath, subEntry.name);
            
            if (subEntry.isDirectory()) {
              const meta = getMetaFromFile(path.join(subPath, 'meta.json'));
              const { frontmatter } = getBodyContent(subPath);
              
              documents.push({
                id: `${type}/${entry.name}/${subEntry.name}`,
                title: frontmatter.title || meta.title || subEntry.name.replace(/-/g, ' '),
                type: type.slice(0, -1) as 'project' | 'journal' | 'concept',
                category: entry.name,
                date: frontmatter.date || meta.date,
                tags: frontmatter.tags || meta.tags || [],
                summary: frontmatter.summary || meta.summary,
              });
            } else if (subEntry.name.endsWith('.md')) {
              const { frontmatter } = getBodyContent(subPath);
              const name = subEntry.name.replace('.md', '');
              
              documents.push({
                id: `${type}/${entry.name}/${name}`,
                title: frontmatter.title || name.replace(/-/g, ' '),
                type: type.slice(0, -1) as 'project' | 'journal' | 'concept',
                category: entry.name,
                date: frontmatter.date,
                tags: frontmatter.tags || [],
                summary: frontmatter.summary,
              });
            }
          }
        }
      } else if (entry.name.endsWith('.md')) {
        // Direct .md file in type folder (like journals/2026-01-28.md)
        const { frontmatter } = getBodyContent(entryPath);
        const name = entry.name.replace('.md', '');
        
        documents.push({
          id: `${type}/${name}`,
          title: frontmatter.title || name,
          type: type.slice(0, -1) as 'project' | 'journal' | 'concept',
          date: frontmatter.date || name,
          tags: frontmatter.tags || [],
          summary: frontmatter.summary,
        });
      }
    }
  }
  
  // Sort by date descending
  return documents.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function getDocument(id: string): Document | null {
  const docPath = path.join(BRAIN_PATH, id);
  
  // Check if it's a directory or a file
  let actualPath = docPath;
  if (!fs.existsSync(docPath)) {
    actualPath = docPath + '.md';
    if (!fs.existsSync(actualPath)) {
      return null;
    }
  }
  
  const isDirectory = fs.statSync(actualPath).isDirectory();
  
  if (isDirectory) {
    const meta = getMetaFromFile(path.join(actualPath, 'meta.json'));
    const { content, frontmatter } = getBodyContent(actualPath);
    
    // Get sections if they exist
    const sectionsPath = path.join(actualPath, 'sections');
    let sections: string[] = [];
    if (fs.existsSync(sectionsPath)) {
      sections = fs.readdirSync(sectionsPath)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
    }
    
    const parts = id.split('/');
    const type = parts[0].slice(0, -1) as 'project' | 'journal' | 'concept';
    
    return {
      id,
      title: frontmatter.title || meta.title || parts[parts.length - 1].replace(/-/g, ' '),
      type,
      category: parts.length > 2 ? parts[1] : undefined,
      date: frontmatter.date || meta.date,
      tags: frontmatter.tags || meta.tags || [],
      summary: frontmatter.summary || meta.summary,
      content,
      sections,
    };
  } else {
    const { content, frontmatter } = getBodyContent(actualPath);
    const parts = id.split('/');
    const name = parts[parts.length - 1];
    const type = parts[0].slice(0, -1) as 'project' | 'journal' | 'concept';
    
    return {
      id,
      title: frontmatter.title || name.replace(/-/g, ' '),
      type,
      category: parts.length > 2 ? parts[1] : undefined,
      date: frontmatter.date || name,
      tags: frontmatter.tags || [],
      summary: frontmatter.summary,
      content,
    };
  }
}

export function getCategories(): { type: string; categories: string[] }[] {
  const result: { type: string; categories: string[] }[] = [];
  
  const types = ['projects', 'journals', 'concepts'];
  
  for (const type of types) {
    const typePath = path.join(BRAIN_PATH, type);
    if (!fs.existsSync(typePath)) continue;
    
    const entries = fs.readdirSync(typePath, { withFileTypes: true });
    const categories = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
    
    result.push({ type, categories });
  }
  
  return result;
}
