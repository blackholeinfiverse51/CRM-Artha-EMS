require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...\n');
  console.log('URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Available collections:', collections.map(c => c.name).join(', '));
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if MongoDB URI is correct');
    console.error('2. Verify network connectivity');
    console.error('3. Check MongoDB Atlas IP whitelist');
    console.error('4. Verify credentials');
    process.exit(1);
  }
}

testConnection();
