// platform.js - 智能康复辅助平台首页功能

class PlatformDashboard {
    constructor() {
        this.statsData = null;
        this.recentActivities = [];
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.renderDashboard();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadDashboardData() {
        try {
            // 模拟加载数据 - 实际应该从API获取
            this.statsData = {
                totalPatients: 24,
                activePatients: 18,
                completionRate: 85,
                newPatientsThisWeek: 12,
                totalDoctors: 8,
                activeSessions: 5
            };

            this.recentActivities = [
                {
                    type: 'upper_limb',
                    patient: '张明',
                    action: '完成了上肢训练',
                    time: '2小时前',
                    score: 92
                },
                {
                    type: 'lower_limb',
                    patient: '李华',
                    action: '开始下肢康复训练',
                    time: '4小时前',
                    score: '新开始'
                },
                {
                    type: 'aphasia',
                    patient: '王芳',
                    action: '语言评估完成',
                    time: '1天前',
                    score: 78
                },
                {
                    type: 'upper_limb',
                    patient: '刘强',
                    action: '训练进度更新',
                    time: '1天前',
                    score: 65
                },
                {
                    type: 'lower_limb',
                    patient: '陈伟',
                    action: '完成步态训练',
                    time: '2天前',
                    score: 88
                }
            ];

        } catch (error) {
            console.error('加载仪表盘数据失败:', error);
            window.appState.showNotification('加载数据失败', 'error');
        }
    }

    renderDashboard() {
        this.renderStatsOverview();
        this.renderRecentActivities();
        this.renderProjectCards();
        this.renderCharts();
    }

    renderStatsOverview() {
        const statsContainer = document.querySelector('.stats-overview');
        if (!statsContainer || !this.statsData) return;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-value">${this.statsData.totalPatients}</div>
                <div class="stat-label">总患者数</div>
                <div class="stat-trend positive">+${this.statsData.newPatientsThisWeek} 本周</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${this.statsData.activePatients}</div>
                <div class="stat-label">活跃患者</div>
                <div class="stat-trend">${Math.round(this.statsData.activePatients / this.statsData.totalPatients * 100)}% 活跃率</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value">${this.statsData.completionRate}%</div>
                <div class="stat-label">平均完成率</div>
                <div class="stat-trend positive">+5% 提升</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👨‍⚕️</div>
                <div class="stat-value">${this.statsData.totalDoctors}</div>
                <div class="stat-label">医生数量</div>
                <div class="stat-trend">${this.statsData.activeSessions} 个活跃会话</div>
            </div>
        `;
    }

    renderRecentActivities() {
        const activitiesContainer = document.querySelector('.activity-list');
        if (!activitiesContainer) return;

        activitiesContainer.innerHTML = this.recentActivities.map(activity => `
            <div class="activity-item" data-type="${activity.type}">
                <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                <div class="activity-details">
                    <div class="activity-title">
                        <strong>${activity.patient}</strong> ${activity.action}
                    </div>
                    <div class="activity-time">${activity.time}</div>
                </div>
                <div class="activity-score ${this.getScoreClass(activity.score)}">
                    ${typeof activity.score === 'number' ? `${activity.score}%` : activity.score}
                </div>
            </div>
        `).join('');
    }

    renderProjectCards() {
        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectsGrid) return;

        // 项目数据
        const projects = [
            {
                id: 'upper_limb',
                name: '上肢康复动作矫正系统',
                description: '基于计算机视觉的上肢康复训练与实时矫正',
                icon: '🦾',
                features: [
                    '实时姿态估计与角度分析',
                    '个性化动作矫正反馈',
                    '训练进度可视化报告'
                ],
                status: 'active',
                patients: 12,
                progress: 75
            },
            {
                id: 'lower_limb',
                name: '康莱德康复机器人',
                description: '下肢精准康复训练与智能评估系统',
                icon: '🦵',
                features: [
                    '双自由度机器人精准控制',
                    '实时步态分析与评估',
                    'AI个性化训练推荐',
                    '过度运动风险预警'
                ],
                status: 'active',
                patients: 8,
                progress: 60
            },
            {
                id: 'aphasia',
                name: '语言康复辅助系统',
                description: 'AI驱动的失语症康复训练平台',
                icon: '🗣️',
                features: [
                    '分级语言训练任务',
                    '智能语音识别与评估',
                    '语言生成辅助工具',
                    '个性化进度跟踪'
                ],
                status: 'active',
                patients: 4,
                progress: 45
            }
        ];

        projectsGrid.innerHTML = projects.map(project => `
            <div class="project-card ${project.id}-card">
                <div class="project-header">
                    <div class="project-icon">
                        <span>${project.icon}</span>
                    </div>
                    <div class="project-status ${project.status}">
                        ${project.status === 'active' ? '运行中' : '维护中'}
                    </div>
                </div>
                <div class="project-info">
                    <h3>${project.name}</h3>
                    <p>${project.description}</p>
                    <ul class="feature-list">
                        ${project.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                    <div class="project-stats">
                        <div class="project-stat">
                            <span class="stat-value">${project.patients}</span>
                            <span class="stat-label">患者</span>
                        </div>
                        <div class="project-stat">
                            <span class="stat-value">${project.progress}%</span>
                            <span class="stat-label">完成度</span>
                        </div>
                    </div>
                </div>
                <div class="project-actions">
                    <a href="${project.id}/index.html" class="primary-btn">进入系统</a>
                    <button class="secondary-btn demo-btn" data-project="${project.id}">查看演示</button>
                </div>
            </div>
        `).join('');
    }

    renderCharts() {
        // 初始化图表
        this.initPatientProgressChart();
        this.initActivityDistributionChart();
        this.initCompletionRateChart();
    }

    initPatientProgressChart() {
        const canvas = document.getElementById('patientProgressChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // 模拟数据
        const data = {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
            datasets: [
                {
                    label: '上肢康复',
                    data: [65, 59, 80, 81, 56, 85],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '下肢康复',
                    data: [28, 48, 40, 19, 86, 27],
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '语言康复',
                    data: [45, 25, 35, 60, 40, 70],
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };

        // 简单图表实现 - 实际应该使用Chart.js等库
        this.drawLineChart(ctx, data, '患者康复进度趋势');
    }

    initActivityDistributionChart() {
        const canvas = document.getElementById('activityDistributionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        const data = {
            labels: ['上肢训练', '下肢训练', '语言训练', '评估测试', '其他'],
            datasets: [{
                data: [40, 30, 20, 8, 2],
                backgroundColor: [
                    '#667eea', '#f093fb', '#4facfe', '#43e97b', '#ff9a9e'
                ]
            }]
        };

        this.drawPieChart(ctx, data, '活动分布');
    }

    initCompletionRateChart() {
        const canvas = document.getElementById('completionRateChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        const data = {
            labels: ['上肢康复', '下肢康复', '语言康复'],
            datasets: [{
                data: [85, 72, 65],
                backgroundColor: ['#667eea', '#f093fb', '#4facfe'],
                borderWidth: 0
            }]
        };

        this.drawBarChart(ctx, data, '各项目完成率');
    }

    drawLineChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;

        // 清除画布
        ctx.clearRect(0, 0, width, height);

        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);

        // 绘制坐标轴
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();

        // X轴
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 绘制数据线
        data.datasets.forEach((dataset, index) => {
            ctx.strokeStyle = dataset.borderColor;
            ctx.lineWidth = 2;
            ctx.beginPath();

            const maxValue = Math.max(...dataset.data);
            const xStep = (width - 2 * padding) / (data.labels.length - 1);

            dataset.data.forEach((value, i) => {
                const x = padding + i * xStep;
                const y = height - padding - (value / maxValue) * (height - 2 * padding);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        });
    }

    drawPieChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;

        let total = data.datasets[0].data.reduce((a, b) => a + b, 0);
        let startAngle = 0;

        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, centerX, 20);

        data.datasets[0].data.forEach((value, i) => {
            const sliceAngle = (2 * Math.PI * value) / total;

            ctx.fillStyle = data.datasets[0].backgroundColor[i];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            startAngle += sliceAngle;
        });
    }

    drawBarChart(ctx, data, title) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const padding = 40;
        const barWidth = (width - 2 * padding) / data.labels.length - 10;

        const maxValue = Math.max(...data.datasets[0].data);

        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);

        data.labels.forEach((label, i) => {
            const value = data.datasets[0].data[i];
            const barHeight = (value / maxValue) * (height - 2 * padding - 20);
            const x = padding + i * (barWidth + 10);
            const y = height - padding - barHeight;

            // 绘制柱状图
            ctx.fillStyle = data.datasets[0].backgroundColor[i];
            ctx.fillRect(x, y, barWidth, barHeight);

            // 绘制数值
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${value}%`, x + barWidth / 2, y - 5);

            // 绘制标签
            ctx.fillText(label, x + barWidth / 2, height - padding + 15);
        });
    }

    getActivityIcon(type) {
        const icons = {
            'upper_limb': '🦾',
            'lower_limb': '🦵',
            'aphasia': '🗣️'
        };
        return icons[type] || '📝';
    }

    getScoreClass(score) {
        if (typeof score !== 'number') return '';
        if (score >= 80) return 'score-high';
        if (score >= 60) return 'score-medium';
        return 'score-low';
    }

    setupEventListeners() {
        // 演示按钮点击事件
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('demo-btn')) {
                const projectId = event.target.getAttribute('data-project');
                this.showProjectDemo(projectId);
            }
        });

        // 活动项点击事件
        document.addEventListener('click', (event) => {
            const activityItem = event.target.closest('.activity-item');
            if (activityItem) {
                const projectType = activityItem.getAttribute('data-type');
                this.viewActivityDetails(projectType);
            }
        });

        // 刷新数据按钮
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // 搜索功能
        const searchInput = document.getElementById('dashboardSearch');
        if (searchInput) {
            searchInput.addEventListener('input', utils.debounce((event) => {
                this.searchDashboard(event.target.value);
            }, 300));
        }

        // 筛选功能
        const filterSelect = document.getElementById('dashboardFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (event) => {
                this.filterDashboard(event.target.value);
            });
        }
    }

    showProjectDemo(projectId) {
        const demos = {
            'upper_limb': {
                title: '上肢康复系统演示',
                description: '展示实时姿态估计和动作矫正功能',
                video: '../videos/upper_limb_demo.mp4',
                features: ['实时关节角度计算', '动作准确性评估', '个性化反馈指导']
            },
            'lower_limb': {
                title: '下肢康复机器人演示',
                description: '展示机器人辅助训练和步态分析',
                video: '../videos/lower_limb_demo.mp4',
                features: ['双自由度控制', '实时步态分析', 'AI训练推荐']
            },
            'aphasia': {
                title: '语言康复系统演示',
                description: '展示语音识别和语言生成辅助功能',
                video: '../videos/aphasia_demo.mp4',
                features: ['智能语音评估', '语言生成辅助', '个性化训练计划']
            }
        };

        const demo = demos[projectId];
        if (!demo) return;

        // 创建演示模态框
        const modal = document.createElement('div');
        modal.className = 'demo-modal';
        modal.innerHTML = `
            <div class="demo-modal-content">
                <div class="demo-modal-header">
                    <h3>${demo.title}</h3>
                    <button class="demo-modal-close">&times;</button>
                </div>
                <div class="demo-modal-body">
                    <p>${demo.description}</p>
                    <div class="demo-video-placeholder">
                        <div class="video-placeholder">
                            <span>🎬</span>
                            <p>演示视频将在这里播放</p>
                        </div>
                    </div>
                    <div class="demo-features">
                        <h4>主要功能</h4>
                        <ul>
                            ${demo.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="demo-modal-footer">
                    <button class="secondary-btn" onclick="this.closest('.demo-modal').remove()">关闭</button>
                    <a href="${projectId}/index.html" class="primary-btn">立即体验</a>
                </div>
            </div>
        `;

        // 添加样式
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        modal.querySelector('.demo-modal-content').style.cssText = `
            background: white;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modal.querySelector('.demo-modal-close').addEventListener('click', () => {
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    viewActivityDetails(projectType) {
        // 跳转到对应项目的详细页面
        window.location.href = `${projectType}/index.html`;
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '刷新中...';
        }

        await this.loadDashboardData();
        this.renderDashboard();

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '刷新数据';
        }

        window.appState.showNotification('数据已刷新', 'success');
    }

    searchDashboard(query) {
        if (!query.trim()) {
            // 显示所有活动
            document.querySelectorAll('.activity-item').forEach(item => {
                item.style.display = 'flex';
            });
            return;
        }

        // 筛选活动
        document.querySelectorAll('.activity-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(query.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterDashboard(filter) {
        const activityItems = document.querySelectorAll('.activity-item');
        
        activityItems.forEach(item => {
            if (filter === 'all' || item.getAttribute('data-type') === filter) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    startAutoRefresh() {
        // 每5分钟自动刷新数据
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadDashboardData().then(() => {
                    this.renderDashboard();
                });
            }
        }, 5 * 60 * 1000);
    }
}

// 用户管理类
class UserManager {
    static async login(username, password) {
        try {
            // 模拟登录请求
            const response = await window.apiService.post('/auth/login', {
                username,
                password
            });

            if (response.access_token) {
                window.apiService.setToken(response.access_token);
                window.appState.setUser(response.user, response.user.role);
                
                window.appState.showNotification('登录成功', 'success');
                return true;
            }
        } catch (error) {
            console.error('登录失败:', error);
            window.appState.showNotification('登录失败，请检查用户名和密码', 'error');
            return false;
        }
    }

    static async logout() {
        try {
            await window.apiService.post('/auth/logout');
        } catch (error) {
            console.error('登出请求失败:', error);
        } finally {
            window.apiService.setToken(null);
            window.appState.clearUser();
            window.appState.showNotification('已安全退出', 'info');
            
            // 跳转到首页
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    static async getCurrentUser() {
        try {
            const user = await window.apiService.get('/auth/me');
            return user;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    }
}

// 平台初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化平台仪表盘
    if (document.querySelector('.platform-main')) {
        window.platformDashboard = new PlatformDashboard();
    }

    // 设置用户相关事件
    setupUserEvents();

    // 设置导航事件
    setupNavigation();

    // 设置响应式处理
    setupResponsiveHandling();
});

function setupUserEvents() {
    // 登出按钮
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('确定要退出登录吗？')) {
                UserManager.logout();
            }
        });
    }

    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const success = await UserManager.login(username, password);
            if (success) {
                // 跳转到仪表盘或首页
                window.location.href = 'index.html';
            }
        });
    }
}

function setupNavigation() {
    // 移动端菜单切换
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 活动导航项高亮
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-item a').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
}

function setupResponsiveHandling() {
    // 处理窗口大小变化
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250);
    });

    function handleResize() {
        const width = window.innerWidth;
        
        // 移动端特定处理
        if (width < 768) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }

        // 调整图表大小
        if (window.platformDashboard) {
            window.platformDashboard.renderCharts();
        }
    }

    // 初始调用
    handleResize();
}

// 导出到全局作用域
window.PlatformDashboard = PlatformDashboard;
window.UserManager = UserManager;