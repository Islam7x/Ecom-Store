// server/__tests__/setup.js
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let replSet;

// Start in-memory replica set so MongoDB transactions work in tests
const connect = async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ launchTimeout: 60000 }],
  });

  const uri = replSet.getUri();
  await mongoose.connect(uri);
};

const close = async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
};

const clear = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = { connect, close, clear };
