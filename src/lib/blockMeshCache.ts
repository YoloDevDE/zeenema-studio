// IndexedDB cache for block meshes (blocks.json + OBJ files)
// Avoids re-uploading the blocks/ folder on every page load.

const DB_NAME = 'zeenema-blocks'
const DB_VERSION = 1
const STORE_META = 'meta'
const STORE_FILES = 'files'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_META)
      req.result.createObjectStore(STORE_FILES)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbGetAllKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export interface CachedBlocksInfo {
  blockCount: number
  savedAt: string
}

/** Returns info about cached meshes, or null if nothing is cached. */
export async function getCachedBlocksInfo(): Promise<CachedBlocksInfo | null> {
  try {
    const db = await openDB()
    const info = await idbGet<CachedBlocksInfo>(db, STORE_META, 'info')
    return info ?? null
  } catch {
    return null
  }
}

/** Saves blocks.json text + all OBJ texts into IndexedDB. */
export async function saveBlocksToCache(
  blocksJson: string,
  objFiles: Map<string, string>,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const db = await openDB()
  await idbClear(db, STORE_FILES)
  await idbClear(db, STORE_META)

  await idbPut(db, STORE_FILES, 'blocks.json', blocksJson)

  const entries = Array.from(objFiles.entries())
  let i = 0
  for (const [name, text] of entries) {
    await idbPut(db, STORE_FILES, name, text)
    i++
    onProgress?.(i, entries.length)
  }

  const mapping = JSON.parse(blocksJson) as { id: number }[]
  const info: CachedBlocksInfo = {
    blockCount: mapping.length,
    savedAt: new Date().toLocaleString(),
  }
  await idbPut(db, STORE_META, 'info', info)
}

/** Loads blocks.json + all OBJ files from IndexedDB cache. */
export async function loadBlocksFromCache(
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ blocksJson: string; objFiles: Map<string, string> } | null> {
  try {
    const db = await openDB()
    const keys = await idbGetAllKeys(db, STORE_FILES)
    if (keys.length === 0) return null

    const blocksJson = await idbGet<string>(db, STORE_FILES, 'blocks.json')
    if (!blocksJson) return null

    const objFiles = new Map<string, string>()
    const objKeys = keys.filter((k) => k.endsWith('.obj'))
    let loaded = 0
    for (const key of objKeys) {
      const text = await idbGet<string>(db, STORE_FILES, key)
      if (text) objFiles.set(key, text)
      loaded++
      onProgress?.(loaded, objKeys.length)
    }

    return { blocksJson, objFiles }
  } catch {
    return null
  }
}

/** Clears all cached block meshes. */
export async function clearBlocksCache(): Promise<void> {
  const db = await openDB()
  await idbClear(db, STORE_FILES)
  await idbClear(db, STORE_META)
}
