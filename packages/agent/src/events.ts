import { AgentEventType, AgentEvent } from "@taskmate/shared";
import { getDb, agentEvents } from "@taskmate/db";
import { randomUUID } from "crypto";

export type EventListener = (event: AgentEvent) => void;

class AgentEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  public subscribe(taskId: string, listener: EventListener): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId)!.add(listener);

    return () => {
      const set = this.listeners.get(taskId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(taskId);
        }
      }
    };
  }

  public async emit(
    taskId: string,
    eventType: AgentEventType,
    message: string,
    payload: Record<string, any> = {}
  ): Promise<AgentEvent> {
    const event: AgentEvent = {
      id: "evt-" + randomUUID(),
      taskId,
      eventType,
      message,
      payload,
      timestamp: new Date().toISOString(),
    };

    // Save to database
    try {
      const db = getDb();
      await db.insert(agentEvents).values({
        id: event.id,
        taskId: event.taskId,
        eventType: event.eventType,
        message: event.message,
        payload: event.payload,
        timestamp: new Date(event.timestamp),
      });
    } catch (e) {
      console.error("Failed to persist agent event:", e);
    }

    // Broadcast to memory listeners (for SSE)
    const set = this.listeners.get(taskId);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error("Error in SSE listener:", err);
        }
      });
    }

    return event;
  }
}

export const agentEventBus = new AgentEventBus();
