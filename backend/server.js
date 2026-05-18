const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============ MONGODB ATLAS CONNECTION ============
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file!');
  process.exit(1);
}

console.log('🔌 Connecting to MongoDB Atlas...');

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Atlas Connection Error:', err.message);
    process.exit(1);
  });

// ============ SCHEMAS ============
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student' },
  location: String,
  latitude: Number,
  longitude: Number,
  company: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  salary: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company: String,
  jobType: { type: String, default: 'full-time' },
  category: { type: String, default: 'technology' },
  isActive: { type: Boolean, default: true },
  applicationsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model('Job', jobSchema);

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

// ============ HELPERS ============
const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key-2024';

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Please login' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const getCoordinates = (location) => {
  const cities = {
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'kolkata': { lat: 22.5726, lng: 88.3639 }
  };
  return cities[location?.toLowerCase()] || { lat: 20.5937, lng: 78.9629 };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

// ============ ROUTES ============

// Test
app.get('/', (req, res) => {
  res.json({ message: 'API Running' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, location, company } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const coords = getCoordinates(location);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      location: location || '',
      latitude: coords.lat,
      longitude: coords.lng,
      company: role === 'employer' ? company : ''
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, location: user.location,
      latitude: user.latitude, longitude: user.longitude,
      company: user.company, token
    });
  } catch (err) {
    console.error('Register Error:', err.message);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = generateToken(user._id);
    
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, location: user.location,
      latitude: user.latitude, longitude: user.longitude,
      company: user.company, token
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const { userLat, userLng, maxDistance, search } = req.query;
    let query = { isActive: true };
    if (search) query.title = { $regex: search, $options: 'i' };
    
    let jobs = await Job.find(query).populate('employer', 'name company');
    
    if (userLat && userLng) {
      jobs = jobs.map(job => {
        const j = job.toObject();
        const dist = calculateDistance(parseFloat(userLat), parseFloat(userLng), j.latitude, j.longitude);
        j.distance = dist;
        j.formattedDistance = dist < 1 ? `${Math.round(dist*1000)}m away` : `${dist}km away`;
        return j;
      });
      jobs.sort((a, b) => a.distance - b.distance);
      if (maxDistance) jobs = jobs.filter(j => j.distance <= parseFloat(maxDistance));
    }
    
    res.json({ count: jobs.length, data: jobs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load jobs' });
  }
});

// Employer jobs
app.get('/api/jobs/employer/myjobs', protect, async (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ message: 'Not authorized' });
  const jobs = await Job.find({ employer: req.user._id });
  res.json({ count: jobs.length, data: jobs });
});

// Post job
app.post('/api/jobs', protect, async (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ message: 'Only employers can post' });
  
  const { title, description, salary, location } = req.body;
  const coords = getCoordinates(location);
  
  const job = await Job.create({
    title, description, salary, location,
    latitude: coords.lat, longitude: coords.lng,
    employer: req.user._id, company: req.user.company
  });
  
  res.status(201).json(job);
});

// Delete job
app.delete('/api/jobs/:id', protect, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Not found' });
  if (job.employer.toString() !== req.user._id) return res.status(403).json({ message: 'Not authorized' });
  await Job.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Apply
app.post('/api/applications', protect, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can apply' });
  
  const { jobId } = req.body;
  const existing = await Application.findOne({ job: jobId, student: req.user._id });
  if (existing) return res.status(400).json({ message: 'Already applied' });
  
  await Application.create({ job: jobId, student: req.user._id });
  await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });
  
  res.status(201).json({ message: 'Applied successfully' });
});

// Admin routes
app.get('/api/admin/users', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
  const users = await User.find().select('-password');
  res.json({ count: users.length, data: users });
});

app.get('/api/admin/stats', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
  const [totalUsers, students, employers, totalJobs, activeJobs, totalApps] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'employer' }),
    Job.countDocuments(), Job.countDocuments({ isActive: true }), Application.countDocuments()
  ]);
  res.json({ data: { users: { total: totalUsers, students, employers }, jobs: { total: totalJobs, active: activeJobs }, applications: { total: totalApps } } });
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}\n`);
});