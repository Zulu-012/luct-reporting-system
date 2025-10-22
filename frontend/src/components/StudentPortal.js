
import React, { useState, useEffect } from "react";
import Rating from "./Rating";
import Monitoring from "./Monitoring";
import LectureClasses from "./LectureClasses";
import { getClasses, getLecturesByClass, getRating } from "../api";

export default function StudentPortal({ user, onLogout, onNavigate }) {
  const [currentView, setCurrentView] = useState("portal");
  const [stats, setStats] = useState({
    totalLectures: 0,
    attendedLectures: 0,
    averageRating: 0,
    pendingRatings: 0
  });
  const [recentLectures, setRecentLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentView === "portal") {
      loadStudentData();
    }
  }, [currentView]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      // Get classes first (students should have access to their classes)
      const classes = await getClasses();
      
      // Get lectures for each class
      let allLectures = [];
      for (const cls of classes) {
        try {
          const classLectures = await getLecturesByClass(cls.id);
          allLectures = [...allLectures, ...classLectures];
        } catch (error) {
          console.error(`Error fetching lectures for class ${cls.id}:`, error);
        }
      }
      
      // Filter only past lectures
      const pastLectures = allLectures.filter(lecture => 
        lecture.date_of_lecture && new Date(lecture.date_of_lecture) <= new Date()
      );

      // Calculate student-specific statistics
      const totalLectures = pastLectures.length;
      const attendedLectures = pastLectures.filter(lec => 
        lec.actual_students_present > 0
      ).length;
      
      // Calculate average rating given by student
      const ratingPromises = pastLectures.map(lecture => getRating(lecture.id));
      const ratings = await Promise.all(ratingPromises);
      const validRatings = ratings.filter(rating => rating && rating.average_rating);
      const averageRating = validRatings.length > 0 
        ? validRatings.reduce((sum, rating) => sum + parseFloat(rating.average_rating), 0) / validRatings.length
        : 0;

      // Get recent lectures (last 3)
      const recent = pastLectures.slice(0, 3).map(lec => ({
        id: lec.id,
        title: lec.course_name,
        date: lec.date_of_lecture,
        lecturer: lec.lecturer_name,
        attendance: `${lec.actual_students_present || 0}/${lec.total_registered_students || 0}`
      }));

      setStats({
        totalLectures,
        attendedLectures,
        averageRating: Math.round(averageRating * 10) / 10,
        pendingRatings: Math.max(0, totalLectures - validRatings.length)
      });
      setRecentLectures(recent);
    } catch (error) {
      console.error("Failed to load student data:", error);
      // Set default stats if loading fails
      setStats({
        totalLectures: 0,
        attendedLectures: 0,
        averageRating: 0,
        pendingRatings: 0
      });
      setRecentLectures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (page) => {
    if (typeof onNavigate === 'function') {
      onNavigate(page);
    } else {
      setCurrentView(page);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case "rating":
        return <Rating user={user} onNavigate={handleNavigation} />;
      case "monitoring":
        return <LectureClasses user={user} onNavigate={handleNavigation} />;
      default:
        return (
          <div className="student-portal">
            {/* Header */}
            <div className="content-header">
              <div className="header-left">
                <h1>Student Portal</h1>
                <p>Welcome to your learning dashboard</p>
              </div>
              <div className="header-right">
                <div className="user-welcome">
                  <span>Hello, <strong>{user.name}</strong></span>
                  <button className="btn btn-outline" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="portal-content">
              {/* Quick Stats */}
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalLectures}</div>
                    <div className="stat-label">Total Lectures</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <div className="stat-value">{stats.attendedLectures}</div>
                    <div className="stat-label">Lectures Attended</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <div className="stat-value">{stats.averageRating}/5</div>
                    <div className="stat-label">Avg. Rating Given</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-info">
                    <div className="stat-value">{stats.pendingRatings}</div>
                    <div className="stat-label">Pending Ratings</div>
                  </div>
                </div>
              </div>

              {/* Welcome Section */}
              <div className="welcome-section">
                <div className="welcome-card">
                  <div className="welcome-header">
                    <div className="welcome-text">
                      <h1>Welcome back, {user.name}!</h1>
                      <p className="user-role">STUDENT PORTAL</p>
                      <p className="welcome-message">
                        Ready to continue your learning journey? Check your recent lectures, 
                        provide feedback, and monitor your academic progress.
                      </p>
                    </div>
                    <div className="welcome-graphic">
                      <div className="student-avatar"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Actions Grid */}
              <div className="actions-section">
                <h2 className="section-title">Quick Actions</h2>
                <div className="portal-menu">
                  <div className="menu-card primary" onClick={() => handleNavigation("rating")}>
                    <div className="card-content">
                      <h3>Rate Lectures</h3>
                      <p>Provide feedback and ratings for your recent lectures. Help improve teaching quality.</p>
                      <div className="card-badge">
                        {stats.pendingRatings} pending
                      </div>
                    </div>
                    <div className="card-arrow">→</div>
                  </div>
                  
                  <div className="menu-card secondary" onClick={() => handleNavigation("monitoring")}>
                    <div className="card-content">
                      <h3>View Monitoring</h3>
                      <p>Monitor lecture reports, attendance records, and academic performance metrics.</p>
                      <div className="card-badge">
                        Updated daily
                      </div>
                    </div>
                    <div className="card-arrow">→</div>
                  </div>

                  <div className="menu-card info">
                    <div className="card-content">
                      <h3>Academic Progress</h3>
                      <p>Track your attendance rate and engagement across all courses and lectures.</p>
                      <div className="progress-stats">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${stats.totalLectures > 0 ? (stats.attendedLectures / stats.totalLectures) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          {stats.totalLectures > 0 ? Math.round((stats.attendedLectures / stats.totalLectures) * 100) : 0}% Attendance
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="menu-card success">
                    <div className="card-content">
                      <h3>Learning Goals</h3>
                      <p>Set and track your academic goals for this semester. Stay motivated and focused.</p>
                      <div className="goals-list">
                        <div className="goal-item">Complete all assignments</div>
                        <div className="goal-item">Maintain 85%+ attendance</div>
                        <div className="goal-item pending">Participate in 3+ discussions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h2 className="section-title">Recent Lectures</h2>
                <div className="activity-list">
                  {recentLectures.map(lecture => (
                    <div key={lecture.id} className="activity-card">
                      <div className="activity-content">
                        <h4>{lecture.title}</h4>
                        <p>By {lecture.lecturer} • {new Date(lecture.date).toLocaleDateString()}</p>
                        <div className="activity-meta">
                          <span className="attendance-badge">Attendance: {lecture.attendance}</span>
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => handleNavigation("rating")}
                          >
                            Rate Lecture
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentLectures.length === 0 && !loading && (
                    <div className="no-activity">
                      <h3>No Recent Lectures</h3>
                      <p>Your recent lecture activity will appear here.</p>
                    </div>
                  )}
                  {loading && (
                    <div className="loading-activity">
                      <div className="loading-spinner"></div>
                      <p>Loading recent lectures...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Tips */}
              <div className="tips-section">
                <h2 className="section-title">Student Tips</h2>
                <div className="tips-grid">
                  <div className="tip-card">
                    <h4>Regular Feedback</h4>
                    <p>Provide timely feedback after each lecture to help lecturers improve their teaching methods.</p>
                  </div>
                  <div className="tip-card">
                    <h4>Track Attendance</h4>
                    <p>Monitor your attendance regularly to ensure you meet course requirements.</p>
                  </div>
                  <div className="tip-card">
                    <h4>Set Goals</h4>
                    <p>Set clear academic goals for each semester and track your progress.</p>
                  </div>
                  <div className="tip-card">
                    <h4>Engage Actively</h4>
                    <p>Participate in class discussions and activities for better learning outcomes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return renderContent();
}
