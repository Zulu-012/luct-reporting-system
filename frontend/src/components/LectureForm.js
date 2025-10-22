import React, { useState, useEffect, useCallback } from "react";
import { getClasses, getCourses, postLecture, getCurrentUser, fetchLectures, postRating, postFeedback } from "../api";

export default function LectureForm({ user }) {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    class_id: "",
    course_id: "",
    week_of_reporting: "",
    date_of_lecture: "",
    actual_students_present: "",
    topic_taught: "",
    learning_outcomes: "",
    recommendations: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Add state for student rating functionality
  const [lectures, setLectures] = useState([]);
  const [ratings, setRatings] = useState({});
  const [ratingLoading, setRatingLoading] = useState(false);
  const [selectedLectureForRating, setSelectedLectureForRating] = useState(null);
  const [userFeedback, setUserFeedback] = useState("");

  // Fetch ALL classes regardless of assignment
  const fetchClasses = useCallback(async () => {
    try {
      console.log("Fetching ALL classes for user:", user);
      // Try the new endpoint first
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8081/all-classes", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const classesData = await response.json();
        console.log("All classes data:", classesData);
        setClasses(Array.isArray(classesData) ? classesData : []);
      } else {
        // Fallback to regular API call
        console.log("Using fallback classes endpoint");
        const classesData = await getClasses();
        console.log("Fallback classes data:", classesData);
        setClasses(Array.isArray(classesData) ? classesData : []);
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
      // Try regular API as last resort
      try {
        const classesData = await getClasses();
        setClasses(Array.isArray(classesData) ? classesData : []);
      } catch (fallbackError) {
        setMessage("Failed to load classes. Please try again.");
        setClasses([]);
      }
    }
  }, [user]);

  // Fetch ALL courses regardless of assignment
  const fetchCourses = useCallback(async () => {
    try {
      console.log("Fetching ALL courses for user:", user);
      // Try the new endpoint first
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8081/all-courses", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const coursesData = await response.json();
        console.log("All courses data:", coursesData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } else {
        // Fallback to regular API call
        console.log("Using fallback courses endpoint");
        const coursesData = await getCourses();
        console.log("Fallback courses data:", coursesData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      }
    } catch (error) {
      console.error("Failed to load courses:", error);
      // Try regular API as last resort
      try {
        const coursesData = await getCourses();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (fallbackError) {
        setMessage("Failed to load courses. Please try again.");
        setCourses([]);
      }
    }
  }, [user]);

  // Load lectures for students
  const loadLecturesForStudent = useCallback(async () => {
    try {
      const lecturesData = await fetchLectures();
      // Filter lectures that have already happened (past dates)
      const pastLectures = lecturesData.filter(lecture =>
        new Date(lecture.date_of_lecture) <= new Date()
      );
      setLectures(pastLectures);
    } catch (error) {
      console.error("Failed to load lectures:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        setMessage("");

        // Get current user to ensure proper authentication
        const userData = getCurrentUser();
        setCurrentUser(userData);
        console.log("Current user in LectureForm:", userData);

        // Load classes and courses sequentially to avoid race conditions
        await fetchClasses();
        await fetchCourses();

        // Load lectures for students
        if (userData && userData.role === 'student') {
          await loadLecturesForStudent();
        }

      } catch (error) {
        console.error("Failed to load data:", error);
        setMessage("Failed to load form data. Please refresh the page.");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [fetchClasses, fetchCourses, loadLecturesForStudent]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === 'class_id') {
      const selected = classes.find(c => c.id === parseInt(value));
      console.log("Selected class:", selected);
      setSelectedClass(selected || null);
    }

    if (name === 'course_id') {
      const selected = courses.find(c => c.id === parseInt(value));
      console.log("Selected course:", selected);
      setSelectedCourse(selected || null);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // Validate required fields
    if (!form.class_id || !form.course_id || !form.date_of_lecture) {
      setMessage("Error: Please fill all required fields");
      setLoading(false);
      return;
    }

    try {
      console.log("Submitting form data:", form);
      const result = await postLecture(form);
      console.log("Submission result:", result);
      setMessage("Lecture report submitted successfully!");

      // Reset form
      setForm({
        class_id: "",
        course_id: "",
        week_of_reporting: "",
        date_of_lecture: "",
        actual_students_present: "",
        topic_taught: "",
        learning_outcomes: "",
        recommendations: "",
      });
      setStep(1);
      setSelectedClass(null);
      setSelectedCourse(null);

      // Refresh the data
      await fetchClasses();
      await fetchCourses();
    } catch (err) {
      console.error("Submission error:", err);
      setMessage(`Error: ${err.message || "Failed to submit lecture report"}`);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!form.class_id || !form.course_id) {
        setMessage("Please select both class and course before proceeding");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.date_of_lecture || !form.week_of_reporting) {
        setMessage("Please fill all required fields before proceeding");
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setMessage("");
  };

  // Handle rating submission for students
  const handleRateLecture = async (lectureId, rating) => {
    try {
      setRatingLoading(true);
      await postRating({ lecture_id: lectureId, rating });
      setRatings(prev => ({
        ...prev,
        [lectureId]: { rating }
      }));
      setMessage("Rating submitted successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setRatingLoading(false);
    }
  };

  // Handle feedback submission for students
  const handleSubmitFeedback = async (lectureId) => {
    try {
      setRatingLoading(true);
      await postFeedback({
        lecture_id: lectureId,
        feedback_text: userFeedback
      });
      setMessage("Feedback submitted successfully!");
      setUserFeedback("");
      setSelectedLectureForRating(null);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setRatingLoading(false);
    }
  };

  // Check if user can submit lectures
  const canSubmitLectures = currentUser && ['lecturer', 'principal_lecturer'].includes(currentUser.role);

  // Check if user is student
  const isStudent = currentUser && currentUser.role === 'student';

  if (!canSubmitLectures && !isStudent) {
    return (
      <div className="permission-denied">
        <h3>Access Denied</h3>
        <p>You do not have permission to submit lecture reports. Required role: Lecturer or Principal Lecturer.</p>
        <p>Your current role: {currentUser?.role || 'Not logged in'}</p>
      </div>
    );
  }

  // If user is student, show rating interface
  if (isStudent) {
    return (
      <div className="form-container">
        <div className="form-header">
          <div className="form-header-content">
            <h2>Rate Lectures</h2>
            <p>Rate your lectures and provide feedback to help improve teaching quality</p>
            <div className="user-info">
              <small>Logged in as: {currentUser?.name} ({currentUser?.role})</small>
            </div>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes("successfully") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        <div className="rating-interface">
          <div className="lectures-list">
            <h3>Available Lectures for Rating</h3>
            <div className="lectures-grid">
              {lectures.map(lecture => (
                <div key={lecture.id} className="lecture-card">
                  <div className="lecture-info">
                    <h4>{lecture.course_name}</h4>
                    <p><strong>Topic:</strong> {lecture.topic_taught}</p>
                    <p><strong>Date:</strong> {new Date(lecture.date_of_lecture).toLocaleDateString()}</p>
                    <p><strong>Lecturer:</strong> {lecture.lecturer_name}</p>
                  </div>
                  <div className="rating-section">
                    <label>Your Rating:</label>
                    <div className="stars-container">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          className={`star ${star <= (ratings[lecture.id]?.rating || 0) ? 'filled' : ''}`}
                          onClick={() => handleRateLecture(lecture.id, star)}
                          disabled={ratingLoading}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {ratings[lecture.id] && (
                      <p className="rating-text">
                        {ratings[lecture.id].rating}/5 - {
                          ratings[lecture.id].rating >= 4.5 ? "Excellent" :
                          ratings[lecture.id].rating >= 4.0 ? "Very Good" :
                          ratings[lecture.id].rating >= 3.0 ? "Good" :
                          ratings[lecture.id].rating >= 2.0 ? "Fair" : "Poor"
                        }
                      </p>
                    )}
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => setSelectedLectureForRating(lecture)}
                  >
                    Add Feedback
                  </button>
                </div>
              ))}
            </div>
            {lectures.length === 0 && (
              <p>No lectures available for rating at the moment.</p>
            )}
          </div>

          {selectedLectureForRating && (
            <div className="feedback-modal">
              <div className="modal-content">
                <h3>Provide Feedback</h3>
                <p><strong>Lecture:</strong> {selectedLectureForRating.course_name}</p>
                <p><strong>Topic:</strong> {selectedLectureForRating.topic_taught}</p>
                <textarea
                  placeholder="Share your thoughts about this lecture..."
                  rows="4"
                  className="form-input"
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                />
                <div className="modal-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedLectureForRating(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSubmitFeedback(selectedLectureForRating.id)}
                    disabled={ratingLoading}
                  >
                    {ratingLoading ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <div className="form-header-content">
          <h2>Lecture Report Form</h2>
          <p>Complete the following steps to submit your lecture report</p>
          <div className="user-info">
            <small>Logged in as: {currentUser?.name} ({currentUser?.role})</small>
          </div>
        </div>
        <div className="form-progress">
          <div className="progress-steps">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className={`progress-step ${stepNum === step ? 'active' : stepNum < step ? 'completed' : ''}`}>
                <div className="step-number">{stepNum}</div>
                <div className="step-label">
                  {stepNum === 1 && 'Basic Info'}
                  {stepNum === 2 && 'Lecture Details'}
                  {stepNum === 3 && 'Content & Outcomes'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes("successfully") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="styled-form">
        {step === 1 && (
          <div className="form-step">
            <div className="step-header">
              <h3>Basic Information</h3>
              <p>Select the class and course for this lecture</p>
            </div>

            {dataLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading classes and courses...</p>
              </div>
            ) : (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Class *</label>
                  <select
                    name="class_id"
                    value={form.class_id}
                    onChange={handleChange}
                    required
                    className="form-input"
                    disabled={classes.length === 0}
                  >
                    <option value="">Select a class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} - {c.venue} ({c.total_registered_students} students)
                      </option>
                    ))}
                  </select>
                  {classes.length === 0 && !dataLoading && (
                    <div className="input-helper error">
                      No classes available in the system.
                    </div>
                  )}
                  {classes.length > 0 && (
                    <div className="input-helper info">
                      Showing all {classes.length} classes from the database
                    </div>
                  )}
                  {selectedClass && (
                    <div className="selection-details">
                      <div className="detail-item">
                        <strong>Venue:</strong> {selectedClass.venue}
                      </div>
                      <div className="detail-item">
                        <strong>Students:</strong> {selectedClass.total_registered_students}
                      </div>
                      <div className="detail-item">
                        <strong>Schedule:</strong> {selectedClass.scheduled_time}
                      </div>
                      {selectedClass.faculty_name && (
                        <div className="detail-item">
                          <strong>Faculty:</strong> {selectedClass.faculty_name}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Course *</label>
                  <select
                    name="course_id"
                    value={form.course_id}
                    onChange={handleChange}
                    required
                    className="form-input"
                    disabled={courses.length === 0}
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.course_name}
                      </option>
                    ))}
                  </select>
                  {courses.length === 0 && !dataLoading && (
                    <div className="input-helper error">
                      No courses available in the system.
                    </div>
                  )}
                  {courses.length > 0 && (
                    <div className="input-helper info">
                      Showing all {courses.length} courses from the database
                    </div>
                  )}
                  {selectedCourse && (
                    <div className="selection-details">
                      <div className="detail-item">
                        <strong>Course Code:</strong> {selectedCourse.course_code}
                      </div>
                      <div className="detail-item">
                        <strong>Course Name:</strong> {selectedCourse.course_name}
                      </div>
                      {selectedCourse.program_leader_name && (
                        <div className="detail-item">
                          <strong>Program Leader:</strong> {selectedCourse.program_leader_name}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Lecturer's Name</label>
                  <input
                    type="text"
                    value={currentUser?.name || ''}
                    readOnly
                    className="form-input bg-gray-50"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Lecture *</label>
                  <input
                    type="date"
                    name="date_of_lecture"
                    value={form.date_of_lecture}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="form-step">
            <div className="step-header">
              <h3>Lecture Details</h3>
              <p>Provide attendance and scheduling information</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Week of Reporting *</label>
                <select
                  name="week_of_reporting"
                  value={form.week_of_reporting}
                  onChange={handleChange}
                  required
                  className="form-input"
                >
                  <option value="">Select Week</option>
                  {Array.from({length: 15}, (_, i) => i + 1).map(week => (
                    <option key={week} value={`Week ${week}`}>Week {week}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Students Present *</label>
                <input
                  type="number"
                  name="actual_students_present"
                  value={form.actual_students_present}
                  onChange={handleChange}
                  placeholder="Number of students present"
                  required
                  className="form-input"
                  min="0"
                  max={selectedClass ? selectedClass.total_registered_students : 100}
                />
                {selectedClass && (
                  <div className="input-helper">
                    Total registered: {selectedClass.total_registered_students} students
                  </div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Topic Taught *</label>
                <input
                  type="text"
                  name="topic_taught"
                  value={form.topic_taught}
                  onChange={handleChange}
                  placeholder="Enter the main topic covered in this lecture"
                  required
                  className="form-input"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-step">
            <div className="step-header">
              <h3>Content & Learning Outcomes</h3>
              <p>Describe what was taught and the outcomes achieved</p>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Learning Outcomes *</label>
                <textarea
                  name="learning_outcomes"
                  value={form.learning_outcomes}
                  onChange={handleChange}
                  placeholder="Describe the key learning outcomes and what students should be able to do after this lecture..."
                  rows="6"
                  required
                  className="form-input"
                />
                <div className="input-helper">
                  Be specific about the skills and knowledge students gained
                </div>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Recommendations & Notes</label>
                <textarea
                  name="recommendations"
                  value={form.recommendations}
                  onChange={handleChange}
                  placeholder="Any recommendations for improvement, follow-up activities, or important notes..."
                  rows="4"
                  className="form-input"
                />
                <div className="input-helper">
                  Optional: Suggestions for future lectures or student support
                </div>
              </div>
            </div>

            <div className="form-summary">
              <h4>Lecture Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Class:</span>
                  <span className="summary-value">
                    {selectedClass ? selectedClass.class_name : 'Not selected'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Course:</span>
                  <span className="summary-value">
                    {selectedCourse ? `${selectedCourse.course_code} - ${selectedCourse.course_name}` : 'Not selected'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Date:</span>
                  <span className="summary-value">{form.date_of_lecture || 'Not set'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Attendance:</span>
                  <span className="summary-value">
                    {form.actual_students_present || 0} / {selectedClass ? selectedClass.total_registered_students : '?'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Week:</span>
                  <span className="summary-value">{form.week_of_reporting || 'Not set'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Topic:</span>
                  <span className="summary-value">{form.topic_taught || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {step > 1 && (
            <button type="button" onClick={prevStep} className="btn btn-secondary">
              Previous
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn btn-primary ml-auto"
              disabled={dataLoading || classes.length === 0 || courses.length === 0}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary ml-auto"
              disabled={loading || dataLoading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Submitting...
                </>
              ) : (
                'Submit Lecture Report'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
