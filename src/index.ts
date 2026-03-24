/**
 * TalentTrust API — entry point.
 *
 * Wires the Express application, initialises the SQLite persistence layer via
 * the database singleton, and mounts all route groups.
 *
 * Environment variables:
 *   PORT    — HTTP port to bind (default: 3001)
 *   DB_PATH — Path to the SQLite file (default: talenttrust.db)
 */

import express, { Request, Response, NextFunction } from "express";
import { getDb } from "./db/database";
import { ContractRepository } from "./repositories/contractRepository";
import { UserRepository } from "./repositories/userRepository";
import type { ContractStatus } from "./db/types";

const app = express();
const PORT = process.env["PORT"] ?? 3001;

app.use(express.json());

// ── Initialise database singleton (runs migrations) ──────────────────────────
const db = getDb();
const contracts = new ContractRepository(db);
const users = new UserRepository(db);

// ── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "talenttrust-backend" });
});

// ── Contracts ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/contracts
 * Returns all contracts.
 */
app.get("/api/v1/contracts", (_req: Request, res: Response) => {
  res.json({ contracts: contracts.findAll() });
});

/**
 * GET /api/v1/contracts/:id
 * Returns a single contract by ID.
 */
app.get("/api/v1/contracts/:id", (req: Request, res: Response) => {
  const contract = contracts.findById(req.params["id"] ?? "");
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  res.json({ contract });
});

/**
 * POST /api/v1/contracts
 * Creates a new contract.
 * Body: { title, clientId, freelancerId, amount, status? }
 */
app.post("/api/v1/contracts", (req: Request, res: Response) => {
  const { title, clientId, freelancerId, amount, status } = req.body as {
    title?: string;
    clientId?: string;
    freelancerId?: string;
    amount?: number;
    status?: ContractStatus;
  };

  if (!title || !clientId || !freelancerId || amount === undefined) {
    res
      .status(400)
      .json({
        error: "title, clientId, freelancerId, and amount are required",
      });
    return;
  }

  try {
    const contract = contracts.create({
      title,
      clientId,
      freelancerId,
      amount,
      status,
    });
    res.status(201).json({ contract });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * PATCH /api/v1/contracts/:id/status
 * Updates the status of an existing contract.
 * Body: { status }
 */
app.patch("/api/v1/contracts/:id/status", (req: Request, res: Response) => {
  const { status } = req.body as { status?: ContractStatus };
  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  try {
    const contract = contracts.updateStatus(req.params["id"] ?? "", status);
    if (!contract) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    res.json({ contract });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * DELETE /api/v1/contracts/:id
 * Deletes a contract.
 */
app.delete("/api/v1/contracts/:id", (req: Request, res: Response) => {
  const deleted = contracts.delete(req.params["id"] ?? "");
  if (!deleted) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  res.status(204).send();
});

// ── Users ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users
 * Returns all users.
 */
app.get("/api/v1/users", (_req: Request, res: Response) => {
  res.json({ users: users.findAll() });
});

/**
 * GET /api/v1/users/:id
 * Returns a single user by ID.
 */
app.get("/api/v1/users/:id", (req: Request, res: Response) => {
  const user = users.findById(req.params["id"] ?? "");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

/**
 * POST /api/v1/users
 * Creates a new user.
 * Body: { username, email, role }
 */
app.post("/api/v1/users", (req: Request, res: Response) => {
  const { username, email, role } = req.body as {
    username?: string;
    email?: string;
    role?: string;
  };

  if (!username || !email || !role) {
    res.status(400).json({ error: "username, email, and role are required" });
    return;
  }

  try {
    const user = users.create({
      username,
      email,
      role: role as "client" | "freelancer" | "both",
    });
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Deletes a user.
 */
app.delete("/api/v1/users/:id", (req: Request, res: Response) => {
  const deleted = users.delete(req.params["id"] ?? "");
  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.status(204).send();
});

// ── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`TalentTrust API listening on http://localhost:${PORT}`);
});

export { app };
