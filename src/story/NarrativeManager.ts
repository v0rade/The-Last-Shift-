import { EventBus } from '../utils/EventBus';
import { STORY_DOCUMENTS, StoryDocument, TERMINAL_DATA } from './Documents';

export class NarrativeManager {
  private discoveredDocs: Set<string> = new Set();
  private accessedTerminals: Set<string> = new Set();

  constructor(private readonly events: EventBus) {}

  markDocumentRead(docId: string): StoryDocument | null {
    const doc = STORY_DOCUMENTS.find((d) => d.id === docId) ?? null;
    if (!doc) return null;
    this.discoveredDocs.add(docId);
    this.events.emit('document:read', { id: doc.id, title: doc.title });
    return doc;
  }

  markTerminalAccessed(terminalId: string): void {
    this.accessedTerminals.add(terminalId);
    this.events.emit('terminal:opened', { id: terminalId });
  }

  hasReadDocument(docId: string): boolean {
    return this.discoveredDocs.has(docId);
  }

  getDiscoveredDocuments(): StoryDocument[] {
    return STORY_DOCUMENTS.filter((d) => this.discoveredDocs.has(d.id));
  }

  getDiscoveredDocumentIds(): string[] {
    return Array.from(this.discoveredDocs);
  }

  getAccessedTerminalIds(): string[] {
    return Array.from(this.accessedTerminals);
  }

  getTotalDocumentCount(): number {
    return STORY_DOCUMENTS.length;
  }

  getTotalTerminalCount(): number {
    return Object.keys(TERMINAL_DATA).length;
  }

  restoreState(docIds: string[], terminalIds: string[]): void {
    this.discoveredDocs = new Set(docIds);
    this.accessedTerminals = new Set(terminalIds);
  }

  reset(): void {
    this.discoveredDocs.clear();
    this.accessedTerminals.clear();
  }
}
