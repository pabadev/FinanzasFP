/**
 * Migración one-off: categorías por entidad → globales por usuario.
 *
 * Convierte el campo `entity` de cada categoría en el campo `user`
 * (resolviendo el dueño de la entidad), deduplica por (user, name, type)
 * y elimina el índice único viejo `entity_1_name_1`.
 *
 * Uso: node scripts/migrate-global-categories.mjs
 * (lee MONGODB_URI de .env.local)
 */
import mongoose from "mongoose";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function run() {
  const env = { ...process.env, ...loadEnv() };
  const uri = env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI no encontrada en .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const categories = db.collection("categories");
  const entities = db.collection("entities");

  const entityMap = new Map();
  for (const entity of await entities
    .find({}, { projection: { _id: 1, ownerUser: 1 } })
    .toArray()) {
    if (entity.ownerUser) {
      entityMap.set(entity._id.toString(), entity.ownerUser.toString());
    }
  }

  const docs = await categories.find({}).toArray();
  let updated = 0;
  let merged = 0;
  let missing = 0;

  for (const doc of docs) {
    const owner = doc.entity ? entityMap.get(doc.entity.toString()) : null;
    if (!owner) {
      missing++;
      continue;
    }

    const userObj = new mongoose.Types.ObjectId(owner);
    const existing = await categories.findOne({
      user: userObj,
      name: doc.name,
      type: doc.type,
    });

    if (existing && existing._id.toString() !== doc._id.toString()) {
      await categories.deleteOne({ _id: doc._id });
      merged++;
    } else {
      await categories.updateOne(
        { _id: doc._id },
        { $set: { user: userObj }, $unset: { entity: "" } },
      );
      updated++;
    }
  }

  try {
    await categories.dropIndex("entity_1_name_1");
    console.log("Índice entity_1_name_1 eliminado");
  } catch {
    console.log("Índice entity_1_name_1 no existía");
  }

  console.log({ updated, merged, missing });
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});