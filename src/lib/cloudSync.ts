import { supabase } from "./supabase";

export interface UserProgress {
  email: string;
  done_barbarismes: string;
  done_dialectes: string;
  last_synced_at: string;
  device_id: string;
}

export interface SyncQueueItem {
  id: string;
  email: string;
  operation: "add" | "remove";
  category: "barbarismes" | "dialectes";
  item_id: string;
  timestamp: number;
  synced: boolean;
}

interface LocalQueueItem extends Omit<SyncQueueItem, "id"> {
  id?: string;
}

class CloudSyncService {
  private deviceId: string;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.setupOfflineHandlers();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("fets_device_id");
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("fets_device_id", deviceId);
    }
    return deviceId;
  }

  private setupOfflineHandlers(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("[Cloud Sync] Online - syncing queued changes");
      this.syncQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("[Cloud Sync] Offline - changes will be queued");
    });
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback());
  }

  async getOrCreateUser(email: string): Promise<UserProgress | null> {
    if (!supabase.supabaseClient) return null;

    try {
      // Try to get existing user
      const { data: existing } = await supabase
        .from("users_progress")
        .select("*")
        .eq("email", email)
        .single();

      if (existing) return existing;

      // Create new user if doesn't exist
      const newUser: UserProgress = {
        email,
        done_barbarismes: "[]",
        done_dialectes: "[]",
        last_synced_at: new Date().toISOString(),
        device_id: this.deviceId,
      };

      const { data, error } = await supabase
        .from("users_progress")
        .insert([newUser])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[Cloud Sync] Error getting/creating user:", error);
      return null;
    }
  }

  async saveProgress(
    email: string,
    doneBarbarismes: string[],
    doneDialectes: string[]
  ): Promise<boolean> {
    if (!this.isOnline) {
      console.log("[Cloud Sync] Offline - queueing save operation");
      return this.queueOfflineChange(email, {
        operation: "save",
        data: { doneBarbarismes, doneDialectes },
      });
    }

    try {
      const { error } = await supabase
        .from("users_progress")
        .update({
          done_barbarismes: JSON.stringify(doneBarbarismes),
          done_dialectes: JSON.stringify(doneDialectes),
          last_synced_at: new Date().toISOString(),
          device_id: this.deviceId,
        })
        .eq("email", email);

      if (error) throw error;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error("[Cloud Sync] Error saving progress:", error);
      return false;
    }
  }

  async loadProgress(email: string): Promise<{
    barbarismes: string[];
    dialectes: string[];
  } | null> {
    try {
      const user = await this.getOrCreateUser(email);
      if (!user) return null;

      return {
        barbarismes: JSON.parse(user.done_barbarismes || "[]"),
        dialectes: JSON.parse(user.done_dialectes || "[]"),
      };
    } catch (error) {
      console.error("[Cloud Sync] Error loading progress:", error);
      return null;
    }
  }

  private queueOfflineChange(
    email: string,
    change: any
  ): boolean {
    const queue = this.getLocalQueue();
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      timestamp: Date.now(),
      synced: false,
      ...change,
    });
    localStorage.setItem("fets_sync_queue", JSON.stringify(queue));
    return true;
  }

  private getLocalQueue(): any[] {
    try {
      return JSON.parse(localStorage.getItem("fets_sync_queue") || "[]");
    } catch {
      return [];
    }
  }

  async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    try {
      const queue = this.getLocalQueue();
      const unsyncedItems = queue.filter((item) => !item.synced);

      for (const item of unsyncedItems) {
        await this.processQueueItem(item);
      }

      // Clean up synced items
      const remainingQueue = queue.filter((item) => !item.synced);
      localStorage.setItem("fets_sync_queue", JSON.stringify(remainingQueue));
    } catch (error) {
      console.error("[Cloud Sync] Error syncing queue:", error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async processQueueItem(item: any): Promise<void> {
    try {
      if (item.operation === "save") {
        await this.saveProgress(
          item.email,
          item.data.doneBarbarismes,
          item.data.doneDialectes
        );
      }
      // Mark as synced
      const queue = this.getLocalQueue();
      const idx = queue.findIndex((q) => q.id === item.id);
      if (idx !== -1) {
        queue[idx].synced = true;
        localStorage.setItem("fets_sync_queue", JSON.stringify(queue));
      }
    } catch (error) {
      console.error("[Cloud Sync] Error processing queue item:", error);
    }
  }

  getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    queuedItems: number;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      queuedItems: this.getLocalQueue().filter((item) => !item.synced).length,
    };
  }
}

export const cloudSync = new CloudSyncService();
