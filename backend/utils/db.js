const { MongoClient, ObjectId } = require('mongodb');

process.env.MONGODB_URI = 'mongodb+srv://dbuser8nxwqq:y988760A!@docdb-cluster-20260918-0826.global.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000';

if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
}

const client = new MongoClient(process.env.MONGODB_URI);
const clientPromise = client.connect();

async function connectToDB() {
    const connectedClient = await clientPromise;
    return connectedClient.db('Assignment1DB');
}

async function shutdown() {
    try {
        await clientPromise;
        await client.close();
    } finally {
        process.exit(0);
    }
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

module.exports = { connectToDB, ObjectId };