const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const mongoserver = new MongoMemoryServer();

exports.dbConnect = async () => {
  const uri = await mongoserver.getUri();

  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  };

  await mongoose.connect(uri, mongooseOpts);
  console.log("Connected to in-memory MongoDB");
};

exports.dbDisconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoserver.stop();
  console.log("Disconnected from in-memory MongoDB");
};
