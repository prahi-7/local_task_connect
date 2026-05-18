const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Manual User model without pre-save hook
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      location: String,
      latitude: Number,
      longitude: Number,
      company: String
    });

    const User = mongoose.model('User', userSchema);

    // Delete old demo accounts
    await User.deleteMany({ 
      email: { 
        $in: ['admin@test.com', 'student@test.com', 'employer@test.com'] 
      } 
    });

    // Hash passwords manually
    const hashedPassword = await bcrypt.hash('123456', 10);
    console.log('🔐 Hashed password:', hashedPassword);

    // Create demo users with MANUALLY hashed passwords
    await User.create([
      {
        name: 'Admin User',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin'
      },
      {
        name: 'Rahul Kumar',
        email: 'student@test.com',
        password: hashedPassword,
        role: 'student',
        location: 'Mumbai',
        latitude: 19.0760,
        longitude: 72.8777
      },
      {
        name: 'Priya Sharma',
        email: 'employer@test.com',
        password: hashedPassword,
        role: 'employer',
        company: 'TechCorp India'
      }
    ]);

    console.log('✅ Demo accounts created!');
    console.log('\n📧 LOGIN CREDENTIALS:');
    console.log('   Email: student@test.com');
    console.log('   Password: 123456');
    console.log('   Email: employer@test.com');
    console.log('   Password: 123456');
    console.log('   Email: admin@test.com');
    console.log('   Password: 123456\n');

    // Verify password works
    const testUser = await User.findOne({ email: 'student@test.com' });
    const isMatch = await bcrypt.compare('123456', testUser.password);
    console.log('🔍 Password verification test:', isMatch ? '✅ WORKS' : '❌ FAILED');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();