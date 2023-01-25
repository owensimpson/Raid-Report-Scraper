import express from "express"

import sqlite3 from "sqlite3";
import { open } from "sqlite";

const SALT_ROUNDS = 10;

const dbPromise = open({
  filename: "data.db",
  driver: sqlite3.Database,
});

const app = express();

app.use(express.json());


app.get("/pgcr/:id", async (req, res) => {
    const db = await dbPromise;
    const id = req.params["id"];
    const [dbRes] = await db.all(`SELECT * FROM PGCRTable WHERE id=?;`, id);
    if (dbRes) res.status(200).json({id, tags: dbRes.tags.split("*")});
    else res.status(404).json({});
});

app.post("/pgcr", async (req, res) => {
  const db = await dbPromise;
  const { id, tags } = req.body;
  await db.run(
      "INSERT OR IGNORE INTO PGCRTable(id, tags) VALUES (?, ?)",
      id,
      tags.join("*")
  );
  res.status(200).json({id, tags});
});

const setup = async () => {
  const db = await dbPromise;
  await db.migrate();
  app.listen(8000, () => {
    console.log("listening on http://localhost:8000");
  });
};
setup();