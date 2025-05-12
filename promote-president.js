// Promote Temkin Abdulmelik back to PRESIDENT role
// Run with: node promote-president.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function promotePresident() {
  // Get MongoDB connection string from environment
  const mongoUri = process.env.DATABASE_URL;
  
  if (!mongoUri) {
    console.error('DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db();
    const usersCollection = db.collection('User');
    
    // First, ensure no one has PRESIDENT role
    await usersCollection.updateMany(
      { role: 'PRESIDENT' },
      { $set: { role: 'MEMBER', updatedAt: new Date() } }
    );
    
    // Find Temkin Abdulmelik by email
    const temkin = await usersCollection.findOne({ 
      email: "temkinabdulmelik1@gmail.com"
    });
    
    if (!temkin) {
      console.log("Couldn't find Temkin Abdulmelik by email temkinabdulmelik1@gmail.com");
      
      // Try finding by name as fallback
      const temkinByName = await usersCollection.findOne({
        $or: [
          { freeName: { $regex: "Temkin", $options: "i" } },
          { name: { $regex: "Temkin", $options: "i" } }
        ]
      });
      
      if (temkinByName) {
        console.log(`Found Temkin by name: ${temkinByName.freeName || temkinByName.name} (${temkinByName._id})`);
        
        // Promote to PRESIDENT
        await usersCollection.updateOne(
          { _id: temkinByName._id },
          { $set: { role: 'PRESIDENT', updatedAt: new Date() } }
        );
        
        console.log(`Promoted ${temkinByName.freeName || temkinByName.name} to PRESIDENT`);
      } else {
        console.error("Could not find Temkin Abdulmelik in the database");
      }
    } else {
      console.log(`Found Temkin by email: ${temkin.freeName || temkin.name} (${temkin._id})`);
      
      // Promote to PRESIDENT
      await usersCollection.updateOne(
        { _id: temkin._id },
        { $set: { role: 'PRESIDENT', updatedAt: new Date() } }
      );
      
      console.log(`Promoted ${temkin.freeName || temkin.name} to PRESIDENT`);
    }
    
    // Verify the fix
    const presidents = await usersCollection.find({ role: 'PRESIDENT' }).toArray();
    console.log(`After fix: ${presidents.length} users with PRESIDENT role`);
    for (const president of presidents) {
      console.log(`- ${president.freeName || president.name || president.email} (${president._id})`);
    }
    
  } catch (error) {
    console.error('Error promoting president:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
promotePresident()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error));
