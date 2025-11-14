
// 康复训练管理系统 JavaScript 功能

// API 基础 URL
const API_BASE = '/api';

// 通用工具函数
const utils = {
    // 显示消息
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#64B5F6'};
            color: white;
            border-radius: 0.5rem;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    },
    
    // 格式化日期
    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN');
    },
    
    // 获取认证令牌
    getAuthToken() {
        return localStorage.getItem('auth_token');
    },
    
    // 设置认证令牌
    setAuthToken(token) {
        localStorage.setItem('auth_token', token);
    },
    
    // 移除认证令牌
    removeAuthToken() {
        localStorage.removeItem('auth_token');
    },
    
    // API 请求
    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            this.showMessage('请求失败，请检查网络连接', 'error');
            throw error;
        }
    }
};

// 认证功能
const auth = {
    // 登录
    async login(username, password) {
        try {
            const response = await utils.apiRequest('/auth/token', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            utils.setAuthToken(response.access_token);
            utils.showMessage('登录成功', 'success');
            
            // 根据用户角色跳转
            setTimeout(() => {
                window.location.href = '/doctor';
            }, 1000);
            
            return true;
        } catch (error) {
            utils.showMessage('登录失败，请检查用户名和密码', 'error');
            return false;
        }
    },
    
    // 登出
    logout() {
        utils.removeAuthToken();
        window.location.href = '/';
    },
    
    // 检查登录状态
    checkAuth() {
        return !!utils.getAuthToken();
    }
};

// 患者管理功能
const patientManager = {
    // 获取患者列表
    async getPatients() {
        try {
            return await utils.apiRequest('/patients');
        } catch (error) {
            console.error('Failed to fetch patients:', error);
            return [];
        }
    },
    
    // 获取患者详情
    async getPatientDetails(patientId) {
        try {
            return await utils.apiRequest(`/patients/${patientId}`);
        } catch (error) {
            console.error('Failed to fetch patient details:', error);
            return null;
        }
    },
    
    // 获取 AI 分析报告
    async getAIAnalysis(patientId) {
        try {
            return await utils.apiRequest(`/patients/${patientId}/ai-analysis`);
        } catch (error) {
            console.error('Failed to fetch AI analysis:', error);
            return null;
        }
    }
};

// 图表功能
const chartManager = {
    // 初始化进度图表
    initProgressChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '康复进度 (%)',
                    data: data.values,
                    backgroundColor: data.colors || 'rgba(100, 181, 246, 0.7)',
                    borderColor: '#64B5F6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    },
    
    // 初始化饼图
    initPieChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: data.colors
                }]
            },
            options: {
                responsive: true
            }
        });
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查认证状态
    if (!auth.checkAuth() && window.location.pathname !== '/') {
        window.location.href = '/';
        return;
    }
    
    // 初始化页面特定功能
    initPageFunctions();
});

function initPageFunctions() {
    const path = window.location.pathname;
    
    if (path === '/doctor') {
        initDoctorDashboard();
    } else if (path.startsWith('/overview/')) {
        initPatientOverview();
    }
}

// 医生工作台初始化
async function initDoctorDashboard() {
    try {
        const dashboardData = await utils.apiRequest('/patients/doctor/dashboard');
        updateDashboardUI(dashboardData);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// 更新仪表板 UI
function updateDashboardUI(data) {
    // 更新统计数据
    document.getElementById('totalPatients').textContent = data.statistics.total_patients;
    document.getElementById('trainingCompleted').textContent = data.statistics.training_completed_today;
    document.getElementById('patientsNeedAttention').textContent = data.statistics.patients_need_attention;
    document.getElementById('todayAppointments').textContent = data.statistics.today_appointments;
    
    // 更新医生信息
    document.getElementById('doctorName').textContent = data.doctor.name;
    document.getElementById('doctorDepartment').textContent = data.doctor.department;
}

// 患者详情页面初始化
async function initPatientOverview() {
    const patientId = window.location.pathname.split('/').pop();
    
    try {
        const patientData = await patientManager.getPatientDetails(patientId);
        const analysisData = await patientManager.getAIAnalysis(patientId);
        
        updatePatientOverviewUI(patientData, analysisData);
    } catch (error) {
        console.error('Failed to load patient overview:', error);
    }
}

// 更新患者详情 UI
function updatePatientOverviewUI(patientData, analysisData) {
    // 更新患者基本信息
    document.getElementById('patientName').textContent = patientData.name;
    document.getElementById('recoveryProgress').textContent = patientData.recovery_progress + '%';
    document.getElementById('trainingCount').textContent = patientData.training_count || '0';
    document.getElementById('totalDuration').textContent = patientData.total_duration || '0h';
    
    // 更新 AI 分析数据
    if (analysisData) {
        document.getElementById('actionCompletion').textContent = analysisData.action_completion_score + '%';
        // 更新其他分析数据...
    }
}
