import React, { useState, useEffect } from 'react';
import { getClasses, getAllFaculties, getCurrentUser, getLecturesByLecturer } from "../api";

const LectureClasses = ({ onNavigate }) => {
  const [classes, setClasses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const isLecturer = currentUser && currentUser.role === 'lecturer';

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const userData = getCurrentUser();
        setCurrentUser(userData);
        
        console.log("Current user:", userData);

        // Fetch faculties and classes in parallel
        const [facultiesData, classesData] = await Promise.all([
          getAllFaculties(),
          getClasses()
        ]);

        console.log("Fetched faculties:", facultiesData);
        console.log("Fetched classes:", classesData);
        
        setFaculties(facultiesData);

        let processedClasses = classesData;

        if (userData?.role === 'lecturer') {
          // For lecturers, we need to determine which classes they have lectures for
          try {
            const lecturerLectures = await getLecturesByLecturer(userData.id);
            console.log("Lecturer's lectures:", lecturerLectures);
            
            if (lecturerLectures && lecturerLectures.length > 0) {
              // Get unique class IDs from lectures
              const lectureClassIds = [...new Set(lecturerLectures.map(lecture => lecture.class_id))];
              console.log("Class IDs from lectures:", lectureClassIds);
              
              // Filter classes to only show those the lecturer has taught in
              processedClasses = classesData.filter(cls => lectureClassIds.includes(cls.id));
              console.log("Filtered classes for lecturer:", processedClasses);
            } else {
              console.log("No lectures found for lecturer");
              processedClasses = [];
            }
          } catch (error) {
            console.error("Error fetching lecturer lectures:", error);
            // If we can't get lectures, show no classes for lecturer
            processedClasses = [];
          }
        }

        setClasses(processedClasses || []);
        
      } catch (error) {
        console.error("Failed to initialize data:", error);
        setMessage("Failed to load classes: " + (error.message || 'Unknown error'));
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const classesData = await getClasses();
      let processedClasses = classesData;
      
      if (currentUser?.role === 'lecturer') {
        try {
          const lecturerLectures = await getLecturesByLecturer(currentUser.id);
          
          if (lecturerLectures && lecturerLectures.length > 0) {
            const lectureClassIds = [...new Set(lecturerLectures.map(lecture => lecture.class_id))];
            processedClasses = classesData.filter(cls => lectureClassIds.includes(cls.id));
          } else {
            processedClasses = [];
          }
        } catch (error) {
          console.error("Error refreshing lecturer lectures:", error);
          processedClasses = [];
        }
      }

      setClasses(processedClasses || []);
      setMessage('Classes refreshed successfully!');
      
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error("Failed to refresh data:", error);
      setMessage("Failed to refresh classes: " + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getFacultyName = (facultyId) => {
    if (!facultyId) return "No Faculty";
    const faculty = faculties.find(f => f.id === facultyId);
    return faculty ? faculty.name : "Unknown Faculty";
  };

  const formatTimeDisplay = (time) => {
    if (!time) return "Not scheduled";
    
    const timeStr = typeof time === 'string' ? time : String(time);
    const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
    
    const timeMappings = {
      '09:00:00': '09:00 - 10:30',
      '10:30:00': '10:30 - 12:00', 
      '14:00:00': '14:00 - 15:30',
      '15:30:00': '15:30 - 17:00',
      '09:00': '09:00 - 10:30',
      '10:30': '10:30 - 12:00',
      '14:00': '14:00 - 15:30',
      '15:30': '15:30 - 17:00'
    };
    
    return timeMappings[timePart] || timePart;
  };

  const getWeekdayFromTime = (time) => {
    if (!time) return 'Schedule not set';
    
    const timeStr = typeof time === 'string' ? time : String(time);
    const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
    
    const timeMappings = {
      '09:00:00': 'Mon, Wed, Fri',
      '10:30:00': 'Tue, Thu',
      '14:00:00': 'Mon, Wed',
      '15:30:00': 'Tue, Thu, Fri',
      '09:00': 'Mon, Wed, Fri',
      '10:30': 'Tue, Thu',
      '14:00': 'Mon, Wed',
      '15:30': 'Tue, Thu, Fri'
    };
    
    return timeMappings[timePart] || 'Mon, Wed, Fri';
  };

  const getClassStatus = (classItem) => {
    if (!classItem.created_at) return { status: 'active', label: 'Active', color: 'status-active' };
    
    try {
      const created = new Date(classItem.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) return { status: 'new', label: 'New', color: 'status-new' };
      if (classItem.total_registered_students > 40) return { status: 'popular', label: 'Popular', color: 'status-popular' };
      if (classItem.total_registered_students < 10) return { status: 'small', label: 'Small', color: 'status-small' };
      return { status: 'active', label: 'Active', color: 'status-active' };
    } catch (error) {
      return { status: 'active', label: 'Active', color: 'status-active' };
    }
  };

  const calculateStats = () => {
    const filteredClasses = getFilteredClasses();
    const totalClasses = filteredClasses.length;
    const totalStudents = filteredClasses.reduce((sum, cls) => sum + (parseInt(cls.total_registered_students) || 0), 0);
    const averageClassSize = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;

    return {
      totalClasses,
      totalStudents,
      averageClassSize,
      activeClasses: totalClasses
    };
  };

  const getFilteredClasses = () => {
    if (!classes || classes.length === 0) return [];
    
    return classes.filter(cls => {
      const facultyMatch = filterFaculty === 'all' || 
                          (cls.faculty_id && cls.faculty_id.toString() === filterFaculty);
      const statusMatch = filterStatus === 'all' || getClassStatus(cls).status === filterStatus;
      return facultyMatch && statusMatch;
    });
  };

  const filteredClasses = getFilteredClasses();
  const stats = calculateStats();

  const handleViewLectures = (classId) => {
    onNavigate('Lectures', { classId });
  };

  const handleCreateLecture = (classItem) => {
    onNavigate('Create Lecture', { 
      classId: classItem.id,
      className: classItem.class_name 
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading classes...</p>
      </div>
    );
  }

  return (
    <div className="lecture-classes-container">
      <div className="breadcrumb">
        <button className="breadcrumb-item" onClick={() => onNavigate('Dashboard')}>
          Home
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">
          {isLecturer ? 'My Teaching Classes' : 'All Classes'}
        </span>
      </div>

      <div className="quick-navigation">
        <h4>Quick Navigation</h4>
        <div className="nav-buttons">
          <button onClick={() => onNavigate('Dashboard')}>Dashboard</button>
          <button onClick={() => onNavigate('Lectures')}>Lectures</button>
          {isLecturer && (
            <button onClick={() => onNavigate('Create Lecture')}>Create Lecture</button>
          )}
          <button onClick={() => onNavigate('Monitoring')}>Monitoring</button>
        </div>
      </div>

      <div className="classes-content">
        <header className="classes-header">
          <div className="header-text">
            <h1>{isLecturer ? 'My Teaching Classes' : 'All Classes'}</h1>
            <p>
              {isLecturer 
                ? "View classes you have taught or are scheduled to teach"
                : "Browse and manage all classes in the system"
              }
            </p>
            {isLecturer && classes.length === 0 && (
              <div className="access-warning">
                <p>⚠️ You haven't taught any classes yet. Create your first lecture to get started.</p>
              </div>
            )}
          </div>
          <div className="header-actions">
            <button 
              onClick={refreshData}
              className="btn btn-outline"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            {isLecturer && classes.length > 0 && (
              <button 
                onClick={() => onNavigate('Create Lecture')}
                className="btn btn-primary"
              >
                Create New Lecture
              </button>
            )}
          </div>
        </header>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {classes.length > 0 && (
          <>
            <div className="filters-section">
              <div className="filter-group">
                <label>Filter by Faculty:</label>
                <select 
                  value={filterFaculty} 
                  onChange={(e) => setFilterFaculty(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Faculties</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Filter by Status:</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="active">Active</option>
                  <option value="popular">Popular</option>
                  <option value="small">Small</option>
                </select>
              </div>
              <div className="filter-group">
                <button 
                  onClick={() => {
                    setFilterFaculty('all');
                    setFilterStatus('all');
                  }}
                  className="btn btn-outline"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-content">
                  <h3>{stats.totalClasses}</h3>
                  <p>Total Classes</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <h3>{stats.totalStudents}</h3>
                  <p>Total Students</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <h3>{stats.averageClassSize}</h3>
                  <p>Avg. Class Size</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <h3>{stats.activeClasses}</h3>
                  <p>Active Classes</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && (
          <div className="classes-grid">
            {filteredClasses.map(cls => {
              const status = getClassStatus(cls);
              const studentCount = parseInt(cls.total_registered_students) || 0;
              const capacityPercentage = Math.min((studentCount / 50) * 100, 100);
              
              return (
                <div key={cls.id} className="class-card">
                  <div className="card-header">
                    <div className="class-info">
                      <h3 className="class-title">{cls.class_name || 'Unnamed Class'}</h3>
                      <span className="class-code">ID: {cls.id}</span>
                    </div>
                    <div className={`class-status ${status.color}`}>
                      {status.label}
                    </div>
                  </div>
                  
                  <div className="class-details">
                    <div className="detail-item">
                      <span className="detail-label">Students:</span>
                      <span className="detail-value">{studentCount} enrolled</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Schedule:</span>
                      <span className="detail-value">
                        {formatTimeDisplay(cls.scheduled_time)}
                        <br />
                        <small>{getWeekdayFromTime(cls.scheduled_time)}</small>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{cls.venue || 'Not specified'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Faculty:</span>
                      <span className="detail-value">
                        {cls.faculty_name || getFacultyName(cls.faculty_id)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-progress">
                    <div className="progress-info">
                      <span className="progress-label">Class Capacity</span>
                      <span className="progress-value">
                        {Math.round(capacityPercentage)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${capacityPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      onClick={() => handleViewLectures(cls.id)}
                      className="btn btn-sm btn-outline"
                    >
                      View Lectures
                    </button>
                    {isLecturer && (
                      <button 
                        onClick={() => handleCreateLecture(cls)}
                        className="btn btn-sm btn-primary"
                      >
                        Create Lecture
                      </button>
                    )}
                  </div>

                  <div className="card-footer">
                    <div className="footer-meta">
                      <span className="meta-text">
                        Created: {cls.created_at ? new Date(cls.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredClasses.length === 0 && classes.length > 0 && (
          <div className="no-classes">
            <h3>No Classes Match Your Filters</h3>
            <p>Try adjusting your filters to see more classes.</p>
            <button 
              onClick={() => {
                setFilterFaculty('all');
                setFilterStatus('all');
              }}
              className="btn btn-primary"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {!loading && classes.length === 0 && (
          <div className="no-classes">
            <h3>No Classes Found</h3>
            <p>
              {isLecturer 
                ? "You haven't taught any classes yet. Create your first lecture report to get started."
                : "No classes have been created in the system yet. Classes can be created in the Class Management section."
              }
            </p>
            {isLecturer ? (
              <button 
                onClick={() => onNavigate('Create Lecture')}
                className="btn btn-primary"
              >
                Create First Lecture
              </button>
            ) : (
              <button 
                onClick={() => onNavigate('Class Management')}
                className="btn btn-primary"
              >
                Go to Class Management
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureClasses;