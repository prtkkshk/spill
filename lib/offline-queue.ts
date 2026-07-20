// Offline Audio Recording Queue with IndexedDB (idb)

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'spill-offline-queue-db';
const STORE_NAME = 'recordings_queue';
const DB_VERSION = 1;

export interface QueuedRecording {
  id: string;
  blob: Blob;
  durationSeconds: number;
  timestamp: string;
  clientTime: string;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function queueOfflineRecording(
  blob: Blob,
  durationSeconds: number,
  clientTime: string
): Promise<string> {
  const db = await getDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: QueuedRecording = {
    id,
    blob,
    durationSeconds,
    timestamp: new Date().toISOString(),
    clientTime,
  };
  await db.put(STORE_NAME, item);
  return id;
}

export async function getQueuedRecordings(): Promise<QueuedRecording[]> {
  try {
    const db = await getDB();
    return db.getAll(STORE_NAME);
  } catch (e) {
    console.error('Failed to fetch offline recordings queue:', e);
    return [];
  }
}

export async function removeQueuedRecording(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  } catch (e) {
    console.error('Failed to remove queued recording:', e);
  }
}

export async function flushOfflineQueue(
  processCallback: (item: QueuedRecording) => Promise<boolean>
): Promise<number> {
  const items = await getQueuedRecordings();
  if (items.length === 0) return 0;

  let processedCount = 0;
  for (const item of items) {
    try {
      const success = await processCallback(item);
      if (success) {
        await removeQueuedRecording(item.id);
        processedCount++;
      }
    } catch (err) {
      console.error(`Error syncing queued recording ${item.id}:`, err);
    }
  }
  return processedCount;
}
