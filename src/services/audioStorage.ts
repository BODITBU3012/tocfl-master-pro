import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'taiwanese_study_audio';
const STORE_NAME = 'audio_files';
const VERSION = 1;

export async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveAudioFile(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, blob, id);
}

export async function getAudioFile(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, id);
}

export async function deleteAudioFile(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
