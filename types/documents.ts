export interface IndexedDocumentChunk {
  id: string;
  documentId: string;
  fileName: string;
  sourcePath: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: string;
}

export interface IndexedDocumentMeta {
  documentId: string;
  fileName: string;
  sourcePath: string;
  uploadedAt: string;
  chunkCount: number;
}
