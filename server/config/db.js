const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Product = require('../models/Product');
const defaultProducts = require('../data/products');

let memoryReplSet;

const seedFallbackProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) return;

    await Product.insertMany(defaultProducts.slice(0, 30).map((product) => ({
      ...product,
      isActive: true,
    })));

    console.log(`🌱 Seeded ${defaultProducts.length} fallback products into the local database.`);
  } catch (error) {
    console.warn('Fallback product seed skipped:', error.message);
  }
};

const connectWithMemoryFallback = async () => {
  if (!memoryReplSet) {
    memoryReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: 60000 }],
    });
  }

  const conn = await mongoose.connect(memoryReplSet.getUri());
  await seedFallbackProducts();
  console.log(`🍃 MongoDB connected using in-memory fallback: ${conn.connection.host}`);
  return conn;
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  try {
    if (uri) {
      try {
        const conn = await mongoose.connect(uri);
        await seedFallbackProducts();
        console.log(`🍃 MongoDB connected: ${conn.connection.host}`);
        return conn;
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw err;
        }

        console.warn(
          'MongoDB Atlas connection failed, using local in-memory fallback for development.',
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI environment variable is not set.');
    }

    return connectWithMemoryFallback();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw err;
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});

module.exports = connectDB;
