// src/api/endpoints.js
// All API endpoint functions

import apiClient from './client';

// ============================================
// AUTH ENDPOINTS
// ============================================

export const authApi = {
  // Login
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      username: email, // Backend expects 'username' field
      password,
    });
    return response;
  },

  // Signup
  signup: async (userData) => {
    const response = await apiClient.post('/auth/signup', userData);
    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response;
  },

  // Update profile
  updateProfile: async (userData) => {
    const response = await apiClient.put('/auth/me', userData);
    return response;
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    const response = await apiClient.post('/auth/password/change', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response;
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/password/reset', { email });
    return response;
  },

  // Confirm password reset
  confirmPasswordReset: async (token, newPassword) => {
    const response = await apiClient.post('/auth/password/reset/confirm', {
      token,
      new_password: newPassword,
    });
    return response;
  },
};

// ============================================
// STUDENT ENDPOINTS
// ============================================

export const studentApi = {
  // Get student dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/student/dashboard');
    return response;
  },

  // Get available assessments
  getAvailableAssessments: async () => {
    const response = await apiClient.get('/student/assessments');
    return response;
  },

  // Get assessment details
  getAssessment: async (id) => {
    const response = await apiClient.get(`/student/assessments/${id}`);
    return response;
  },

  // Submit assessment
  submitAssessment: async (assessmentId, answers) => {
    const response = await apiClient.post(`/paper/${assessmentId}/submit`, {
      answers,
    });
    return response;
  },

  // Get student results
  getResults: async () => {
    const response = await apiClient.get('/student/results');
    return response;
  },

  // Get result details
  getResultDetails: async (submissionId) => {
    const response = await apiClient.get(`/student/results/${submissionId}`);
    return response;
  },

  // Get performance analytics
  getPerformance: async () => {
    const response = await apiClient.get('/student/performance');
    return response;
  },
};

// ============================================
// LECTURER ENDPOINTS
// ============================================

export const lecturerApi = {
  // Get lecturer dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/lecturer/dashboard');
    return response;
  },

  // Get all papers
  getPapers: async () => {
    const response = await apiClient.get('/paper');
    return response;
  },

  // Get paper details
  getPaper: async (id) => {
    const response = await apiClient.get(`/paper/${id}`);
    return response;
  },

  // Create paper
  createPaper: async (paperData) => {
    const response = await apiClient.post('/paper', paperData);
    return response;
  },

  // Update paper
  updatePaper: async (id, paperData) => {
    const response = await apiClient.put(`/paper/${id}`, paperData);
    return response;
  },

  // Delete paper
  deletePaper: async (id) => {
    const response = await apiClient.delete(`/paper/${id}`);
    return response;
  },

  // Get paper submissions
  getPaperSubmissions: async (paperId) => {
    const response = await apiClient.get(`/paper/${paperId}/submissions`);
    return response;
  },

  // Get submission details
  getSubmissionDetails: async (submissionId) => {
    const response = await apiClient.get(`/lecturer/submissions/${submissionId}`);
    return response;
  },

  // Get analytics
  getAnalytics: async () => {
    const response = await apiClient.get('/lecturer/analytics/overview');
    return response;
  },

  // Question bank
  getQuestions: async () => {
    const response = await apiClient.get('/questions');
    return response;
  },

  // Create question
  createQuestion: async (questionData) => {
    const response = await apiClient.post('/questions', questionData);
    return response;
  },

  // Update question
  updateQuestion: async (id, questionData) => {
    const response = await apiClient.put(`/questions/${id}`, questionData);
    return response;
  },

  // Delete question
  deleteQuestion: async (id) => {
    const response = await apiClient.delete(`/questions/${id}`);
    return response;
  },
};

// ============================================
// ASSESSMENT ENDPOINTS
// ============================================

export const assessmentApi = {
  // Submit single answer for grading
  submitAnswer: async (modelAnswer, studentAnswer, maxScore = 10) => {
    const response = await apiClient.post('/assess', {
      model_answer: modelAnswer,
      student_answer: studentAnswer,
      max_score: maxScore,
    });
    return response;
  },

  // Enhanced assessment
  submitEnhancedAssessment: async (modelAnswer, studentAnswer, maxScore = 10) => {
    const response = await apiClient.post('/assess/enhanced', {
      model_answer: modelAnswer,
      student_answer: studentAnswer,
      max_score: maxScore,
    });
    return response;
  },
};

export default {
  auth: authApi,
  student: studentApi,
  lecturer: lecturerApi,
  assessment: assessmentApi,
};