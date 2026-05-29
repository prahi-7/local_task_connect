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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.count);
    } catch (err) {}
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">📍 Local Task Connect</Link>
        <div className="navbar-menu">
          {user ? (
            <>
              <span className="user-info">{user.name} ({user.role})</span>
              {user.role === 'student' && <Link to="/dashboard" className="nav-link">Find Jobs</Link>}
              {user.role === 'employer' && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
              {user.role === 'admin' && <Link to="/dashboard" className="nav-link">Admin Panel</Link>}
              <Link to="/notifications" className="nav-link">
                🔔 {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </Link>
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
      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
          <h3>🔑 Demo Accounts</h3>
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
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', location: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) return setError('Please fill all required fields');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const data = { name: form.name, email: form.email, password: form.password, role: form.role };
      if (form.role === 'student' && form.location) data.location = form.location;
      if (form.role === 'employer' && form.company) data.company = form.company;
      const res = await axios.post(`${API}/api/auth/register`, data);
      login(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
          <div className="form-group"><label>Full Name *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
          <div className="form-group"><label>Password * (min 6)</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
          <div className="form-group">
            <label>I am a *</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="student">Student</option>
              <option value="employer">Employer</option>
            </select>
          </div>
          {form.role === 'student' && <div className="form-group"><label>Location (City)</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Mumbai, Bangalore..." /></div>}
          {form.role === 'employer' && <div className="form-group"><label>Company Name</label><input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Your company" /></div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px' }}>Already have account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

// ==================== NOTIFICATIONS PAGE ====================
function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data.data);
    } catch (err) {} finally { setLoading(false); }
  };

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token');
    await axios.put(`${API}/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchNotifications();
  };

  const markAllRead = async () => {
    const token = localStorage.getItem('token');
    await axios.put(`${API}/api/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchNotifications();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>🔔 Notifications</h1>
        <button onClick={markAllRead} className="btn btn-primary" style={{ width: 'auto' }}>Mark All Read</button>
      </div>
      {loading ? <div className="spinner"></div> : notifications.length === 0 ? (
        <div className="empty-state"><h3>No notifications</h3></div>
      ) : (
        notifications.map(n => (
          <div key={n._id} className="card" style={{ padding: '15px 20px', marginBottom: '10px', background: n.isRead ? 'white' : '#f0f4ff', borderLeft: n.isRead ? 'none' : '4px solid #667eea' }}>
            <p>{n.message}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <small style={{ color: '#999' }}>{new Date(n.createdAt).toLocaleString()}</small>
              {!n.isRead && <button onClick={() => markAsRead(n._id)} className="btn" style={{ width: 'auto', padding: '3px 12px', fontSize: '0.8rem' }}>Mark Read</button>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ==================== STUDENT DASHBOARD ====================
function StudentDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxDistance, setMaxDistance] = useState('50');
  const [myApplications, setMyApplications] = useState([]);

  useEffect(() => { fetchJobs(); fetchMyApplications(); }, [user]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (user?.latitude && user?.longitude) { params.userLat = user.latitude; params.userLng = user.longitude; params.maxDistance = maxDistance; }
      if (searchTerm) params.search = searchTerm;
      const res = await axios.get(`${API}/api/jobs`, { params });
      setJobs(res.data.data || []);
    } catch (err) {} finally { setLoading(false); }
  };

  const fetchMyApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/applications/student`, { headers: { Authorization: `Bearer ${token}` } });
      setMyApplications(res.data.data || []);
    } catch (err) {}
  };

  const handleApply = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/applications`, { jobId }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(res.data.message || '✅ Applied successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchJobs();
      fetchMyApplications();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || 'Failed to apply'));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const appliedJobIds = myApplications.map(a => a.job?._id);

  return (
    <div>
      <h1 style={{ marginBottom: '10px' }}>👋 Welcome, {user?.name}!</h1>
      {user?.location && <p style={{ color: '#666', marginBottom: '20px' }}>📍 Your location: {user.location} - Showing nearest jobs first</p>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="filter-bar">
        <input type="text" placeholder="🔍 Search jobs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={e => e.key === 'Enter' && fetchJobs()} className="filter-search" />
        <select value={maxDistance} onChange={e => setMaxDistance(e.target.value)}>
          <option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="25">Within 25 km</option><option value="50">Within 50 km</option><option value="10000">All distances</option>
        </select>
        <button onClick={fetchJobs} className="btn btn-primary">Apply Filters</button>
      </div>

      {/* My Applications Section */}
      {myApplications.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '15px' }}>📋 My Applications ({myApplications.length})</h2>
          {myApplications.map(app => (
            <div key={app._id} className="card" style={{ padding: '15px 20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{app.job?.title}</strong> at {app.job?.company}
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>📍 {app.job?.location}</p>
                </div>
                <span className={`status-badge ${app.status === 'accepted' ? 'active' : app.status === 'rejected' ? 'inactive' : ''}`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="spinner"></div> : jobs.length === 0 ? (
        <div className="empty-state"><h3>No jobs found</h3></div>
      ) : (
        <div className="job-grid">
          {jobs.map(job => (
            <div key={job._id} className="job-card">
              {job.formattedDistance && <span className="distance-badge">📍 {job.formattedDistance}</span>}
              <h3>{job.title}</h3>
              <p style={{ color: '#667eea', fontWeight: '500' }}>{job.company}</p>
              <p style={{ color: '#666' }}>📍 {job.location} | 💰 {job.salary}</p>
              <p style={{ color: '#666', marginBottom: '15px' }}>{job.description?.substring(0, 100)}...</p>
              {appliedJobIds.includes(job._id) ? (
                <button className="btn" style={{ background: '#28a745', width: '100%' }} disabled>✅ Applied</button>
              ) : (
                <button onClick={() => handleApply(job._id)} className="btn btn-primary btn-block">Apply Now</button>
              )}
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
  const [selectedJob, setSelectedJob] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', salary: '', location: '', jobType: 'full-time', category: 'technology' });

  useEffect(() => { fetchMyJobs(); }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/jobs/employer/myjobs`, { headers: { Authorization: `Bearer ${token}` } });
      setJobs(res.data.data || []);
    } catch (err) {} finally { setLoading(false); }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/jobs`, form, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('✅ Job posted!');
      setShowForm(false);
      setForm({ title: '', description: '', salary: '', location: '', jobType: 'full-time', category: 'technology' });
      fetchMyJobs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('❌ Failed'); setTimeout(() => setMessage(''), 3000); }
  };

  const handleUpdateStatus = async (applicationId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/applications/${applicationId}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchMyJobs();
      setMessage(`✅ Application ${status}!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {}
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div><h1>🏢 Employer Dashboard</h1><p style={{ color: '#666' }}>Welcome, {user?.name} | {user?.company}</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">{showForm ? '✕ Cancel' : '+ Post New Job'}</button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {showForm && (
        <div className="card" style={{ padding: '30px', marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px' }}>Post New Job</h2>
          <form onSubmit={handlePostJob}>
            <div className="form-group"><label>Job Title *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="form-group"><label>Description *</label><textarea rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group"><label>Salary *</label><input type="text" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} required /></div>
              <div className="form-group"><label>Location *</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required /></div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Publish Job</button>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-number">{jobs.length}</span><span className="stat-label">Total Jobs</span></div>
        <div className="stat-card"><span className="stat-number">{jobs.reduce((sum, j) => sum + (j.applicants?.length || 0), 0)}</span><span className="stat-label">Total Applicants</span></div>
      </div>

      {loading ? <div className="spinner"></div> : jobs.map(job => (
        <div key={job._id} className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3>{job.title}</h3>
              <p style={{ color: '#666' }}>📍 {job.location} | 💰 {job.salary}</p>
              <p style={{ color: '#667eea', fontWeight: '500' }}>
                📝 {job.applicants?.length || 0} Applicants
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSelectedJob(selectedJob?._id === job._id ? null : job)} className="btn" style={{ width: 'auto', padding: '8px 15px' }}>
                {selectedJob?._id === job._id ? 'Hide' : 'View'} Applicants
              </button>
              <button onClick={async () => { if (window.confirm('Delete?')) { const token = localStorage.getItem('token'); await axios.delete(`${API}/jobs/${job._id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchMyJobs(); } }} className="btn btn-danger" style={{ width: 'auto', padding: '8px 15px' }}>Delete</button>
            </div>
          </div>

          {/* Applicants List */}
          {selectedJob?._id === job._id && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
              <h4 style={{ marginBottom: '15px' }}>Applicants ({job.applicants?.length || 0})</h4>
              {job.applicants?.length === 0 ? (
                <p style={{ color: '#666' }}>No applicants yet</p>
              ) : (
                job.applicants.map(app => (
                  <div key={app._id} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{app.student?.name}</strong>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>{app.student?.email}</p>
                        {app.student?.location && <p style={{ color: '#666', fontSize: '0.9rem' }}>📍 {app.student.location}</p>}
                        {app.student?.skills?.length > 0 && (
                          <div style={{ marginTop: '5px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {app.student.skills.map(s => <span key={s} className="tag">{s}</span>)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`status-badge ${app.status === 'accepted' ? 'active' : app.status === 'rejected' ? 'inactive' : ''}`}>
                          {app.status}
                        </span>
                        <select value={app.status} onChange={e => handleUpdateStatus(app._id, e.target.value)} style={{ padding: '5px', borderRadius: '5px', border: '1px solid #ddd' }}>
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="accepted">Accept ✅</option>
                          <option value="rejected">Reject ❌</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== ADMIN DASHBOARD ====================
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, jobsRes] = await Promise.all([
        axios.get(`${API}/api/admin/stats`, { headers }),
        axios.get(`${API}/api/admin/users`, { headers }),
        axios.get(`${API}/api/jobs`)
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data || []);
      setJobs(jobsRes.data.data || []);
    } catch (err) { console.log('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete "${userName}" permanently?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(`✅ "${userName}" deleted!`);
      fetchAllData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('❌ Failed'); }
  };

  const handleDeleteJob = async (jobId, jobTitle) => {
    if (!window.confirm(`Delete "${jobTitle}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(`✅ "${jobTitle}" deleted!`);
      fetchAllData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('❌ Failed'); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: '50px' }}></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1>🛡️ Admin Panel</h1>
        <button onClick={fetchAllData} className="btn btn-primary" style={{ width: 'auto' }}>🔄 Refresh</button>
      </div>
      <p style={{ color: '#666', marginBottom: '30px' }}>Manage users, jobs, and monitor platform activity</p>

      {message && <div className="alert alert-success">{message}</div>}

      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><span className="stat-number">{stats.users?.total || 0}</span><span className="stat-label">Total Users</span></div>
          <div className="stat-card"><span className="stat-number">{stats.users?.students || 0}</span><span className="stat-label">Students</span></div>
          <div className="stat-card"><span className="stat-number">{stats.users?.employers || 0}</span><span className="stat-label">Employers</span></div>
          <div className="stat-card"><span className="stat-number">{stats.jobs?.total || 0}</span><span className="stat-label">Total Jobs</span></div>
          <div className="stat-card"><span className="stat-number">{stats.jobs?.active || 0}</span><span className="stat-label">Active Jobs</span></div>
          <div className="stat-card"><span className="stat-number">{stats.applications?.total || 0}</span><span className="stat-label">Applications</span></div>
          <div className="stat-card"><span className="stat-number">{stats.reviews?.total || 0}</span><span className="stat-label">Reviews</span></div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button onClick={() => setActiveTab('users')} className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto' }}>
          👥 Users ({users.length})
        </button>
        <button onClick={() => setActiveTab('jobs')} className={`btn ${activeTab === 'jobs' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto' }}>
          💼 Jobs ({jobs.length})
        </button>
      </div>

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="data-table">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Company</th><th>Joined</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="tag">{u.role}</span></td>
                  <td>{u.location || '—'}</td>
                  <td>{u.company || '—'}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u._id, u.name)} className="btn btn-danger" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.8rem' }}>
                        🗑️ Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Jobs Table */}
      {activeTab === 'jobs' && (
        <div className="data-table">
          <table>
            <thead>
              <tr><th>Title</th><th>Company</th><th>Location</th><th>Salary</th><th>Type</th><th>Applications</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j._id}>
                  <td><strong>{j.title}</strong></td>
                  <td>{j.company}</td>
                  <td>📍 {j.location}</td>
                  <td>💰 {j.salary}</td>
                  <td><span className="tag">{j.jobType}</span></td>
                  <td>{j.applicationsCount || 0}</td>
                  <td><span className={`status-badge ${j.isActive ? 'active' : 'inactive'}`}>{j.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button onClick={() => handleDeleteJob(j._id, j.title)} className="btn btn-danger" style={{ width: 'auto', padding: '5px 15px', fontSize: '0.8rem' }}>
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;