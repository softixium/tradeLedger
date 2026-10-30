import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const dropIndexIfPresent = async (collection, indexName) => {
  const indexes = await collection.indexes();

  if (indexes.some((index) => index.name === indexName)) {
    await collection.dropIndex(indexName);
    console.log(`Removed legacy index: ${indexName}`);
  }
};

const migrateReceiptIndexes = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to run this migration.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const database = mongoose.connection.db;
  const stocks = database.collection("stocks");
  const sales = database.collection("sales");
  const counters = database.collection("counters");

  // The old global unique index prevents a multi-item purchase from sharing one receipt.
  await dropIndexIfPresent(stocks, "receiptNumber_1");
  await stocks.createIndex(
    { userId: 1, receiptNumber: 1 },
    { name: "userId_1_receiptNumber_1" }
  );

  // Multi-item sales share one bill number, just like stock items share a receipt.
  await dropIndexIfPresent(sales, "billNumber_1");
  await sales.createIndex(
    { userId: 1, billNumber: 1 },
    { name: "userId_1_billNumber_1" }
  );

  // Replace the old global counter index with a counter per user.
  await dropIndexIfPresent(counters, "name_1");
  await counters.createIndex(
    { name: 1, userId: 1 },
    { unique: true, name: "name_1_userId_1" }
  );

  // Existing users continue from their own highest receipt number; new users start at 1.
  const userSequences = await stocks.aggregate([
    { $match: { receiptNumber: { $regex: /^RCPT-\\d+$/ } } },
    {
      $project: {
        userId: 1,
        sequence: {
          $toInt: {
            $arrayElemAt: [{ $split: ["$receiptNumber", "-"] }, 1],
          },
        },
      },
    },
    { $group: { _id: "$userId", sequence: { $max: "$sequence" } } },
  ]).toArray();

  await Promise.all(
    userSequences.map(({ _id, sequence }) =>
      counters.updateOne(
        { name: `stockReceipt:${_id}`, userId: _id },
        { $set: { sequence } },
        { upsert: true }
      )
    )
  );

  console.log(`Receipt migration completed for ${userSequences.length} user(s).`);
};

migrateReceiptIndexes()
  .catch((error) => {
    console.error("Receipt migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
