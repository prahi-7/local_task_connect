const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ============ GOOGLE MAPS API KEY ============
const GOOGLE_MAPS_API_KEY = 'AIzaSyCbj_3hOah5K0beMaXCPh2eQTc51qIKhow';

// ============ MONGODB ATLAS CONNECTION ============
const MONGODB_URI = "mongodb://prahi:prahi7@ac-f7xsel1-shard-00-00.cptmyir.mongodb.net:27017,ac-f7xsel1-shard-00-01.cptmyir.mongodb.net:27017,ac-f7xsel1-shard-00-02.cptmyir.mongodb.net:27017/?ssl=true&replicaSet=atlas-xh4hj4-shard-0&authSource=admin&appName=Cluster1";

console.log('🔌 Connecting to MongoDB Atlas...');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000
})
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Atlas Connection Error:', err.message);
    process.exit(1);
  });

// ============ SCHEMAS ============
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student', index: true },
  location: String,
  latitude: Number,
  longitude: Number,
  company: String,
  isActive: { type: Boolean, default: true },
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
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  company: String,
  jobType: { type: String, default: 'full-time' },
  category: { type: String, default: 'technology' },
  isActive: { type: Boolean, default: true, index: true },
  applicationsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model('Job', jobSchema);

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'], default: 'pending' },
  coverLetter: String,
  employerNotes: String,
  createdAt: { type: Date, default: Date.now }
});

applicationSchema.index({ job: 1, student: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

// ============ NOTIFICATION SCHEMA ============
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['application', 'status_update', 'review', 'job_posted'], default: 'application' },
  relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// ============ REVIEW SCHEMA ============
const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  role: { type: String, enum: ['employer_review_student', 'student_review_employer'], required: true },
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// ============ HELPERS ============
const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key-2024';

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Please login' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password').lean();
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const createNotification = async (userId, message, type, jobId) => {
  await Notification.create({ user: userId, message, type, relatedJob: jobId });
};

// ============ GEOCODING ============
const getCoordinates = async (location) => {
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_DEMO_KEY_HERE') {
    try {
      console.log(`🗺️ Google API: Geocoding "${location}"...`);
      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      const response = await axios.get(url, {
        params: { address: location + ', India', key: GOOGLE_MAPS_API_KEY, region: 'in' }
      });
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const loc = response.data.results[0].geometry.location;
        console.log(`✅ Google Geocoded: ${loc.lat}, ${loc.lng}`);
        return { lat: loc.lat, lng: loc.lng };
      } else {
        console.log(`⚠️ Google API status: ${response.data.status}`);
      }
    } catch (err) {
      console.log('⚠️ Google API error, using fallback:', err.message);
    }
  }
  return fallbackCoordinates(location);
};

