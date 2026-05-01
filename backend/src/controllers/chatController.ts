import { Request, Response } from "express";
import { runAgent, ChatMessage } from "../services/agentService";

export const chatHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history: ChatMessage[];
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    if (message.length > 1000) {
      res.status(400).json({ error: "Message too long (max 1000 characters)" });
      return;
    }

    const validHistory = (Array.isArray(history) ? history : [])
      .slice(-20) // keep last 20 turns to avoid token bloat
      .filter((m) => m.role && m.content);

    const result = await runAgent(message.trim(), validHistory);
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent error";
    res.status(500).json({ error: message });
  }
};
