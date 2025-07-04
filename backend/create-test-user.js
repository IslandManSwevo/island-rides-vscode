const bcrypt = require('bcryptjs');
const db = require('./db');

// Test user data
const testUser = {
  email: 'john.doe@test.com',
  password: 'Password123!',
  firstName: 'John',
  lastName: 'Doe'
};

async function createTestUser() {
  console.log('🧪 Creating test user...');
  
  // Check if user already exists
  const existingUserResult = await db.query('SELECT * FROM users WHERE email = $1', [testUser.email]);
  if (existingUserResult.rows.length > 0) {
    console.log('❌ User already exists:', existingUserResult.rows[0]);
    return;
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(testUser.password, 10);
  
  // Create user
  const insertUserQuery = `
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES ($1, $2, $3, $4, 'customer')
    RETURNING id, email, first_name, last_name, role
  `;
  const newUserResult = await db.query(insertUserQuery, [testUser.email, hashedPassword, testUser.firstName, testUser.lastName]);
  const newUser = newUserResult.rows[0];
  
  console.log('✅ Test user created:', {
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.first_name,
    lastName: newUser.last_name,
    role: newUser.role
  });
}

createTestUser().catch(console.error);
