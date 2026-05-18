import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

// ==================== AUTH CONTEXT ====================
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return React.useContext(AuthContext);
}

// ==================== NAVBAR ====================
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">📍 LocalTalent Connect</Link>
        <div className="navbar-menu">
          {user ? (
            <>
              <span className="user-info">{user.name} ({user.role})</span>
              {user.role === 'student' && <Link to="/dashboard" className="nav-link">Find Jobs</Link>}
              {user.role === 'employer' && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
              {user.role === 'admin' && <Link to="/dashboard" className="nav-link">Admin</Link>}
              <button onClick={() => { logout(); navigate('/login'); }} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage() {
  const [email, setEmail] = useState('student@test.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>🔐 Login</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Sign in to your account</p>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>

        <div className="demo-credentials">
          <h3>Demo Accounts</h3>
          <p>👤 Student: student@test.com / 123456</p>
          <p>🏢 Employer: employer@test.com / 123456</p>
          <p>🛡️ Admin: admin@test.com / 123456</p>
        </div>
      </div>
    </div>
  );
}

// ==================== REGISTER PAGE ====================
function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student', location: '', company: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password) {
      return setError('Please fill all required fields');
    }

    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    try {
      const data = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      };

      if (form.role === 'student' && form.location) {
        data.location = form.location;
      }
      if (form.role === 'employer' && form.company) {
        data.company = form.company;
      }

      console.log('Sending registration:', data);

      const res = await axios.post(`${API}/auth/register`, data);
      console.log('Registration success:', res.data);
      
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>📝 Register</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Create your account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Password * (min 6 characters)</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>I am a *</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="student">Student / Job Seeker</option>
              <option value="employer">Employer</option>
            </select>
          </div>
          {form.role === 'student' && (
            <div className="form-group">
              <label>Your Location (City)</label>
              <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Mumbai, Bangalore, Delhi..." />
            </div>
          )}
          {form.role === 'employer' && (
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Your company name" />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

// ==================== STUDENT DASHBOARD ====================
function StudentDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    try {
      const params = {};
      if (user?.latitude && user?.longitude) {
        params.userLat = user.latitude;
        params.userLng = user.longitude;
      }
      const res = await axios.get(`${API}/jobs`, { params });
      setJobs(res.data.data || res.data.jobs || []);
    } catch (err) {
      console.log('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/applications`, { jobId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Applied successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchJobs();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Failed to apply'));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '10px' }}>👋 Welcome, {user?.name}!</h1>
      {user?.location && <p style={{ color: '#666', marginBottom: '30px' }}>📍 Your location: {user.location} - Showing nearest jobs first</p>}
      
      {message && <div className="alert alert-success">{message}</div>}

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <h3>No jobs found</h3>
          <p>Check back later for new opportunities</p>
        </div>
      ) : (
        <div className="job-grid">
          {jobs.map(job => (
            <div key={job._id} className="job-card">
              {job.formattedDistance && <span className="distance-badge">📍 {job.formattedDistance}</span>}
              <h3>{job.title}</h3>
              <p style={{ color: '#667eea', fontWeight: '500' }}>{job.company}</p>
              <p style={{ color: '#666' }}>📍 {job.location}</p>
              <p style={{ color: '#28a745', fontWeight: '500' }}>💰 {job.salary}</p>
              <p style={{ color: '#666', marginBottom: '15px' }}>{job.description?.substring(0, 100)}...</p>
              <button onClick={() => handleApply(job._id)} className="btn btn-primary btn-block">Apply Now</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== EMPLOYER DASHBOARD ====================
function EmployerDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', salary: '', location: '', jobType: 'full-time', category: 'technology'
  });

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/jobs/employer/myjobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(res.data.data || res.data.jobs || []);
    } catch (err) {
      console.log('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/jobs`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Job posted successfully!');
      setShowForm(false);
      setForm({ title: '', description: '', salary: '', location: '', jobType: 'full-time', category: 'technology' });
      fetchMyJobs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Failed to post job');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyJobs();
    } catch (err) {
      console.log('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1>🏢 Employer Dashboard</h1>
          <p style={{ color: '#666' }}>Welcome, {user?.name} | {user?.company}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Post New Job'}
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {showForm && (
        <div className="card" style={{ padding: '30px', marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px' }}>Post New Job</h2>
          <form onSubmit={handlePostJob}>
            <div className="form-group">
              <label>Job Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Salary *</label>
                <input type="text" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Publish Job</button>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-number">{jobs.length}</span><span className="stat-label">Total Jobs</span></div>
        <div className="stat-card"><span className="stat-number">{jobs.filter(j => j.isActive).length}</span><span className="stat-label">Active</span></div>
        <div className="stat-card"><span className="stat-number">{jobs.reduce((sum, j) => sum + (j.applicationsCount || 0), 0)}</span><span className="stat-label">Applications</span></div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        jobs.map(job => (
          <div key={job._id} className="card" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{job.title}</h3>
              <p style={{ color: '#666' }}>📍 {job.location} | 💰 {job.salary}</p>
              <p style={{ color: '#666' }}>📝 {job.applicationsCount || 0} applications</p>
            </div>
            <button onClick={() => handleDelete(job._id)} className="btn btn-danger" style={{ width: 'auto' }}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
}

// ==================== ADMIN DASHBOARD ====================
function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [usersRes, jobsRes] = await Promise.all([
          axios.get(`${API}/admin/users`, { headers }),
          axios.get(`${API}/jobs`)
        ]);
        setUsers(usersRes.data.data || usersRes.data.users || []);
        setJobs(jobsRes.data.data || jobsRes.data.jobs || []);
      } catch (err) {
        console.log('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = {
    totalUsers: users.length,
    students: users.filter(u => u.role === 'student').length,
    employers: users.filter(u => u.role === 'employer').length,
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.isActive).length
  };

  return (
    <div>
      <h1 style={{ marginBottom: '10px' }}>🛡️ Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>System overview and management</p>

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-number">{stats.totalUsers}</span><span className="stat-label">Total Users</span></div>
        <div className="stat-card"><span className="stat-number">{stats.students}</span><span className="stat-label">Students</span></div>
        <div className="stat-card"><span className="stat-number">{stats.employers}</span><span className="stat-label">Employers</span></div>
        <div className="stat-card"><span className="stat-number">{stats.totalJobs}</span><span className="stat-label">Total Jobs</span></div>
        <div className="stat-card"><span className="stat-number">{stats.activeJobs}</span><span className="stat-label">Active Jobs</span></div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('users')} className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`} style={{ width: 'auto' }}>Users</button>
        <button onClick={() => setActiveTab('jobs')} className={`btn ${activeTab === 'jobs' ? 'btn-primary' : ''}`} style={{ width: 'auto' }}>Jobs</button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        <>
          {activeTab === 'users' && users.map(u => (
            <div key={u._id} className="card" style={{ padding: '15px 20px', marginBottom: '10px' }}>
              <strong>{u.name}</strong> - {u.email} - <span className="tag">{u.role}</span>
              {u.location && <span style={{ marginLeft: '10px', color: '#666' }}>📍 {u.location}</span>}
            </div>
          ))}
          {activeTab === 'jobs' && jobs.map(j => (
            <div key={j._id} className="card" style={{ padding: '15px 20px', marginBottom: '10px' }}>
              <strong>{j.title}</strong> - {j.company} - 📍 {j.location} - 💰 {j.salary}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ==================== MAIN APP ====================
function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'student') return <StudentDashboard />;
  if (user.role === 'employer') return <EmployerDashboard />;
  if (user.role === 'admin') return <AdminDashboard />;
  
  return <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Navbar />
          <div className="main-content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;