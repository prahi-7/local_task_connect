const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define proper schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  location: String,
  latitude: Number,
  longitude: Number,
  company: String,
  createdAt: { type: Date, default: Date.now }
});

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  salary: String,
  location: String,
  latitude: Number,
  longitude: Number,
  employer: mongoose.Schema.Types.ObjectId,
  company: String,
  jobType: String,
  category: String,
  isActive: Boolean,
  applicationsCount: Number,
  createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  job: mongoose.Schema.Types.ObjectId,
  student: mongoose.Schema.Types.ObjectId,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

async function clean() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const User = mongoose.model('User', userSchema);
    const Job = mongoose.model('Job', jobSchema);
    const Application = mongoose.model('Application', applicationSchema);

    // Delete admin and employer demo accounts
    const deletedUsers = await User.deleteMany({ 
      email: { $in: ['admin@test.com', 'employer@test.com'] } 
    });
    console.log(`🗑️ Deleted ${deletedUsers.deletedCount} demo accounts (admin & employer)`);

    // Check if student exists
    let student = await User.findOne({ email: 'student@test.com' });
    
    if (student) {
      // Update existing student password
      const hashedPassword = await bcrypt.hash('123456', 10);
      await User.updateOne(
        { email: 'student@test.com' },
        { 
          name: 'Rahul Kumar',
          password: hashedPassword,
          role: 'student',
          location: 'Mumbai',
          latitude: 19.0760,
          longitude: 72.8777
        }
      );
      console.log('✅ Student demo account updated');
    } else {
      // Create new student
      const hashedPassword = await bcrypt.hash('123456', 10);
      await User.create({
        name: 'Rahul Kumar',
        email: 'student@test.com',
        password: hashedPassword,
        role: 'student',
        location: 'Mumbai',
        latitude: 19.0760,
        longitude: 72.8777
      });
      console.log('✅ Student demo account created');
    }

    // Delete all jobs
    const jobResult = await Job.deleteMany({});
    console.log(`🗑️ Deleted ${jobResult.deletedCount} pre-loaded jobs`);

    // Delete all applications
    const appResult = await Application.deleteMany({});
    console.log(`🗑️ Deleted ${appResult.deletedCount} applications`);

    // Verify
    const verifyStudent = await User.findOne({ email: 'student@test.com' });
    const testPassword = await bcrypt.compare('123456', verifyStudent.password);
    
    console.log('\n📧 DEMO ACCOUNT:');
    console.log('   Student: student@test.com / 123456');
    console.log('   Password Test:', testPassword ? '✅ WORKS' : '❌ FAILED');
    console.log('\n⚠️ Employers must REGISTER to post jobs\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

clean();