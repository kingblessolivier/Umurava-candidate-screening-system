import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload { id: string; name: string; email: string; }

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "No token provided" });
    return;
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = { _id: decoded.id, name: decoded.name, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
