import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const usernamePattern = /^[a-z0-9._-]{3,30}$/;
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

const makeUniqueUsername = (source, userId, used) => {
  let base = normalize(source).slice(0, 30);
  if (base.length < 3) base = `user${String(userId).slice(-6)}`;
  if (usernamePattern.test(base) && !used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 1;
  let candidate;
  do {
    const suffixText = String(suffix++);
    candidate = `${base.slice(0, 30 - suffixText.length)}${suffixText}`;
  } while (used.has(candidate));
  used.add(candidate);
  return candidate;
};

const migrate = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required to run this migration.");
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection("users");
  const indexes = await users.indexes();

  for (const index of indexes) {
    if (index.name !== "_id_" && index.unique && Object.hasOwn(index.key, "email")) {
      await users.dropIndex(index.name);
    }
  }

  const records = await users.find({}, { projection: { _id: 1, name: 1, firstName: 1, lastName: 1, username: 1, email: 1 } }).sort({ _id: 1 }).toArray();
  const used = new Set();
  for (const user of records) {
    const nameParts = String(user.name || "Business User").trim().split(/\s+/);
    const emailName = String(user.email || "").split("@")[0];
    const base = user.username || emailName || nameParts.join(".");
    const username = makeUniqueUsername(base, user._id, used);
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          username,
          firstName: user.firstName || nameParts[0] || "Business",
          lastName: user.lastName || nameParts.slice(1).join(" "),
        },
      }
    );
  }

  const updatedIndexes = await users.indexes();
  for (const index of updatedIndexes) {
    if (index.name !== "_id_" && Object.keys(index.key).length === 1 && index.key.username === 1 && !index.unique) {
      await users.dropIndex(index.name);
    }
  }
  await users.createIndex({ username: 1 }, { unique: true, sparse: true, name: "username_1" });
  console.log(`Username authentication migration completed for ${records.length} account(s).`);
};

migrate()
  .catch((error) => {
    console.error("Username authentication migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