const fallbackCoordinates = (location) => {
  const cities = {
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'noida': { lat: 28.5355, lng: 77.3910 },
    'gurgaon': { lat: 28.4595, lng: 77.0266 },
    'gurugram': { lat: 28.4595, lng: 77.0266 },
    'faridabad': { lat: 28.4089, lng: 77.3178 },
    'ghaziabad': { lat: 28.6692, lng: 77.4538 },
    'chandigarh': { lat: 30.7333, lng: 76.7794 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'kanpur': { lat: 26.4499, lng: 80.3319 },
    'agra': { lat: 27.1767, lng: 78.0081 },
    'varanasi': { lat: 25.3176, lng: 82.9739 },
    'allahabad': { lat: 25.4358, lng: 81.8463 },
    'prayagraj': { lat: 25.4358, lng: 81.8463 },
    'dehradun': { lat: 30.3165, lng: 78.0322 },
    'amritsar': { lat: 31.6340, lng: 74.8723 },
    'ludhiana': { lat: 30.9010, lng: 75.8573 },
    'jammu': { lat: 32.7266, lng: 74.8570 },
    'srinagar': { lat: 34.0837, lng: 74.7973 },
    'shimla': { lat: 31.1048, lng: 77.1734 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'navi mumbai': { lat: 19.0330, lng: 73.0297 },
    'thane': { lat: 19.2183, lng: 72.9781 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'nashik': { lat: 20.0059, lng: 73.7898 },
    'aurangabad': { lat: 19.8762, lng: 75.3433 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'vadodara': { lat: 22.3072, lng: 73.1812 },
    'rajkot': { lat: 22.3039, lng: 70.8022 },
    'goa': { lat: 15.4909, lng: 73.8278 },
    'panaji': { lat: 15.4909, lng: 73.8278 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'jabalpur': { lat: 23.1815, lng: 79.9864 },
    'gwalior': { lat: 26.2183, lng: 78.1828 },
    'raipur': { lat: 21.2514, lng: 81.6296 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'patna': { lat: 25.5941, lng: 85.1376 },
    'ranchi': { lat: 23.3441, lng: 85.3096 },
    'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
    'guwahati': { lat: 26.1445, lng: 91.7362 },
    'siliguri': { lat: 26.7271, lng: 88.3953 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kochi': { lat: 9.9312, lng: 76.2673 },
    'coimbatore': { lat: 11.0168, lng: 76.9558 },
    'madurai': { lat: 9.9252, lng: 78.1198 },
    'mysore': { lat: 12.2958, lng: 76.6394 },
    'mangalore': { lat: 12.9141, lng: 74.8560 },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
    'vijayawada': { lat: 16.5062, lng: 80.6480 },
    'tirupati': { lat: 13.6288, lng: 79.4192 },
    'warangal': { lat: 17.9784, lng: 79.5941 },
    'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
    'trivandrum': { lat: 8.5241, lng: 76.9366 },
    'kozhikode': { lat: 11.2588, lng: 75.7804 },
    'calicut': { lat: 11.2588, lng: 75.7804 },
    'bhimavaram': { lat: 16.5449, lng: 81.5212 },
    'kakinada': { lat: 16.9891, lng: 82.2475 },
    'rajahmundry': { lat: 17.0005, lng: 81.7942 },
    'guntur': { lat: 16.3067, lng: 80.4365 },
    'nellore': { lat: 14.4426, lng: 79.9865 },
    'kurnool': { lat: 15.8281, lng: 78.0373 },
    'anantapur': { lat: 14.6819, lng: 77.6005 },
    'kadapa': { lat: 14.4673, lng: 78.8241 },
    'cuddapah': { lat: 14.4673, lng: 78.8241 },
    'eluru': { lat: 16.7107, lng: 81.0952 },
    'ongole': { lat: 15.5057, lng: 80.0499 },
    'tenali': { lat: 16.2389, lng: 80.6436 },
    'chirala': { lat: 15.8289, lng: 80.3543 },
    'machilipatnam': { lat: 16.1802, lng: 81.1301 },
    'srikakulam': { lat: 18.2943, lng: 83.8968 },
    'vizianagaram': { lat: 18.1067, lng: 83.3947 },
    'tadepalligudem': { lat: 16.8136, lng: 81.5266 },
    'tanuku': { lat: 16.7544, lng: 81.6831 },
    'palakollu': { lat: 16.5233, lng: 81.7292 },
    'narasapuram': { lat: 16.4382, lng: 81.6991 },
    'salem': { lat: 11.6643, lng: 78.1460 },
    'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
    'trichy': { lat: 10.7905, lng: 78.7047 },
    'thanjavur': { lat: 10.7870, lng: 79.1378 },
    'vellore': { lat: 12.9165, lng: 79.1325 },
    'erode': { lat: 11.3410, lng: 77.7172 },
    'tirunelveli': { lat: 8.7139, lng: 77.7567 },
    'kanyakumari': { lat: 8.0883, lng: 77.5385 },
    'pondicherry': { lat: 11.9416, lng: 79.8083 },
    'puducherry': { lat: 11.9416, lng: 79.8083 },
    'hubli': { lat: 15.3647, lng: 75.1240 },
    'dharwad': { lat: 15.4589, lng: 75.0078 },
    'belgaum': { lat: 15.8497, lng: 74.4977 },
    'belagavi': { lat: 15.8497, lng: 74.4977 },
    'davangere': { lat: 14.4644, lng: 75.9218 },
    'bellary': { lat: 15.1394, lng: 76.9214 },
    'gulbarga': { lat: 17.3297, lng: 76.8343 },
    'kalaburagi': { lat: 17.3297, lng: 76.8343 },
    'udupi': { lat: 13.3409, lng: 74.7421 },
    'thrissur': { lat: 10.5276, lng: 76.2144 },
    'kollam': { lat: 8.8932, lng: 76.6141 },
    'alappuzha': { lat: 9.4981, lng: 76.3388 },
    'alleppey': { lat: 9.4981, lng: 76.3388 },
    'kottayam': { lat: 9.5916, lng: 76.5222 },
    'palakkad': { lat: 10.7867, lng: 76.6548 }
  };

  const city = location?.toLowerCase().trim();
  if (cities[city]) return cities[city];
  
  for (const [key, coords] of Object.entries(cities)) {
    if (city?.includes(key) || key.includes(city)) return coords;
  }
  
  return { lat: 20.5937, lng: 78.9629 };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

// ============ SEED DEMO DATA ============
async function seedDemoData() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding demo accounts...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      await User.create([
        { name: 'Admin User', email: 'admin@test.com', password: hashedPassword, role: 'admin' },
        { name: 'Rahul Kumar', email: 'student@test.com', password: hashedPassword, role: 'student', location: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
        { name: 'Priya Sharma', email: 'employer@test.com', password: hashedPassword, role: 'employer', company: 'TechCorp India' }
      ]);
      console.log('✅ Demo accounts ready!');
    }
  } catch (err) {
    console.log('Seed error:', err.message);
  }
}

// ============ ROUTES ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'Local Task Connect API',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected',
    googleMaps: GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_DEMO_KEY_HERE' ? 'Enabled ✅' : 'Using Fallback ⚠️'
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, location, company } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const coords = await getCoordinates(location);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name, email: email.toLowerCase(), password: hashedPassword,
      role: role || 'student', location: location || '',
      latitude: coords.lat, longitude: coords.lng,
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
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = generateToken(user._id);
    const { password: _, ...userData } = user;
    const unreadCount = await Notification.countDocuments({ user: user._id, isRead: false });
    
    res.json({ ...userData, token, unreadNotifications: unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get jobs with distance
app.get('/api/jobs', async (req, res) => {
  try {
    const { userLat, userLng, maxDistance, search } = req.query;
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    let jobs = await Job.find(query).populate('employer', 'name company').lean();
    
    if (userLat && userLng) {
      jobs = jobs.map(job => {
        const dist = calculateDistance(parseFloat(userLat), parseFloat(userLng), job.latitude, job.longitude);
        job.distance = dist;
        job.formattedDistance = dist !== null ? (dist < 1 ? `${Math.round(dist*1000)} m away` : `${dist} km away`) : 'Unknown';
        return job;
      });
      jobs.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      if (maxDistance) jobs = jobs.filter(j => j.distance && j.distance <= parseFloat(maxDistance));
    }
    
    res.json({ count: jobs.length, data: jobs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load jobs' });
  }
});

// Get single job
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employer', 'name company email').lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    const reviews = await Review.find({ reviewedUser: job.employer._id })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    res.json({ ...job, reviews });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load job' });
  }
});

// Employer jobs
app.get('/api/jobs/employer/myjobs', protect, async (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ message: 'Not authorized' });
  const jobs = await Job.find({ employer: req.user._id }).lean();
  
  const jobsWithApplicants = await Promise.all(jobs.map(async (job) => {
    const applications = await Application.find({ job: job._id })
      .populate('student', 'name email location skills')
      .lean();
    return { ...job, applicants: applications };
  }));
  
  res.json({ count: jobs.length, data: jobsWithApplicants });
});

// Post job
app.post('/api/jobs', protect, async (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ message: 'Only employers can post' });
  const { title, description, salary, location } = req.body;
  const coords = await getCoordinates(location);
  const job = await Job.create({
    title, description, salary, location,
    latitude: coords.lat, longitude: coords.lng,
    employer: req.user._id, company: req.user.company
  });
  
  await createNotification(req.user._id, `Job "${title}" posted successfully!`, 'job_posted', job._id);
  res.status(201).json(job);
});

