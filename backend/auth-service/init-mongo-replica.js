// Run this script to initialize MongoDB replica set for local development
// Usage: node init-mongo-replica.js

const { MongoClient } = require('mongodb');

async function initReplicaSet() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const admin = client.db().admin();

    // Check if replica set is already initialized
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log('Replica set already initialized:', status.set);
      return;
    } catch (error) {
      // Replica set not initialized, proceed with initialization
      console.log('Initializing replica set...');
    }

    // Initialize replica set
    const config = {
      _id: 'rs0',
      members: [{ _id: 0, host: 'localhost:27017' }]
    };

    await admin.command({ replSetInitiate: config });
    console.log('Replica set initialized successfully!');

    // Wait a bit for the replica set to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    const status = await admin.command({ replSetGetStatus: 1 });
    console.log('Replica set status:', status.set);
    console.log('Primary:', status.members.find(m => m.stateStr === 'PRIMARY')?.name);

  } catch (error) {
    console.error('Error initializing replica set:', error.message);
    console.log('\nMake sure MongoDB is running with replica set support:');
    console.log('mongod --replSet rs0 --port 27017 --dbpath /path/to/data');
  } finally {
    await client.close();
  }
}

initReplicaSet();
