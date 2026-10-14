require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const { HttpError } = require("./utils/errors");
const { toPaise, fromPaise, computeShares } = require("./utils/splits");
const { computeNet, simplifyDebts } = require("./utils/balances");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// ---------- helpers ----------
const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const cleanName = (v) => (typeof v === "string" ? v.trim() : "");

async function getGroupMembers(conn, groupId) {
  const [rows] = await conn.query(
    "SELECT id, name FROM members WHERE group_id = ? ORDER BY id",
    [groupId]
  );
  return rows;
}

async function requireGroup(groupId) {
  const [rows] = await db.query("SELECT * FROM expense_groups WHERE id = ?", [groupId]);
  if (!rows.length) throw new HttpError(404, "Group not found.");
  return rows[0];
}

// Run fn(conn) inside a transaction; roll back on any error
async function withTransaction(fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- health ----------
app.get("/", (req, res) => res.send("Smart Splitwise Calculator Backend is running!"));
app.get("/api/test", (req, res) => res.json({ message: "Backend is working successfully!" }));

// ---------- groups ----------
app.get("/api/groups", async (req, res) => {
  const [rows] = await db.query(`
    SELECT g.id, g.name, g.emoji, g.created_at,
      (SELECT COUNT(*) FROM members m WHERE m.group_id = g.id) AS member_count,
      (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.group_id = g.id) AS total
    FROM expense_groups g
    ORDER BY g.id DESC
  `);
  res.json(rows);
});

app.post("/api/groups", async (req, res) => {
  const name = cleanName(req.body.name);
  const emoji = cleanName(req.body.emoji) || null;
  const memberNames = Array.isArray(req.body.members)
    ? [...new Set(req.body.members.map(cleanName).filter(Boolean))]
    : [];

  if (!name) throw new HttpError(400, "Group name is required.");
  if (!memberNames.length) throw new HttpError(400, "Add at least one member.");

  const groupId = await withTransaction(async (conn) => {
    const [g] = await conn.query(
      "INSERT INTO expense_groups (name, emoji) VALUES (?, ?)",
      [name, emoji]
    );
    for (const m of memberNames) {
      await conn.query("INSERT INTO members (group_id, name) VALUES (?, ?)", [g.insertId, m]);
    }
    return g.insertId;
  });

  res.status(201).json({ message: "Group created.", groupId });
});

app.get("/api/groups/:id", async (req, res) => {
  if (!isPositiveInt(req.params.id)) throw new HttpError(400, "Invalid group id.");
  const group = await requireGroup(req.params.id);
  const members = await getGroupMembers(db, group.id);
  res.json({ ...group, members });
});

// ---------- members ----------
app.post("/api/groups/:id/members", async (req, res) => {
  if (!isPositiveInt(req.params.id)) throw new HttpError(400, "Invalid group id.");
  const name = cleanName(req.body.name);
  if (!name) throw new HttpError(400, "Member name is required.");
  await requireGroup(req.params.id);

  try {
    const [r] = await db.query("INSERT INTO members (group_id, name) VALUES (?, ?)", [
      req.params.id,
      name,
    ]);
    res.status(201).json({ message: "Member added.", memberId: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw new HttpError(409, "That member already exists in this group.");
    throw err;
  }
});

// ---------- expenses ----------
/*
POST /api/expenses
{
  "group_id": 1,
  "description": "Dinner",
  "category": "Food & drink",            (optional)
  "amount": 2400,
  "paid_by": 3,                          (member id)
  "participants": [3, 4, 5, 6],          (member ids)
  "split_type": "equal" | "percentage" | "custom",   (default "equal")
  "shares": { "3": 50, "4": 50 },        (percent or rupees; not needed for equal)
  "expense_date": "2026-10-09"           (optional, defaults to today)
}
*/
app.post("/api/expenses", async (req, res) => {
  const b = req.body || {};
  const description = cleanName(b.description);
  const amount = Number(b.amount);
  const splitType = b.split_type || "equal";
  const participants = Array.isArray(b.participants) ? b.participants.map(Number) : [];

  if (!isPositiveInt(b.group_id)) throw new HttpError(400, "group_id is required.");
  if (!description) throw new HttpError(400, "Description is required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Amount must be a positive number.");
  if (toPaise(amount) < 1) throw new HttpError(400, "Amount is too small.");
  if (!isPositiveInt(b.paid_by)) throw new HttpError(400, "paid_by (member id) is required.");
  if (!participants.length || participants.some((p) => !isPositiveInt(p))) {
    throw new HttpError(400, "Choose at least one participant (member ids).");
  }
  if (new Set(participants).size !== participants.length) {
    throw new HttpError(400, "Participants must not repeat.");
  }

  let expenseDate = b.expense_date;
  if (expenseDate === undefined || expenseDate === null || expenseDate === "") {
    expenseDate = new Date().toISOString().slice(0, 10);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || Number.isNaN(Date.parse(expenseDate))) {
    throw new HttpError(400, "expense_date must look like 2026-10-09.");
  }

  await requireGroup(b.group_id);
  const members = await getGroupMembers(db, b.group_id);
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(Number(b.paid_by))) throw new HttpError(400, "paid_by is not a member of this group.");
  if (participants.some((p) => !memberIds.has(p))) {
    throw new HttpError(400, "Every participant must be a member of this group.");
  }

  const sharesPaise = computeShares(amount, splitType, participants, b.shares || {});

  const expenseId = await withTransaction(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO expenses
        (group_id, description, category, amount, paid_by, split_type, expense_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        b.group_id,
        description,
        cleanName(b.category) || null,
        fromPaise(toPaise(amount)),
        b.paid_by,
        splitType,
        expenseDate,
      ]
    );
    for (const memberId of participants) {
      await conn.query(
        "INSERT INTO expense_shares (expense_id, member_id, share_amount) VALUES (?, ?, ?)",
        [r.insertId, memberId, fromPaise(sharesPaise[memberId])]
      );
    }
    return r.insertId;
  });

  res.status(201).json({ message: "Expense saved successfully!", expenseId });
});

