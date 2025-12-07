// src/offline/operationQueue.ts
import { apiFetch, NetworkError } from "../api/Http";

export type PendingOperationKind =
  | "CREATE_VISITOR_LOG"
  | "CREATE_CHECKPOINT_ENTRY"
  | "END_VISITOR_LOG"
  | "RECORD_LOG_ENTRY";
// add more as needed

export interface PendingOperation {
  id: string;            // client-generated UUID
  kind: PendingOperationKind;
  path: string;          // e.g. "/api/visitor-logs"
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: any;             // JSON payload
  createdAt: number;     // timestamp
}

const STORAGE_KEY = "ivisit-pending-ops";

function loadQueue(): PendingOperation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveQueue(ops: PendingOperation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // storage full, etc. You might want to surface this somewhere later.
  }
}

export function getQueue(): PendingOperation[] {
  return loadQueue();
}

export function enqueueOperation(op: PendingOperation) {
  const queue = loadQueue();

  // Avoid queuing duplicate Start Logs for the same visitor
  if (op.kind === "CREATE_VISITOR_LOG") {
    const visitorId = op.body?.visitorId;
    if (visitorId != null) {
      const alreadyQueued = queue.some(
        (existing) =>
          existing.kind === "CREATE_VISITOR_LOG" &&
          existing.body &&
          existing.body.visitorId === visitorId
      );

      if (alreadyQueued) {
        console.warn(
          "Skipping duplicate queued CREATE_VISITOR_LOG for visitor",
          visitorId
        );
        return;
      }
    }
  }

  queue.push(op);
  saveQueue(queue);
}

export function removeOperation(id: string) {
  const queue = loadQueue().filter((op) => op.id !== id);
  saveQueue(queue);
}

/**
 * Processes all queued operations once (no infinite loop).
 * Call this:
 * - on app startup
 * - on an interval (e.g. 30s)
 * - manually after you detect connection restored
 */
export async function processQueueOnce(): Promise<void> {
  const queue = loadQueue();
  if (queue.length === 0) return;

  for (const op of queue) {
    try {
      const res = await apiFetch(op.path, {
        method: op.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op.body),
      });

      if (res.ok) {
        removeOperation(op.id);
        continue;
      }

      const text = await res.text().catch(() => "");
      const isClientError = res.status >= 400 && res.status < 500;

      if (isClientError) {
        const isStartLog = op.kind === "CREATE_VISITOR_LOG";
        const isMovement = op.kind === "RECORD_LOG_ENTRY";
        const isEndLog = op.kind === "END_VISITOR_LOG";
        const isCheckpoint = op.kind === "CREATE_CHECKPOINT_ENTRY";

        if (isStartLog || isMovement || isEndLog || isCheckpoint) {
          console.warn(
            "Dropping queued op due to client error:",
            op.kind,
            op.id,
            res.status,
            text
          );
          removeOperation(op.id);
          continue;
        }
      }

      console.warn(
        "Server rejected queued op",
        op.id,
        res.status,
        text
      );
    } catch (err) {
      if (err instanceof NetworkError) {
        console.warn("Network error while processing queue, abort batch");
        break;
      }
      console.error("Unexpected error in queue processing", err);
    }
  }
}