// Delete job
app.delete('/api/jobs/:id', protect, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Not found' });
  if (job.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  await Job.findByIdAndDelete(req.params.id);
  await Application.deleteMany({ job: req.params.id });
  res.json({ message: 'Deleted' });
});

// Apply for job
app.post('/api/applications', protect, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can apply' });
  
  const { jobId } = req.body;
  const existing = await Application.findOne({ job: jobId, student: req.user._id });
  if (existing) return res.status(400).json({ message: 'Already applied' });
  
  await Application.create({ job: jobId, student: req.user._id });
  const job = await Job.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } }, { new: true });
  
  await createNotification(job.employer, `${req.user.name} applied for "${job.title}"`, 'application', jobId);
  await createNotification(req.user._id, `Application submitted for "${job.title}" at ${job.company}. We'll notify you when the employer reviews it.`, 'application', jobId);
  
  res.status(201).json({ message: 'Application submitted successfully! We will notify you when the employer reviews your profile.' });
});

// Get student's applications
app.get('/api/applications/student', protect, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Not authorized' });
  const applications = await Application.find({ student: req.user._id })
    .populate('job', 'title company location salary status')
    .lean();
  res.json({ count: applications.length, data: applications });
});

// Get job applications (employer)
app.get('/api/applications/job/:jobId', protect, async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  if (job.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  const applications = await Application.find({ job: req.params.jobId })
    .populate('student', 'name email location skills')
    .lean();
  res.json({ count: applications.length, data: applications });
});