// GET /api/expenses            -> all expenses
// GET /api/expenses?group_id=1 -> one group's expenses
app.get("/api/expenses", async (req, res) => {
  const params = [];
  let where = "";
  if (req.query.group_id !== undefined) {
    if (!isPositiveInt(req.query.group_id)) throw new HttpError(400, "Invalid group_id.");
    where = "WHERE e.group_id = ?";
    params.push(req.query.group_id);
  }

  const [expenses] = await db.query(
    `SELECT e.id, e.group_id, g.name AS group_name, e.description, e.category,
            e.amount, e.paid_by, p.name AS paid_by_name, e.split_type,
            e.expense_date, e.created_at
     FROM expenses e
     JOIN expense_groups g ON g.id = e.group_id
     JOIN members p ON p.id = e.paid_by
     ${where}
     ORDER BY e.expense_date DESC, e.id DESC`,
    params
  );

  if (!expenses.length) return res.json([]);

  const [shares] = await db.query(
    `SELECT s.expense_id, s.member_id, m.name AS member_name, s.share_amount
     FROM expense_shares s JOIN members m ON m.id = s.member_id
     WHERE s.expense_id IN (?)`,
    [expenses.map((e) => e.id)]
  );

  const byExpense = {};
  shares.forEach((s) => {
    (byExpense[s.expense_id] = byExpense[s.expense_id] || []).push({
      member_id: s.member_id,
      member_name: s.member_name,
      share_amount: s.share_amount,
    });
  });

  res.json(expenses.map((e) => ({ ...e, shares: byExpense[e.id] || [] })));
});

app.delete("/api/expenses/:id", async (req, res) => {
  if (!isPositiveInt(req.params.id)) throw new HttpError(400, "Invalid expense id.");
  const [r] = await db.query("DELETE FROM expenses WHERE id = ?", [req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, "Expense not found.");
  res.json({ message: "Expense deleted." });
});

// ---------- balances ----------
app.get("/api/groups/:id/balances", async (req, res) => {
  if (!isPositiveInt(req.params.id)) throw new HttpError(400, "Invalid group id.");
  const groupId = Number(req.params.id);
  await requireGroup(groupId);

  const members = await getGroupMembers(db, groupId);
  const nameOf = Object.fromEntries(members.map((m) => [m.id, m.name]));

  const [paidRows] = await db.query(
    `SELECT paid_by AS member_id, SUM(ROUND(amount * 100)) AS paise
     FROM expenses WHERE group_id = ? GROUP BY paid_by`,
    [groupId]
  );
  const [owedRows] = await db.query(
    `SELECT s.member_id, SUM(ROUND(s.share_amount * 100)) AS paise
     FROM expense_shares s JOIN expenses e ON e.id = s.expense_id
     WHERE e.group_id = ? GROUP BY s.member_id`,
    [groupId]
  );
  const [settleRows] = await db.query(
    `SELECT from_member, to_member, ROUND(amount * 100) AS paise
     FROM settlements WHERE group_id = ?`,
    [groupId]
  );

  const num = (rows) => rows.map((r) => ({ ...r, paise: Number(r.paise) }));
  const net = computeNet(members.map((m) => m.id), num(paidRows), num(owedRows), num(settleRows));

  res.json({
    group_id: groupId,
    balances: members.map((m) => ({
      member_id: m.id,
      name: m.name,
      balance: fromPaise(net[m.id]), // + is owed money, - owes money
    })),
    transfers: simplifyDebts(net).map((t) => ({
      from: t.from,
      from_name: nameOf[t.from],
      to: t.to,
      to_name: nameOf[t.to],
      amount: fromPaise(t.paise),
    })),
  });
});

// ---------- settlements ----------
// POST /api/settlements { group_id, from_member, to_member, amount }
app.post("/api/settlements", async (req, res) => {
  const b = req.body || {};
  const amount = Number(b.amount);

  if (!isPositiveInt(b.group_id)) throw new HttpError(400, "group_id is required.");
  if (!isPositiveInt(b.from_member) || !isPositiveInt(b.to_member)) {
    throw new HttpError(400, "from_member and to_member are required.");
  }
  if (Number(b.from_member) === Number(b.to_member)) throw new HttpError(400, "Pick two different people.");
  if (!Number.isFinite(amount) || toPaise(amount) < 1) throw new HttpError(400, "Amount must be a positive number.");

  await requireGroup(b.group_id);
  const members = await getGroupMembers(db, b.group_id);
  const ids = new Set(members.map((m) => m.id));
  if (!ids.has(Number(b.from_member)) || !ids.has(Number(b.to_member))) {
    throw new HttpError(400, "Both people must be members of this group.");
  }

  const [r] = await db.query(
    "INSERT INTO settlements (group_id, from_member, to_member, amount) VALUES (?, ?, ?, ?)",
    [b.group_id, b.from_member, b.to_member, fromPaise(toPaise(amount))]
  );
  res.status(201).json({ message: "Settlement recorded.", settlementId: r.insertId });
});

// ---------- 404 + error handler (keep LAST) ----------
app.use((req, res) => res.status(404).json({ message: "Route not found." }));

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body." });
  console.error("Server error:", err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
