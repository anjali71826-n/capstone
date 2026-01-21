// Simple in-memory vector store for RAG
// In production, this would use a proper vector database

interface TextChunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    topic?: string;
    [key: string]: unknown;
  };
  embedding?: number[];
}

class VectorStore {
  private chunks: TextChunk[] = [];

  // Add text chunks to the store
  addChunks(chunks: TextChunk[]): void {
    this.chunks.push(...chunks);
  }

  // Simple text-based search (no embeddings for simplicity)
  search(query: string, limit = 5): TextChunk[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    // Score each chunk based on term overlap
    const scored = this.chunks.map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        if (textLower.includes(term)) {
          score += 1;
          // Bonus for exact matches
          if (textLower.split(/\s+/).includes(term)) {
            score += 0.5;
          }
        }
      }

      // Bonus for topic match
      if (chunk.metadata.topic && queryLower.includes(chunk.metadata.topic)) {
        score += 2;
      }

      return { chunk, score };
    });

    // Sort by score and return top results
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.chunk);
  }

  // Get all chunks
  getAll(): TextChunk[] {
    return this.chunks;
  }

  // Clear the store
  clear(): void {
    this.chunks = [];
  }

  // Get chunk by ID
  getById(id: string): TextChunk | undefined {
    return this.chunks.find((c) => c.id === id);
  }

  // Get chunks by source
  getBySource(source: string): TextChunk[] {
    return this.chunks.filter((c) => c.metadata.source === source);
  }
}

// Singleton instance
export const vectorStore = new VectorStore();

// Utility function to chunk text
export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks;
}

// Initialize empty vector store - content will be fetched dynamically from web
export function initializeVectorStore(): void {
  vectorStore.clear();
  console.log('Vector store initialized (empty - content fetched dynamically from web)');
}

// Add content for a destination dynamically
export function addDestinationContent(
  destination: string,
  topic: string,
  content: string,
  source: string
): void {
  const chunks = chunkText(content);
  const destKey = destination.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  chunks.forEach((chunk, chunkIndex) => {
    vectorStore.addChunks([
      {
        id: `${destKey}_${topic}_${chunkIndex}`,
        text: chunk,
        metadata: {
          source,
          topic,
          destination,
        },
      },
    ]);
  });
}

export default vectorStore;