// Update application status
app.put('/api/applications/:id', protect, async (req, res) => {
  const application = await Application.findById(req.params.id).populate('job');
  if (!application) return res.status(404).json({ message: 'Not found' });
  if (application.job.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  application.status = req.body.status;
  if (req.body.employerNotes) application.employerNotes = req.body.employerNotes;
  await application.save();
  
  const statusMessages = {
    'reviewed': 'has been reviewed',
    'shortlisted': 'shortlisted your profile! 🎉',
    'accepted': 'accepted your application! 🎉 Congratulations!',
    'rejected': 'has reviewed your application. Keep trying!'
  };
  
  const message = `Your application for "${application.job.title}" ${statusMessages[req.body.status] || 'has been updated'}`;
  await createNotification(application.student, message, 'status_update', application.job._id);
  
  res.json(application);
});

// ============ NOTIFICATION ROUTES ============
app.get('/api/notifications', protect, async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ count: notifications.length, data: notifications });
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Marked as read' });
});

app.put('/api/notifications/read-all', protect, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All marked as read' });
});

app.get('/api/notifications/unread-count', protect, async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ count });
});

// ============ REVIEW ROUTES ============
app.post('/api/reviews', protect, async (req, res) => {
  const { reviewedUserId, jobId, rating, comment, role } = req.body;
  
  if (!reviewedUserId || !rating || !comment || !role) {
    return res.status(400).json({ message: 'All fields required' });
  }
  
  const existing = await Review.findOne({ reviewer: req.user._id, reviewedUser: reviewedUserId, job: jobId });
  if (existing) return res.status(400).json({ message: 'You already reviewed this user for this job' });
  
  const review = await Review.create({ reviewer: req.user._id, reviewedUser: reviewedUserId, job: jobId, rating, comment, role });
  
  await createNotification(reviewedUserId, `${req.user.name} left you a ${rating}⭐ review: "${comment.substring(0, 50)}..."`, 'review', jobId);
  
  res.status(201).json(review);
});

app.get('/api/reviews/user/:userId', async (req, res) => {
  const reviews = await Review.find({ reviewedUser: req.params.userId })
    .populate('reviewer', 'name')
    .populate('job', 'title company')
    .sort({ createdAt: -1 })
    .lean();
  
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
  
  res.json({ count: reviews.length, averageRating: avgRating, data: reviews });
});

// ============ ADMIN ROUTES ============
app.get('/api/admin/users', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
  const users = await User.find().select('-password').lean();
  res.json({ count: users.length, data: users });
});

app.delete('/api/admin/users/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin' });
  await User.findByIdAndDelete(req.params.id);
  await Job.deleteMany({ employer: req.params.id });
  await Application.deleteMany({ student: req.params.id });
  res.json({ message: 'User deleted' });
});

app.get('/api/admin/stats', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
  const [totalUsers, students, employers, totalJobs, activeJobs, totalApps, totalReviews] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'employer' }),
    Job.countDocuments(), Job.countDocuments({ isActive: true }), Application.countDocuments(),
    Review.countDocuments()
  ]);
  res.json({ data: { users: { total: totalUsers, students, employers }, jobs: { total: totalJobs, active: activeJobs }, applications: { total: totalApps }, reviews: { total: totalReviews } } });
});

// ============ START ============
const PORT = process.env.PORT || 5000;
seedDemoData().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ Local Task Connect Server running on http://localhost:${PORT}`);
    console.log(`🗺️  Google Maps: ${GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_DEMO_KEY_HERE' ? 'Connected ✅' : 'Fallback Only ⚠️'}\n`);
  });
});