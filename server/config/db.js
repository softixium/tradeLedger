// import mongoose from "mongoose";

// const connectDB = async () => {
//   if (mongoose.connection.readyState === 1) {
//     return mongoose.connection;
//   }

//   if (!process.env.MONGODB_URI) {
//     throw new Error("MONGODB_URI is not configured");
//   }

//   // Reuse an in-flight connection attempt across concurrent serverless requests.
//   if (!globalThis.mongoConnectionPromise) {
//     globalThis.mongoConnectionPromise = mongoose
//       .connect(process.env.MONGODB_URI)
//       .then(() => {
//         console.log("MongoDB Connected");
//         return mongoose.connection;
//       })
//       .catch((error) => {
//         globalThis.mongoConnectionPromise = undefined;
//         throw error;
//       });
//   }

//   return globalThis.mongoConnectionPromise;
// };

// export default connectDB;
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default connectDB;