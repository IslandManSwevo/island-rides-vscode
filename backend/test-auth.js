const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Test user data
const testUser = {
  email: 'john.doe@test.com',
  password: 'Password123!',
  firstName: 'John',
  lastName: 'Doe'
};

async function testAuth() {
  console.log('🧪 Testing authentication...');
  
  // Test password hashing
  const hashedPassword = await bcrypt.hash(testUser.password, 10);
  console.log('✅ Password hashed:', hashedPassword);
  
  // Test password comparison
  const isValid = await bcrypt.compare(testUser.password, hashedPassword);
  console.log('✅ Password comparison:', isValid);
  
  // Test JWT creation
  const token = jwt.sign(
    { 
      userId: 1, 
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
  console.log('✅ JWT Token created:', token);
  
  // Test JWT verification
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('✅ JWT Token verified:', decoded);
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
  }
}

testAuth().catch(console.error);
