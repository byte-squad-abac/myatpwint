'use client';

interface SyncItem {
  id: string;
  type: 'purchase' | 'cart' | 'reading-progress';
  data: any;
  timestamp: number;
  attempts: number;
}

class BackgroundSyncManager {
  private dbName = 'MyatPwintSyncDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addToSyncQueue(type: SyncItem['type'], data: any): Promise<void> {
    await this.init();

    const item: Omit<SyncItem, 'id'> = {
      type,
      data,
      timestamp: Date.now(),
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.add(item);
      request.onsuccess = () => {
        console.log(`Added ${type} to sync queue`);
        this.requestBackgroundSync(type);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async requestBackgroundSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(`sync-${tag}`);
        console.log(`Background sync registered for: ${tag}`);
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    } else {
      // Fallback: try to sync immediately
      this.processSyncQueue();
    }
  }

  async processSyncQueue(): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.getAll();
      request.onsuccess = async () => {
        const items: SyncItem[] = request.result;
        
        for (const item of items) {
          try {
            await this.syncItem(item);
            await this.removeFromSyncQueue(item.id);
          } catch (error) {
            console.error(`Sync failed for item ${item.id}:`, error);
            await this.incrementAttempts(item.id);
          }
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async syncItem(item: SyncItem): Promise<void> {
    switch (item.type) {
      case 'purchase':
        await this.syncPurchase(item.data);
        break;
      case 'cart':
        await this.syncCart(item.data);
        break;
      case 'reading-progress':
        await this.syncReadingProgress(item.data);
        break;
    }
  }

  private async syncPurchase(data: any): Promise<void> {
    const response = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Purchase sync failed: ${response.status}`);
    }

    console.log('Purchase synced successfully');
  }

  private async syncCart(data: any): Promise<void> {
    // In a real implementation, this would sync cart state
    console.log('Cart sync not implemented yet');
  }

  private async syncReadingProgress(data: any): Promise<void> {
    const response = await fetch('/api/reading-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Reading progress sync failed: ${response.status}`);
    }

    console.log('Reading progress synced successfully');
  }

  private async removeFromSyncQueue(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async incrementAttempts(id: number): Promise<void> {
    // Implement retry logic with exponential backoff
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item: SyncItem = getRequest.result;
        item.attempts += 1;
        
        // Remove after 5 failed attempts
        if (item.attempts >= 5) {
          store.delete(id);
          console.log(`Sync item ${id} removed after 5 failed attempts`);
        } else {
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Helper method for cart integration
  async queuePurchaseForSync(purchaseData: any): Promise<void> {
    await this.addToSyncQueue('purchase', purchaseData);
  }

  // Helper method for reading progress
  async queueReadingProgressForSync(progressData: any): Promise<void> {
    await this.addToSyncQueue('reading-progress', progressData);
  }
}

export const backgroundSync = new BackgroundSyncManager();