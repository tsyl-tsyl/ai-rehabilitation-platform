 

 


// 全局变量
let currentPatient = null;
let rehabilitationStages = [];
let jointROMRecords = [];
let progressRecords = [];
let trainingPlans = [];



// 标签页切换
function switchTab(tabName) {
    // 隐藏所有内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 移除所有标签激活状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-accent', 'text-white');
        btn.classList.add('bg-transparent', 'hover:bg-white/5');
    });
    
    // 显示选中内容
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // 激活选中标签
    document.getElementById(`tab-${tabName}`).classList.remove('bg-transparent', 'hover:bg-white/5');
    document.getElementById(`tab-${tabName}`).classList.add('bg-accent', 'text-white');
    
    // 加载特定标签的数据
    loadTabData(tabName);
}

// 加载标签数据
function loadTabData(tabName) {
    const patientId = getUrlParameter('patient_id');
    
    switch(tabName) {
        case 'stages':
            loadRehabilitationStages(patientId);
            break;
        case 'rom':
            loadJointROM(patientId);
            initROMTrendChart();
            break;
        case 'progress':
            loadRehabilitationProgress(patientId);
            initProgressTrendChart();
            break;
        case 'training':
            loadTrainingPlans(patientId);
            break;
    }
}

// 页面初始化
async function initializePage() {
    if (!checkAuth()) return;
    
    // 更新日期时间
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // 加载患者基本信息
    await loadPatientBasicInfo();
    
    // 加载所有数据
    const patientId = getUrlParameter('patient_id');
    await Promise.all([
        loadRehabilitationStages(patientId),
        loadJointROM(patientId),
        loadRehabilitationProgress(patientId),
        loadTrainingPlans(patientId)
    ]);
    
    // 初始化图表
    initROMTrendChart();
    initProgressTrendChart();
    
    // 绑定表单提交事件
    bindFormEvents();
}

// 更新日期时间
function updateDateTime() {
    const now = new Date();
    const lang = i18n.currentLanguage;
    const dateTimeStr = now.toLocaleString(lang === 'zh-CN' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('currentDateTime').textContent = dateTimeStr;
}

// 加载患者基本信息
async function loadPatientBasicInfo() {
    const patientId = getUrlParameter('patient_id');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_info');
            window.location.href = 'doctor.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(getText('loading_patient_info'));
        }
        
        const patient = await response.json();
        currentPatient = patient;
        
        // 更新页面信息
        document.getElementById('patientName').textContent = patient.patient_info.name;
        const lang = i18n.currentLanguage;
        if (lang === 'zh-CN') {
            document.getElementById('patientInfo').textContent = 
                `患者ID: ${patientId} | 主治医生: ${patient.patient_info.doctor_name || '未分配'} | 科室: ${patient.patient_info.department || '未分配'}`;
        } else {
            document.getElementById('patientInfo').textContent = 
                `Patient ID: ${patientId} | Doctor: ${patient.patient_info.doctor_name || 'Not assigned'} | Department: ${patient.patient_info.department || 'Not assigned'}`;
        }
            
    } catch (error) {
        console.error('加载患者信息错误:', error);
        showMessage(error.message);
    }
}

// 绑定表单提交事件
function bindFormEvents() {
    document.getElementById('stageForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitStageForm();
    });
    
    document.getElementById('romForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitROMForm();
    });
    
    document.getElementById('progressForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitProgressForm();
    });
    
    document.getElementById('trainingPlanForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitTrainingPlanForm();
    });
}

// ========== 康复阶段管理 ==========

// 加载康复阶段数据
async function loadRehabilitationStages(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-stages/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_stages'));
        
        const result = await response.json();
        if (Array.isArray(result)) {
            rehabilitationStages = result;
            renderRehabilitationStages(rehabilitationStages);
            updateStageStatistics(rehabilitationStages);
            updateCurrentStageInfo(rehabilitationStages);
        }
    } catch (error) {
        console.error('加载康复阶段错误:', error);
        showMessage(error.message);
    }
}

// 渲染康复阶段列表
function renderRehabilitationStages(stages) {
    const container = document.getElementById('rehabilitationStagesList');
    const lang = i18n.currentLanguage;
    
    if (!stages || stages.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 empty-state">
                <i class="fa fa-calendar-plus text-5xl mb-4"></i>
                <div class="text-xl mb-2" data-i18n="no_rehab_stages">${lang === 'zh-CN' ? '暂无康复阶段记录' : 'No Rehabilitation Stages'}</div>
                <div class="text-sm opacity-70" data-i18n="no_rehab_stages_desc">${lang === 'zh-CN' ? '请添加康复阶段信息来开始管理患者的康复过程' : 'Please add rehabilitation stage information to start managing patient recovery'}</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    stages.forEach(stage => {
        const statusColors = {
            'active': 'bg-green-500/20 text-green-300 border-green-400/30',
            'pending': 'bg-blue-500/20 text-blue-300 border-blue-400/30',
            'completed': 'bg-gray-500/20 text-gray-300 border-gray-400/30'
        };
        
        const intensityColors = {
            'low': 'text-green-400',
            'medium': 'text-yellow-400',
            'high': 'text-red-400'
        };
        
        const statusText = getText(stage.status);
        const intensityText = getText(stage.training_intensity);
        
        html += `
            <div class="bg-white/5 rounded-lg p-6 mb-4 border border-white/10 hover-card ${stage.status === 'active' ? 'border-accent/50' : ''}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <span class="status-tag ${statusColors[stage.status] || 'bg-gray-500/20 text-gray-300 border-gray-400/30'}">
                            ${statusText}
                        </span>
                        <h4 class="font-bold text-lg ml-3">${stage.stage_name}</h4>
                        ${stage.training_intensity ? `
                            <span class="ml-2 px-2 py-1 ${intensityColors[stage.training_intensity]} text-xs rounded-full border border-current/30">
                                ${intensityText}
                            </span>
                        ` : ''}
                    </div>
                    <div class="text-sm opacity-70">
                        ${lang === 'zh-CN' ? '阶段' : 'Stage'} ${stage.stage_number || 'N/A'}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                        <div class="opacity-70">${lang === 'zh-CN' ? '时间范围' : 'Time Range'}</div>
                        <div class="font-medium">
                            ${stage.start_date ? new Date(stage.start_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '未设置' : 'Not set')}
                            ${stage.end_date ? ` - ${new Date(stage.end_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US')}` : ''}
                        </div>
                    </div>
                    <div>
                        <div class="opacity-70">${lang === 'zh-CN' ? '当前进度' : 'Current Progress'}</div>
                        <div class="font-medium">
                            ${stage.current_progress ? stage.current_progress + '%' : (lang === 'zh-CN' ? '未设置' : 'Not set')}
                        </div>
                    </div>
                </div>
                
                ${stage.target_goals ? `
                    <div class="bg-white/10 rounded-lg p-4 mb-4">
                        <div class="text-sm font-medium mb-2">${lang === 'zh-CN' ? '阶段目标:' : 'Stage Goals:'}</div>
                        <div class="text-sm opacity-80">${stage.target_goals}</div>
                    </div>
                ` : ''}
                
                ${stage.weekly_focus ? `
                    <div class="bg-accent/10 rounded-lg p-3 mb-4 border border-accent/20">
                        <div class="text-sm font-medium mb-1 text-accent">${lang === 'zh-CN' ? '本周重点:' : 'Weekly Focus:'}</div>
                        <div class="text-sm opacity-80">${stage.weekly_focus}</div>
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center">
                    <div class="text-sm opacity-70">
                        ${lang === 'zh-CN' ? '创建时间:' : 'Created:'} ${stage.created_at ? new Date(stage.created_at).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '未知' : 'Unknown')}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editStage(${stage.id})" class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-edit mr-1"></i>${lang === 'zh-CN' ? '编辑' : 'Edit'}
                        </button>
                        <button onclick="deleteStage(${stage.id})" class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-trash mr-1"></i>${lang === 'zh-CN' ? '删除' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 更新阶段统计信息
function updateStageStatistics(stages) {
    const total = stages.length;
    const active = stages.filter(stage => stage.status === 'active').length;
    const completed = stages.filter(stage => stage.status === 'completed').length;
    const pending = stages.filter(stage => stage.status === 'pending').length;
    
    document.getElementById('totalStages').textContent = total;
    document.getElementById('activeStages').textContent = active;
    document.getElementById('completedStages').textContent = completed;
    document.getElementById('plannedStages').textContent = pending;
}

// 更新当前阶段信息
function updateCurrentStageInfo(stages) {
    const currentStage = stages.find(stage => stage.status === 'active');
    const container = document.getElementById('currentStageInfo');
    const lang = i18n.currentLanguage;
    
    if (!currentStage) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fa fa-calendar-times text-4xl mb-3 opacity-50"></i>
                <div class="text-lg">${getText('no_current_stage')}</div>
                <div class="text-sm opacity-70 mt-2">${getText('no_current_stage_desc')}</div>
            </div>
        `;
        return;
    }
    
    const progress = currentStage.current_progress || 0;
    
    container.innerHTML = `
        <div class="text-left">
            <h4 class="font-bold text-xl mb-2">${currentStage.stage_name}</h4>
            <div class="text-sm opacity-80 mb-4">${lang === 'zh-CN' ? '阶段' : 'Stage'} ${currentStage.stage_number || 'N/A'}</div>
            
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                    <span>${lang === 'zh-CN' ? '阶段进度' : 'Stage Progress'}</span>
                    <span class="font-bold text-accent">${progress}%</span>
                </div>
                <div class="w-full bg-white/20 rounded-full h-3">
                    <div class="bg-accent h-3 rounded-full" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div class="opacity-70">${lang === 'zh-CN' ? '开始日期' : 'Start Date'}</div>
                    <div class="font-medium">${currentStage.start_date ? new Date(currentStage.start_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '未设置' : 'Not set')}</div>
                </div>
                <div>
                    <div class="opacity-70">${currentStage.end_date ? (lang === 'zh-CN' ? '结束日期' : 'End Date') : (lang === 'zh-CN' ? '预计结束' : 'Estimated End')}</div>
                    <div class="font-medium">${currentStage.end_date ? new Date(currentStage.end_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '待定' : 'TBD')}</div>
                </div>
            </div>
            
            ${currentStage.weekly_focus ? `
                <div class="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <div class="text-sm font-medium text-accent mb-1">${lang === 'zh-CN' ? '本周重点' : 'Weekly Focus'}</div>
                    <div class="text-sm opacity-80">${currentStage.weekly_focus}</div>
                </div>
            ` : ''}
        </div>
    `;
}

// ========== 关节活动度管理 ==========

// 加载关节活动度数据
async function loadJointROM(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/joint-rom/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_rom'));
        
        const result = await response.json();
        if (Array.isArray(result)) {
            jointROMRecords = result;
            renderJointROM(jointROMRecords);
        }
    } catch (error) {
        console.error('加载关节活动度错误:', error);
        showMessage(error.message);
    }
}

// 渲染关节活动度列表
function renderJointROM(records) {
    const container = document.getElementById('jointROMList');
    const lang = i18n.currentLanguage;
    
    if (!records || records.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 empty-state">
                <i class="fa fa-chart-line text-5xl mb-4"></i>
                <div class="text-xl mb-2" data-i18n="no_joint_mobility_records">${lang === 'zh-CN' ? '暂无关节活动度记录' : 'No Joint Mobility Records'}</div>
                <div class="text-sm opacity-70" data-i18n="no_joint_mobility_records_desc">${lang === 'zh-CN' ? '请添加关节活动度测量数据来跟踪患者的康复进展' : 'Please add joint mobility measurement data to track patient recovery progress'}</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    records.forEach(record => {
        const getChangeColor = (change) => {
            if (!change) return 'text-gray-400';
            return change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';
        };
        
        const getChangeIcon = (change) => {
            if (!change) return 'fa-minus';
            return change > 0 ? 'fa-arrow-up' : change < 0 ? 'fa-arrow-down' : 'fa-minus';
        };
        
        html += `
            <div class="bg-white/5 rounded-lg p-6 mb-4 border border-white/10 hover-card">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h4 class="font-bold text-lg">${lang === 'zh-CN' ? '关节活动度测量' : 'Joint Mobility Measurement'}</h4>
                        <div class="text-sm opacity-70">
                            ${new Date(record.record_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US')}
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                    <!-- 左侧关节 -->
                    <div class="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div class="text-lg font-bold text-blue-300">${record.left_hip || 0}°</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '左髋' : 'Left Hip'}</div>
                        ${record.left_hip_change ? `
                            <div class="text-xs mt-1 ${getChangeColor(record.left_hip_change)}">
                                <i class="fa ${getChangeIcon(record.left_hip_change)} mr-1"></i>
                                ${Math.abs(record.left_hip_change)}°
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div class="text-lg font-bold text-blue-300">${record.left_knee || 0}°</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '左膝' : 'Left Knee'}</div>
                        ${record.left_knee_change ? `
                            <div class="text-xs mt-1 ${getChangeColor(record.left_knee_change)}">
                                <i class="fa ${getChangeIcon(record.left_knee_change)} mr-1"></i>
                                ${Math.abs(record.left_knee_change)}°
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div class="text-lg font-bold text-blue-300">${record.left_ankle || 0}°</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '左踝' : 'Left Ankle'}</div>
                        ${record.left_ankle_change ? `
                            <div class="text-xs mt-1 ${getChangeColor(record.left_ankle_change)}">
                                <i class="fa ${getChangeIcon(record.left_ankle_change)} mr-1"></i>
                                ${Math.abs(record.left_ankle_change)}°
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 右侧关节 -->
                    <div class="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div class="text-lg font-bold text-green-300">${record.right_hip || 0}°</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '右髋' : 'Right Hip'}</div>
                        ${record.right_hip_change ? `
                            <div class="text-xs mt-1 ${getChangeColor(record.right_hip_change)}">
                                <i class="fa ${getChangeIcon(record.right_hip_change)} mr-1"></i>
                                ${Math.abs(record.right_hip_change)}°
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div class="text-lg font-bold text-green-300">${record.right_knee || 0}°</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '右膝' : 'Right Knee'}</div>
                        ${record.right_knee_change ? `
                            <div class="text-xs mt-1 ${getChangeColor(record.right_knee_change)}">
                                <i class="fa ${getChangeIcon(record.right_knee_change)} mr-1"></i>
                                ${Math.abs(record.right_knee_change)}°
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div class="text-lg font-bold text-green-300">${record.right_ankle || 0}°</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '右踝' : 'Right Ankle'}</div>
                        ${record.right_ankle_change ? `
                            <div class="text-xs mt-1 ${getChangeColor(record.right_ankle_change)}">
                                <i class="fa ${getChangeIcon(record.right_ankle_change)} mr-1"></i>
                                ${Math.abs(record.right_ankle_change)}°
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="flex justify-between items-center">
                    <div class="text-sm opacity-70">
                        ${lang === 'zh-CN' ? '记录时间:' : 'Recorded:'} ${record.created_at ? new Date(record.created_at).toLocaleString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '未知' : 'Unknown')}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editROM(${record.id})" class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-edit mr-1"></i>${lang === 'zh-CN' ? '编辑' : 'Edit'}
                        </button>
                        <button onclick="deleteROM(${record.id})" class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-trash mr-1"></i>${lang === 'zh-CN' ? '删除' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 初始化关节活动度趋势图表
function initROMTrendChart() {
    const ctx = document.getElementById('romTrendChart').getContext('2d');
    const lang = i18n.currentLanguage;
    
    if (!jointROMRecords || jointROMRecords.length === 0) {
        document.getElementById('romTrendChart').parentElement.innerHTML = `
            <div class="text-center py-12 empty-state">
                <i class="fa fa-chart-line text-4xl mb-3"></i>
                <div class="text-lg">${getText('no_data_chart')}</div>
                <div class="text-sm opacity-70">${getText('no_data_chart_desc')}</div>
            </div>
        `;
        return;
    }
    
    // 按日期排序
    const sortedRecords = [...jointROMRecords].sort((a, b) => new Date(a.record_date) - new Date(b.record_date));
    
    const labels = sortedRecords.map(record => new Date(record.record_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US'));
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: lang === 'zh-CN' ? '左髋活动度' : 'Left Hip Mobility',
                    data: sortedRecords.map(record => record.left_hip),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: lang === 'zh-CN' ? '右髋活动度' : 'Right Hip Mobility',
                    data: sortedRecords.map(record => record.right_hip),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: lang === 'zh-CN' ? '左膝活动度' : 'Left Knee Mobility',
                    data: sortedRecords.map(record => record.left_knee),
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: lang === 'zh-CN' ? '右膝活动度' : 'Right Knee Mobility',
                    data: sortedRecords.map(record => record.right_knee),
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 180,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    title: {
                        display: true,
                        text: lang === 'zh-CN' ? '活动度 (°)' : 'Mobility (°)',
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            }
        }
    });
}

// ========== 康复进度跟踪 ==========

// 加载康复进度数据
async function loadRehabilitationProgress(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-progress/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_progress'));
        
        const result = await response.json();
        if (Array.isArray(result)) {
            progressRecords = result;
            renderRehabilitationProgress(progressRecords);
            
            // 加载统计信息
            loadProgressStatistics(patientId);
        }
    } catch (error) {
        console.error('加载康复进度错误:', error);
        showMessage(error.message);
    }
}

// 加载进度统计信息
async function loadProgressStatistics(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-progress/${patientId}/statistics`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateProgressStatistics(stats);
        }
    } catch (error) {
        console.error('加载进度统计错误:', error);
    }
}

// 渲染康复进度列表
function renderRehabilitationProgress(records) {
    const container = document.getElementById('progressTrackingList');
    const lang = i18n.currentLanguage;
    
    if (!records || records.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 empty-state">
                <i class="fa fa-tasks text-5xl mb-4"></i>
                <div class="text-xl mb-2" data-i18n="no_progress_records">${lang === 'zh-CN' ? '暂无康复进度记录' : 'No Progress Records'}</div>
                <div class="text-sm opacity-70" data-i18n="no_progress_records_desc">${lang === 'zh-CN' ? '请添加康复进度跟踪信息来监控患者的恢复情况' : 'Please add rehabilitation progress tracking information to monitor patient recovery'}</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    records.forEach(record => {
        html += `
            <div class="bg-white/5 rounded-lg p-6 mb-4 border border-white/10 hover-card">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h4 class="font-bold text-lg">${lang === 'zh-CN' ? '第' : 'Week'} ${record.week_number} ${lang === 'zh-CN' ? '周进度' : 'Progress'}</h4>
                        <div class="text-sm opacity-70">
                            ${new Date(record.record_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US')}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-accent">${record.overall_progress}%</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '整体进度' : 'Overall Progress'}</div>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="text-center p-3 bg-white/5 rounded-lg">
                        <div class="text-xl font-bold text-blue-400">${record.joint_mobility_progress}%</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '关节活动度' : 'Joint Mobility'}</div>
                    </div>
                    
                    <div class="text-center p-3 bg-white/5 rounded-lg">
                        <div class="text-xl font-bold text-green-400">${record.muscle_strength_progress}%</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '肌力恢复' : 'Muscle Strength'}</div>
                    </div>
                    
                    <div class="text-center p-3 bg-white/5 rounded-lg">
                        <div class="text-xl font-bold text-purple-400">${record.balance_ability_progress}%</div>
                        <div class="text-sm opacity-70">${lang === 'zh-CN' ? '平衡能力' : 'Balance Ability'}</div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                    ${record.training_duration ? `
                        <div>
                            <div class="opacity-70">${lang === 'zh-CN' ? '训练时长' : 'Training Duration'}</div>
                            <div class="font-medium">${record.training_duration} ${lang === 'zh-CN' ? '分钟' : 'minutes'}</div>
                        </div>
                    ` : ''}
                    
                    ${record.training_steps ? `
                        <div>
                            <div class="opacity-70">${lang === 'zh-CN' ? '训练步数' : 'Training Steps'}</div>
                            <div class="font-medium">${record.training_steps} ${lang === 'zh-CN' ? '步' : 'steps'}</div>
                        </div>
                    ` : ''}
                    
                    ${record.performance_score ? `
                        <div>
                            <div class="opacity-70">${lang === 'zh-CN' ? '表现评分' : 'Performance Score'}</div>
                            <div class="font-medium ${getPerformanceColor(record.performance_score)}">${record.performance_score}/100</div>
                        </div>
                    ` : ''}
                </div>
                
                ${record.notes ? `
                    <div class="bg-white/10 rounded-lg p-3 text-sm opacity-80 mb-4">
                        <i class="fa fa-sticky-note mr-2"></i>${record.notes}
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center">
                    <div class="text-sm opacity-70">
                        ${lang === 'zh-CN' ? '记录时间:' : 'Recorded:'} ${record.created_at ? new Date(record.created_at).toLocaleString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '未知' : 'Unknown')}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editProgress(${record.id})" class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-edit mr-1"></i>${lang === 'zh-CN' ? '编辑' : 'Edit'}
                        </button>
                        <button onclick="deleteProgress(${record.id})" class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-trash mr-1"></i>${lang === 'zh-CN' ? '删除' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 更新进度统计信息
function updateProgressStatistics(stats) {
    document.getElementById('overallProgress').textContent = stats.statistics.average_overall_progress + '%';
    document.getElementById('overallProgressBar').style.width = stats.statistics.average_overall_progress + '%';
    document.getElementById('avgJointMobility').textContent = stats.statistics.average_joint_mobility + '%';
    document.getElementById('avgMuscleStrength').textContent = stats.statistics.average_muscle_strength + '%';
}

// 初始化进度趋势图表
function initProgressTrendChart() {
    const ctx = document.getElementById('progressTrendChart').getContext('2d');
    const lang = i18n.currentLanguage;
    
    if (!progressRecords || progressRecords.length === 0) {
        document.getElementById('progressTrendChart').parentElement.innerHTML = `
            <div class="text-center py-12 empty-state">
                <i class="fa fa-chart-line text-4xl mb-3"></i>
                <div class="text-lg">${getText('no_data_chart')}</div>
                <div class="text-sm opacity-70">${getText('no_data_chart_desc')}</div>
            </div>
        `;
        return;
    }
    
    // 按周数排序
    const sortedRecords = [...progressRecords].sort((a, b) => a.week_number - b.week_number);
    
    const labels = sortedRecords.map(record => lang === 'zh-CN' ? `第${record.week_number}周` : `Week ${record.week_number}`);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: lang === 'zh-CN' ? '整体进度 (%)' : 'Overall Progress (%)',
                    data: sortedRecords.map(record => record.overall_progress),
                    borderColor: '#64B5F6',
                    backgroundColor: 'rgba(100, 181, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: lang === 'zh-CN' ? '关节活动度 (%)' : 'Joint Mobility (%)',
                    data: sortedRecords.map(record => record.joint_mobility_progress),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: lang === 'zh-CN' ? '肌力恢复 (%)' : 'Muscle Strength (%)',
                    data: sortedRecords.map(record => record.muscle_strength_progress),
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: lang === 'zh-CN' ? '平衡能力 (%)' : 'Balance Ability (%)',
                    data: sortedRecords.map(record => record.balance_ability_progress),
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    title: {
                        display: true,
                        text: lang === 'zh-CN' ? '进度 (%)' : 'Progress (%)',
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            }
        }
    });
}

// ========== 训练计划管理 ==========

// 加载训练计划数据
async function loadTrainingPlans(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/training-plans/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_plans'));
        
        const result = await response.json();
        if (Array.isArray(result)) {
            trainingPlans = result;
            renderTrainingPlans(trainingPlans);
            
            // 加载统计信息
            loadTrainingPlanStatistics(patientId);
        }
    } catch (error) {
        console.error('加载训练计划错误:', error);
        showMessage(error.message);
    }
}

// 加载训练计划统计信息
async function loadTrainingPlanStatistics(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/training-plans/${patientId}/statistics`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateTrainingPlanStatistics(stats);
        }
    } catch (error) {
        console.error('加载训练计划统计错误:', error);
    }
}

// 渲染训练计划列表
function renderTrainingPlans(plans) {
    const container = document.getElementById('trainingPlansList');
    const lang = i18n.currentLanguage;
    
    if (!plans || plans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 empty-state">
                <i class="fa fa-dumbbell text-5xl mb-4"></i>
                <div class="text-xl mb-2" data-i18n="no_training_plans">${lang === 'zh-CN' ? '暂无训练计划' : 'No Training Plans'}</div>
                <div class="text-sm opacity-70" data-i18n="no_training_plans_desc">${lang === 'zh-CN' ? '请为患者制定个性化的训练计划' : 'Please create personalized training plans for the patient'}</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    plans.forEach(plan => {
        const statusColors = {
            'active': 'bg-green-500/20 text-green-300 border-green-400/30',
            'pending': 'bg-blue-500/20 text-blue-300 border-blue-400/30',
            'completed': 'bg-gray-500/20 text-gray-300 border-gray-400/30',
            'paused': 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
        };
        
        const intensityColors = {
            'low': 'text-green-400',
            'medium': 'text-yellow-400',
            'high': 'text-red-400'
        };
        
        const statusText = getText(plan.status);
        const intensityText = getText(plan.training_intensity);
        
        const progress = calculatePlanProgress(plan);
        
        html += `
            <div class="bg-white/5 rounded-lg p-6 mb-4 border border-white/10 hover-card">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="font-bold text-lg mb-1">${plan.name}</h4>
                        <div class="text-sm opacity-70">
                            ${new Date(plan.start_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US')} - ${new Date(plan.end_date).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US')}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-3 py-1 ${statusColors[plan.status]} text-sm rounded-full border">
                            ${statusText}
                        </span>
                        <span class="px-3 py-1 bg-accent/20 text-accent text-sm rounded-full border border-accent/30">
                            ${intensityText}
                        </span>
                    </div>
                </div>
                
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span>${lang === 'zh-CN' ? '计划进度' : 'Plan Progress'}</span>
                        <span class="font-bold text-accent">${progress}%</span>
                    </div>
                    <div class="w-full bg-white/20 rounded-full h-2">
                        <div class="bg-accent h-2 rounded-full" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                        <div class="opacity-70">${lang === 'zh-CN' ? '训练频率' : 'Training Frequency'}</div>
                        <div class="font-medium">${plan.weekly_sessions}${lang === 'zh-CN' ? '次/周' : '/week'}</div>
                    </div>
                    <div>
                        <div class="opacity-70">${lang === 'zh-CN' ? '单次时长' : 'Session Duration'}</div>
                        <div class="font-medium">${plan.session_duration}${lang === 'zh-CN' ? '分钟' : 'min'}</div>
                    </div>
                    <div>
                        <div class="opacity-70">${lang === 'zh-CN' ? '总训练量' : 'Total Training'}</div>
                        <div class="font-medium">${plan.total_training_minutes_per_week}${lang === 'zh-CN' ? '分钟/周' : 'min/week'}</div>
                    </div>
                </div>
                
                <div class="bg-white/10 rounded-lg p-4 mb-4">
                    <div class="text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练内容:' : 'Training Content:'}</div>
                    <div class="text-sm opacity-80">${plan.training_content}</div>
                </div>
                
                ${plan.precautions ? `
                    <div class="bg-yellow-500/10 rounded-lg p-3 mb-4 border border-yellow-500/20">
                        <div class="text-sm font-medium mb-1 text-yellow-300">${lang === 'zh-CN' ? '注意事项:' : 'Precautions:'}</div>
                        <div class="text-sm opacity-80">${plan.precautions}</div>
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center">
                    <div class="text-sm opacity-70">
                        ${lang === 'zh-CN' ? '创建时间:' : 'Created:'} ${plan.created_at ? new Date(plan.created_at).toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US') : (lang === 'zh-CN' ? '未知' : 'Unknown')}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editTrainingPlan(${plan.id})" class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-edit mr-1"></i>${lang === 'zh-CN' ? '编辑' : 'Edit'}
                        </button>
                        <button onclick="deleteTrainingPlan(${plan.id})" class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-300 text-sm">
                            <i class="fa fa-trash mr-1"></i>${lang === 'zh-CN' ? '删除' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 更新训练计划统计信息
function updateTrainingPlanStatistics(stats) {
    document.getElementById('totalPlans').textContent = stats.total_plans;
    document.getElementById('activePlans').textContent = stats.active_plans;
    document.getElementById('completedPlans').textContent = stats.completed_plans;
    document.getElementById('complianceRate').textContent = stats.compliance_rate + '%';
}

// 计算训练计划进度
function calculatePlanProgress(plan) {
    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);
    const today = new Date();
    
    if (plan.status === 'completed') return 100;
    if (today <= startDate) return 0;
    if (today >= endDate) return 100;
    
    const totalDuration = endDate - startDate;
    const elapsedDuration = today - startDate;
    
    return Math.min(Math.round((elapsedDuration / totalDuration) * 100), 100);
}

// ========== 工具函数 ==========

// 获取表现评分颜色
function getPerformanceColor(score) {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
}

// ========== 模态框显示/隐藏函数 ==========

function showAddStageModal() {
    const patientId = getUrlParameter('patient_id');
    document.getElementById('stagePatientId').value = patientId;
    
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('stageStartDate').value = today;
    
    document.getElementById('addStageModal').classList.remove('hidden');
}

function hideAddStageModal() {
    document.getElementById('addStageModal').classList.add('hidden');
    document.getElementById('stageForm').reset();
}

function showAddROMModal() {
    const patientId = getUrlParameter('patient_id');
    document.getElementById('romPatientId').value = patientId;
    
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('romRecordDate').value = today;
    
    document.getElementById('addROMModal').classList.remove('hidden');
}

function hideAddROMModal() {
    document.getElementById('addROMModal').classList.add('hidden');
    document.getElementById('romForm').reset();
}

function showAddProgressModal() {
    const patientId = getUrlParameter('patient_id');
    document.getElementById('progressPatientId').value = patientId;
    
    // 设置默认日期和计算周数
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('progressRecordDate').value = today;
    
    // 自动计算周数（基于第一个康复阶段的开始日期）
    if (rehabilitationStages.length > 0 && rehabilitationStages[0].start_date) {
        const startDate = new Date(rehabilitationStages[0].start_date);
        const currentDate = new Date();
        const weekDiff = Math.ceil((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
        document.getElementById('weekNumber').value = Math.max(1, weekDiff);
    } else {
        document.getElementById('weekNumber').value = 1;
    }
    
    document.getElementById('addProgressModal').classList.remove('hidden');
}

function hideAddProgressModal() {
    document.getElementById('addProgressModal').classList.add('hidden');
    document.getElementById('progressForm').reset();
}

function showAddTrainingPlanModal() {
    const patientId = getUrlParameter('patient_id');
    document.getElementById('trainingPlanPatientId').value = patientId;
    
    // 加载康复阶段选项
    loadStagesForTrainingPlan(patientId);
    
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    
    document.getElementById('planStartDate').value = today;
    document.getElementById('planEndDate').value = nextMonthStr;
    
    document.getElementById('addTrainingPlanModal').classList.remove('hidden');
}

function hideAddTrainingPlanModal() {
    document.getElementById('addTrainingPlanModal').classList.add('hidden');
    document.getElementById('trainingPlanForm').reset();
}

// ========== 表单提交函数 ==========

async function submitStageForm() {
    const formData = {
        patient_id: parseInt(document.getElementById('stagePatientId').value),
        stage_name: document.getElementById('stageName').value,
        stage_number: document.getElementById('stageNumber').value ? parseInt(document.getElementById('stageNumber').value) : null,
        start_date: document.getElementById('stageStartDate').value || null,
        end_date: document.getElementById('stageEndDate').value || null,
        target_goals: document.getElementById('stageGoals').value || null,
        current_progress: document.getElementById('stageProgress').value ? parseInt(document.getElementById('stageProgress').value) : null,
        status: document.getElementById('stageStatus').value,
        weeks_completed: document.getElementById('weeksCompleted').value ? parseInt(document.getElementById('weeksCompleted').value) : null,
        weeks_remaining: document.getElementById('weeksRemaining').value ? parseInt(document.getElementById('weeksRemaining').value) : null,
        weekly_focus: document.getElementById('weeklyFocus').value || null,
        training_intensity: document.getElementById('trainingIntensity').value || null,
        next_evaluation_date: document.getElementById('nextEvaluationDate').value || null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-stages/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_stages'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('stage_added'), 'success');
            hideAddStageModal();
            loadRehabilitationStages(formData.patient_id);
        }
    } catch (error) {
        console.error('添加康复阶段错误:', error);
        showMessage(error.message);
    }
}

async function submitROMForm() {
    const formData = {
        patient_id: parseInt(document.getElementById('romPatientId').value),
        record_date: document.getElementById('romRecordDate').value,
        left_hip: document.getElementById('leftHip').value ? parseInt(document.getElementById('leftHip').value) : null,
        right_hip: document.getElementById('rightHip').value ? parseInt(document.getElementById('rightHip').value) : null,
        left_knee: document.getElementById('leftKnee').value ? parseInt(document.getElementById('leftKnee').value) : null,
        right_knee: document.getElementById('rightKnee').value ? parseInt(document.getElementById('rightKnee').value) : null,
        left_ankle: document.getElementById('leftAnkle').value ? parseInt(document.getElementById('leftAnkle').value) : null,
        right_ankle: document.getElementById('rightAnkle').value ? parseInt(document.getElementById('rightAnkle').value) : null,
        left_hip_change: document.getElementById('leftHipChange').value ? parseInt(document.getElementById('leftHipChange').value) : null,
        right_hip_change: document.getElementById('rightHipChange').value ? parseInt(document.getElementById('rightHipChange').value) : null,
        left_knee_change: document.getElementById('leftKneeChange').value ? parseInt(document.getElementById('leftKneeChange').value) : null,
        right_knee_change: document.getElementById('rightKneeChange').value ? parseInt(document.getElementById('rightKneeChange').value) : null,
        left_ankle_change: document.getElementById('leftAnkleChange').value ? parseInt(document.getElementById('leftAnkleChange').value) : null,
        right_ankle_change: document.getElementById('rightAnkleChange').value ? parseInt(document.getElementById('rightAnkleChange').value) : null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/joint-rom/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_rom'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('rom_added'), 'success');
            hideAddROMModal();
            loadJointROM(formData.patient_id);
        }
    } catch (error) {
        console.error('添加关节活动度错误:', error);
        showMessage(error.message);
    }
}

async function submitProgressForm() {
    const formData = {
        patient_id: parseInt(document.getElementById('progressPatientId').value),
        record_date: document.getElementById('progressRecordDate').value,
        week_number: parseInt(document.getElementById('weekNumber').value),
        overall_progress: parseInt(document.getElementById('overallProgressInput').value),
        joint_mobility_progress: parseInt(document.getElementById('jointMobilityProgress').value),
        muscle_strength_progress: parseInt(document.getElementById('muscleStrengthProgress').value),
        balance_ability_progress: parseInt(document.getElementById('balanceAbilityProgress').value),
        training_duration: document.getElementById('trainingDuration').value ? parseInt(document.getElementById('trainingDuration').value) : null,
        training_steps: document.getElementById('trainingSteps').value ? parseInt(document.getElementById('trainingSteps').value) : null,
        performance_score: document.getElementById('performanceScore').value ? parseInt(document.getElementById('performanceScore').value) : null,
        notes: document.getElementById('progressNotes').value || null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-progress/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_progress'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('progress_added'), 'success');
            hideAddProgressModal();
            loadRehabilitationProgress(formData.patient_id);
        }
    } catch (error) {
        console.error('添加康复进度错误:', error);
        showMessage(error.message);
    }
}

async function submitTrainingPlanForm() {
    const formData = {
        patient_id: parseInt(document.getElementById('trainingPlanPatientId').value),
        stage_id: parseInt(document.getElementById('planStage').value),
        name: document.getElementById('planName').value,
        start_date: document.getElementById('planStartDate').value,
        end_date: document.getElementById('planEndDate').value,
        weekly_sessions: parseInt(document.getElementById('weeklySessions').value),
        session_duration: parseInt(document.getElementById('sessionDuration').value),
        training_content: document.getElementById('trainingContent').value,
        training_goals: document.getElementById('trainingGoals').value,
        training_intensity: document.getElementById('trainingIntensity').value,
        precautions: document.getElementById('precautions').value || null,
        status: document.getElementById('planStatus').value
    };
    
    try {
        console.log('提交训练计划数据:', formData); // 调试日志
        
        const response = await fetch(`${API_BASE_URL}/api/training-plans/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        console.log('响应状态:', response.status); // 调试日志
        
        if (!response.ok) {
            // 尝试获取错误信息
            let errorMessage = getText('loading_plans');
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                // 如果无法解析错误信息，使用状态文本
                errorMessage = `${lang === 'zh-CN' ? '请求失败:' : 'Request failed:'} ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('创建成功，返回数据:', result); // 调试日志
        
        if (result.id) {
            showMessage(getText('plan_added'), 'success');
            hideAddTrainingPlanModal();
            loadTrainingPlans(formData.patient_id);
        } else {
            throw new Error(lang === 'zh-CN' ? '返回数据格式错误' : 'Invalid response data format');
        }
    } catch (error) {
        console.error('添加训练计划错误:', error);
        showMessage(error.message, 'error');
    }
}

// ========== 加载阶段选项函数 ==========

async function loadStagesForTrainingPlan(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-stages/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stages = await response.json();
            const select = document.getElementById('planStage');
            const lang = i18n.currentLanguage;
            
            select.innerHTML = `<option value="">${lang === 'zh-CN' ? '选择康复阶段' : 'Select Rehabilitation Stage'}</option>`;
            
            if (Array.isArray(stages) && stages.length > 0) {
                stages.forEach(stage => {
                    const option = document.createElement('option');
                    option.value = stage.id;
                    option.textContent = stage.stage_name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('加载阶段选项错误:', error);
    }
}

// ========== 删除功能 ==========

async function deleteStage(stageId) {
    const lang = i18n.currentLanguage;
    if (!confirm(getText('confirm_delete_stage'))) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-stages/${stageId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_stages'));
        
        showMessage(getText('stage_deleted'), 'success');
        const patientId = getUrlParameter('patient_id');
        loadRehabilitationStages(patientId);
    } catch (error) {
        console.error('删除康复阶段错误:', error);
        showMessage(error.message);
    }
}

async function deleteROM(recordId) {
    const lang = i18n.currentLanguage;
    if (!confirm(getText('confirm_delete_rom'))) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/joint-rom/${recordId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_rom'));
        
        showMessage(getText('rom_deleted'), 'success');
        const patientId = getUrlParameter('patient_id');
        loadJointROM(patientId);
    } catch (error) {
        console.error('删除关节活动度错误:', error);
        showMessage(error.message);
    }
}

async function deleteProgress(progressId) {
    const lang = i18n.currentLanguage;
    if (!confirm(getText('confirm_delete_progress'))) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-progress/${progressId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_progress'));
        
        showMessage(getText('progress_deleted'), 'success');
        const patientId = getUrlParameter('patient_id');
        loadRehabilitationProgress(patientId);
    } catch (error) {
        console.error('删除康复进度错误:', error);
        showMessage(error.message);
    }
}

async function deleteTrainingPlan(planId) {
    const lang = i18n.currentLanguage;
    if (!confirm(getText('confirm_delete_plan'))) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/training-plans/${planId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(getText('loading_plans'));
        
        showMessage(getText('plan_deleted'), 'success');
        const patientId = getUrlParameter('patient_id');
        loadTrainingPlans(patientId);
    } catch (error) {
        console.error('删除训练计划错误:', error);
        showMessage(error.message);
    }
}

// ========== 导出和报告功能 ==========

function exportROMData() {
    const lang = i18n.currentLanguage;
    if (jointROMRecords.length === 0) {
        showMessage(getText('no_data_export'));
        return;
    }
    
    // 简单的CSV导出实现
    const headers = lang === 'zh-CN' ? 
        ['记录日期', '左髋', '右髋', '左膝', '右膝', '左踝', '右踝', '左髋变化', '右髋变化', '左膝变化', '右膝变化', '左踝变化', '右踝变化'] :
        ['Record Date', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Hip Change', 'Right Hip Change', 'Left Knee Change', 'Right Knee Change', 'Left Ankle Change', 'Right Ankle Change'];
    
    const csvData = jointROMRecords.map(record => [
        record.record_date,
        record.left_hip || '',
        record.right_hip || '',
        record.left_knee || '',
        record.right_knee || '',
        record.left_ankle || '',
        record.right_ankle || '',
        record.left_hip_change || '',
        record.right_hip_change || '',
        record.left_knee_change || '',
        record.right_knee_change || '',
        record.left_ankle_change || '',
        record.right_ankle_change || ''
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = lang === 'zh-CN' ? 
        `关节活动度数据_${new Date().toISOString().split('T')[0]}.csv` :
        `Joint_Mobility_Data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showMessage(getText('export_success'), 'success');
}

function generateProgressReport() {
    const lang = i18n.currentLanguage;
    if (progressRecords.length === 0) {
        showMessage(getText('no_data_report'));
        return;
    }
    
    // 简单的报告生成实现
    const patientName = document.getElementById('patientName').textContent;
    const reportDate = new Date().toLocaleDateString(lang === 'zh-CN' ? 'zh-CN' : 'en-US');
    
    let reportContent = lang === 'zh-CN' ? '康复进度报告\n' : 'Rehabilitation Progress Report\n';
    reportContent += lang === 'zh-CN' ? `患者姓名: ${patientName}\n` : `Patient Name: ${patientName}\n`;
    reportContent += lang === 'zh-CN' ? `报告日期: ${reportDate}\n` : `Report Date: ${reportDate}\n`;
    reportContent += lang === 'zh-CN' ? `记录总数: ${progressRecords.length}\n\n` : `Total Records: ${progressRecords.length}\n\n`;
    
    progressRecords.forEach((record, index) => {
        reportContent += lang === 'zh-CN' ? `记录 ${index + 1}:\n` : `Record ${index + 1}:\n`;
        reportContent += lang === 'zh-CN' ? `  周数: 第${record.week_number}周\n` : `  Week: Week ${record.week_number}\n`;
        reportContent += lang === 'zh-CN' ? `  日期: ${new Date(record.record_date).toLocaleDateString('zh-CN')}\n` : `  Date: ${new Date(record.record_date).toLocaleDateString('en-US')}\n`;
        reportContent += lang === 'zh-CN' ? `  整体进度: ${record.overall_progress}%\n` : `  Overall Progress: ${record.overall_progress}%\n`;
        reportContent += lang === 'zh-CN' ? `  关节活动度: ${record.joint_mobility_progress}%\n` : `  Joint Mobility: ${record.joint_mobility_progress}%\n`;
        reportContent += lang === 'zh-CN' ? `  肌力恢复: ${record.muscle_strength_progress}%\n` : `  Muscle Strength: ${record.muscle_strength_progress}%\n`;
        reportContent += lang === 'zh-CN' ? `  平衡能力: ${record.balance_ability_progress}%\n` : `  Balance Ability: ${record.balance_ability_progress}%\n`;
        if (record.performance_score) {
            reportContent += lang === 'zh-CN' ? `  表现评分: ${record.performance_score}/100\n` : `  Performance Score: ${record.performance_score}/100\n`;
        }
        if (record.notes) {
            reportContent += lang === 'zh-CN' ? `  备注: ${record.notes}\n` : `  Notes: ${record.notes}\n`;
        }
        reportContent += '\n';
    });
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = lang === 'zh-CN' ? 
        `康复进度报告_${patientName}_${new Date().toISOString().split('T')[0]}.txt` :
        `Rehabilitation_Progress_Report_${patientName}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    
    showMessage(getText('report_success'), 'success');
}

// ========== 编辑功能实现 ==========

function editStage(stageId) {
    const stage = rehabilitationStages.find(s => s.id === stageId);
    if (!stage) return;

    const lang = i18n.currentLanguage;
    const editForm = `
        <form id="editStageForm" class="space-y-4">
            <input type="hidden" id="editStageId" value="${stage.id}">
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '阶段名称' : 'Stage Name'}</label>
                    <input type="text" id="editStageName" value="${stage.stage_name || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '阶段编号' : 'Stage Number'}</label>
                    <input type="number" id="editStageNumber" value="${stage.stage_number || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '开始日期' : 'Start Date'}</label>
                    <input type="date" id="editStageStartDate" value="${stage.start_date || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '结束日期' : 'End Date'}</label>
                    <input type="date" id="editStageEndDate" value="${stage.end_date || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '阶段目标' : 'Stage Goals'}</label>
                <textarea id="editStageGoals" rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">${stage.target_goals || ''}</textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '当前进度 (%)' : 'Current Progress (%)'}</label>
                    <input type="number" id="editStageProgress" value="${stage.current_progress || ''}" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '状态' : 'Status'}</label>
                    <select id="editStageStatus" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                        <option value="active" ${stage.status === 'active' ? 'selected' : ''}>${getText('active')}</option>
                        <option value="pending" ${stage.status === 'pending' ? 'selected' : ''}>${getText('pending')}</option>
                        <option value="completed" ${stage.status === 'completed' ? 'selected' : ''}>${getText('completed')}</option>
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '已完成周数' : 'Weeks Completed'}</label>
                    <input type="number" id="editWeeksCompleted" value="${stage.weeks_completed || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '剩余周数' : 'Weeks Remaining'}</label>
                    <input type="number" id="editWeeksRemaining" value="${stage.weeks_remaining || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '本周重点' : 'Weekly Focus'}</label>
                <input type="text" id="editWeeklyFocus" value="${stage.weekly_focus || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练强度' : 'Training Intensity'}</label>
                    <select id="editTrainingIntensity" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                        <option value="low" ${stage.training_intensity === 'low' ? 'selected' : ''}>${getText('low')}</option>
                        <option value="medium" ${stage.training_intensity === 'medium' ? 'selected' : ''}>${getText('medium')}</option>
                        <option value="high" ${stage.training_intensity === 'high' ? 'selected' : ''}>${getText('high')}</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '下次评估日期' : 'Next Evaluation Date'}</label>
                    <input type="date" id="editNextEvaluationDate" value="${stage.next_evaluation_date || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button type="button" onclick="hideEditModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300">
                    ${lang === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
                <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium">
                    ${lang === 'zh-CN' ? '保存修改' : 'Save Changes'}
                </button>
            </div>
        </form>
    `;

    showEditModal(lang === 'zh-CN' ? '编辑康复阶段' : 'Edit Rehabilitation Stage', editForm);
    
    // 绑定表单提交事件
    document.getElementById('editStageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateStage();
    });
}

function editROM(romId) {
    const record = jointROMRecords.find(r => r.id === romId);
    if (!record) return;

    const lang = i18n.currentLanguage;
    const editForm = `
        <form id="editROMForm" class="space-y-4">
            <input type="hidden" id="editROMId" value="${record.id}">
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '记录日期' : 'Record Date'}</label>
                <input type="date" id="editROMRecordDate" value="${record.record_date}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
                <!-- 左侧关节 -->
                <div class="space-y-4">
                    <h4 class="font-semibold text-accent border-b border-accent/30 pb-2">${lang === 'zh-CN' ? '左侧关节' : 'Left Joints'}</h4>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '左髋活动度 (°)' : 'Left Hip Mobility (°)'}</label>
                        <input type="number" id="editLeftHip" value="${record.left_hip || ''}" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '左膝活动度 (°)' : 'Left Knee Mobility (°)'}</label>
                        <input type="number" id="editLeftKnee" value="${record.left_knee || ''}" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '左踝活动度 (°)' : 'Left Ankle Mobility (°)'}</label>
                        <input type="number" id="editLeftAnkle" value="${record.left_ankle || ''}" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                </div>
                
                <!-- 右侧关节 -->
                <div class="space-y-4">
                    <h4 class="font-semibold text-accent border-b border-accent/30 pb-2">${lang === 'zh-CN' ? '右侧关节' : 'Right Joints'}</h4>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '右髋活动度 (°)' : 'Right Hip Mobility (°)'}</label>
                        <input type="number" id="editRightHip" value="${record.right_hip || ''}" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '右膝活动度 (°)' : 'Right Knee Mobility (°)'}</label>
                        <input type="number" id="editRightKnee" value="${record.right_knee || ''}" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '右踝活动度 (°)' : 'Right Ankle Mobility (°)'}</label>
                        <input type="number" id="editRightAnkle" value="${record.right_ankle || ''}" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                <!-- 左侧变化 -->
                <div class="space-y-4">
                    <h4 class="font-semibold text-warning border-b border-warning/30 pb-2">${lang === 'zh-CN' ? '左侧变化' : 'Left Changes'}</h4>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '左髋变化' : 'Left Hip Change'}</label>
                        <input type="number" id="editLeftHipChange" value="${record.left_hip_change || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '左膝变化' : 'Left Knee Change'}</label>
                        <input type="number" id="editLeftKneeChange" value="${record.left_knee_change || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '左踝变化' : 'Left Ankle Change'}</label>
                        <input type="number" id="editLeftAnkleChange" value="${record.left_ankle_change || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                </div>
                
                <!-- 右侧变化 -->
                <div class="space-y-4">
                    <h4 class="font-semibold text-warning border-b border-warning/30 pb-2">${lang === 'zh-CN' ? '右侧变化' : 'Right Changes'}</h4>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '右髋变化' : 'Right Hip Change'}</label>
                        <input type="number" id="editRightHipChange" value="${record.right_hip_change || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '右膝变化' : 'Right Knee Change'}</label>
                        <input type="number" id="editRightKneeChange" value="${record.right_knee_change || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '右踝变化' : 'Right Ankle Change'}</label>
                        <input type="number" id="editRightAnkleChange" value="${record.right_ankle_change || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
                <button type="button" onclick="hideEditModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300">
                    ${lang === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
                <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium">
                    ${lang === 'zh-CN' ? '保存修改' : 'Save Changes'}
                </button>
            </div>
        </form>
    `;

    showEditModal(lang === 'zh-CN' ? '编辑关节活动度记录' : 'Edit Joint Mobility Record', editForm);
    
    // 绑定表单提交事件
    document.getElementById('editROMForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateROM();
    });
}

function editProgress(progressId) {
    const record = progressRecords.find(p => p.id === progressId);
    if (!record) return;

    const lang = i18n.currentLanguage;
    const editForm = `
        <form id="editProgressForm" class="space-y-4">
            <input type="hidden" id="editProgressId" value="${record.id}">
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '记录日期' : 'Record Date'}</label>
                    <input type="date" id="editProgressRecordDate" value="${record.record_date}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '周数' : 'Week Number'}</label>
                    <input type="number" id="editWeekNumber" value="${record.week_number}" min="1" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '整体进度 (%)' : 'Overall Progress (%)'}</label>
                    <input type="number" id="editOverallProgress" value="${record.overall_progress}" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '表现评分' : 'Performance Score'}</label>
                    <input type="number" id="editPerformanceScore" value="${record.performance_score || ''}" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '关节活动度 (%)' : 'Joint Mobility (%)'}</label>
                    <input type="number" id="editJointMobilityProgress" value="${record.joint_mobility_progress}" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '肌力恢复 (%)' : 'Muscle Strength (%)'}</label>
                    <input type="number" id="editMuscleStrengthProgress" value="${record.muscle_strength_progress}" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '平衡能力 (%)' : 'Balance Ability (%)'}</label>
                    <input type="number" id="editBalanceAbilityProgress" value="${record.balance_ability_progress}" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练时长 (分钟)' : 'Training Duration (minutes)'}</label>
                    <input type="number" id="editTrainingDuration" value="${record.training_duration || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练步数' : 'Training Steps'}</label>
                    <input type="number" id="editTrainingSteps" value="${record.training_steps || ''}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '备注' : 'Notes'}</label>
                <textarea id="editProgressNotes" rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">${record.notes || ''}</textarea>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button type="button" onclick="hideEditModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300">
                    ${lang === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
                <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium">
                    ${lang === 'zh-CN' ? '保存修改' : 'Save Changes'}
                </button>
            </div>
        </form>
    `;

    showEditModal(lang === 'zh-CN' ? '编辑康复进度记录' : 'Edit Progress Record', editForm);
    
    // 绑定表单提交事件
    document.getElementById('editProgressForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProgress();
    });
}

function editTrainingPlan(planId) {
    const plan = trainingPlans.find(p => p.id === planId);
    if (!plan) return;

    const lang = i18n.currentLanguage;
    const editForm = `
        <form id="editTrainingPlanForm" class="space-y-4">
            <input type="hidden" id="editTrainingPlanId" value="${plan.id}">
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '计划名称' : 'Plan Name'}</label>
                    <input type="text" id="editPlanName" value="${plan.name}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '关联康复阶段' : 'Related Stage'}</label>
                    <select id="editPlanStage" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                        <!-- 阶段选项将动态加载 -->
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '开始日期' : 'Start Date'}</label>
                    <input type="date" id="editPlanStartDate" value="${plan.start_date}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '结束日期' : 'End Date'}</label>
                    <input type="date" id="editPlanEndDate" value="${plan.end_date}" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练频率' : 'Training Frequency'}</label>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm opacity-80 mb-1">${lang === 'zh-CN' ? '每周训练天数' : 'Sessions per Week'}</label>
                        <input type="number" id="editWeeklySessions" value="${plan.weekly_sessions}" min="1" max="7" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                    </div>
                    <div>
                        <label class="block text-sm opacity-80 mb-1">${lang === 'zh-CN' ? '每次训练时长(分钟)' : 'Session Duration (minutes)'}</label>
                        <input type="number" id="editSessionDuration" value="${plan.session_duration}" min="10" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
                    </div>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练内容' : 'Training Content'}</label>
                <textarea id="editTrainingContent" rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>${plan.training_content}</textarea>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练目标' : 'Training Goals'}</label>
                <textarea id="editTrainingGoals" rows="2" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>${plan.training_goals}</textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '训练强度' : 'Training Intensity'}</label>
                    <select id="editTrainingIntensity" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                        <option value="low" ${plan.training_intensity === 'low' ? 'selected' : ''}>${getText('low')}</option>
                        <option value="medium" ${plan.training_intensity === 'medium' ? 'selected' : ''}>${getText('medium')}</option>
                        <option value="high" ${plan.training_intensity === 'high' ? 'selected' : ''}>${getText('high')}</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '状态' : 'Status'}</label>
                    <select id="editPlanStatus" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
                        <option value="pending" ${plan.status === 'pending' ? 'selected' : ''}>${getText('pending')}</option>
                        <option value="active" ${plan.status === 'active' ? 'selected' : ''}>${getText('active')}</option>
                        <option value="completed" ${plan.status === 'completed' ? 'selected' : ''}>${getText('completed')}</option>
                        <option value="paused" ${plan.status === 'paused' ? 'selected' : ''}>${getText('paused')}</option>
                    </select>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium mb-2">${lang === 'zh-CN' ? '注意事项' : 'Precautions'}</label>
                <textarea id="editPrecautions" rows="2" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">${plan.precautions || ''}</textarea>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button type="button" onclick="hideEditModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300">
                    ${lang === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
                <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium">
                    ${lang === 'zh-CN' ? '保存修改' : 'Save Changes'}
                </button>
            </div>
        </form>
    `;

    showEditModal(lang === 'zh-CN' ? '编辑训练计划' : 'Edit Training Plan', editForm);
    
    // 加载阶段选项并设置选中值
    loadStagesForEditTrainingPlan(plan.patient_id, plan.stage_id);
    
    // 绑定表单提交事件
    document.getElementById('editTrainingPlanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateTrainingPlan();
    });
}

// ========== 更新数据函数 ==========

async function updateStage() {
    const formData = {
        stage_name: document.getElementById('editStageName').value,
        stage_number: document.getElementById('editStageNumber').value ? parseInt(document.getElementById('editStageNumber').value) : null,
        start_date: document.getElementById('editStageStartDate').value || null,
        end_date: document.getElementById('editStageEndDate').value || null,
        target_goals: document.getElementById('editStageGoals').value || null,
        current_progress: document.getElementById('editStageProgress').value ? parseInt(document.getElementById('editStageProgress').value) : null,
        status: document.getElementById('editStageStatus').value,
        weeks_completed: document.getElementById('editWeeksCompleted').value ? parseInt(document.getElementById('editWeeksCompleted').value) : null,
        weeks_remaining: document.getElementById('editWeeksRemaining').value ? parseInt(document.getElementById('editWeeksRemaining').value) : null,
        weekly_focus: document.getElementById('editWeeklyFocus').value || null,
        training_intensity: document.getElementById('editTrainingIntensity').value || null,
        next_evaluation_date: document.getElementById('editNextEvaluationDate').value || null
    };
    
    const stageId = document.getElementById('editStageId').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-stages/${stageId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_stages'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('stage_updated'), 'success');
            hideEditModal();
            const patientId = getUrlParameter('patient_id');
            loadRehabilitationStages(patientId);
        }
    } catch (error) {
        console.error('更新康复阶段错误:', error);
        showMessage(error.message);
    }
}

async function updateROM() {
    const formData = {
        record_date: document.getElementById('editROMRecordDate').value,
        left_hip: document.getElementById('editLeftHip').value ? parseInt(document.getElementById('editLeftHip').value) : null,
        right_hip: document.getElementById('editRightHip').value ? parseInt(document.getElementById('editRightHip').value) : null,
        left_knee: document.getElementById('editLeftKnee').value ? parseInt(document.getElementById('editLeftKnee').value) : null,
        right_knee: document.getElementById('editRightKnee').value ? parseInt(document.getElementById('editRightKnee').value) : null,
        left_ankle: document.getElementById('editLeftAnkle').value ? parseInt(document.getElementById('editLeftAnkle').value) : null,
        right_ankle: document.getElementById('editRightAnkle').value ? parseInt(document.getElementById('editRightAnkle').value) : null,
        left_hip_change: document.getElementById('editLeftHipChange').value ? parseInt(document.getElementById('editLeftHipChange').value) : null,
        right_hip_change: document.getElementById('editRightHipChange').value ? parseInt(document.getElementById('editRightHipChange').value) : null,
        left_knee_change: document.getElementById('editLeftKneeChange').value ? parseInt(document.getElementById('editLeftKneeChange').value) : null,
        right_knee_change: document.getElementById('editRightKneeChange').value ? parseInt(document.getElementById('editRightKneeChange').value) : null,
        left_ankle_change: document.getElementById('editLeftAnkleChange').value ? parseInt(document.getElementById('editLeftAnkleChange').value) : null,
        right_ankle_change: document.getElementById('editRightAnkleChange').value ? parseInt(document.getElementById('editRightAnkleChange').value) : null
    };
    
    const romId = document.getElementById('editROMId').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/joint-rom/${romId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_rom'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('rom_updated'), 'success');
            hideEditModal();
            const patientId = getUrlParameter('patient_id');
            loadJointROM(patientId);
        }
    } catch (error) {
        console.error('更新关节活动度错误:', error);
        showMessage(error.message);
    }
}

async function updateProgress() {
    const formData = {
        record_date: document.getElementById('editProgressRecordDate').value,
        week_number: parseInt(document.getElementById('editWeekNumber').value),
        overall_progress: parseInt(document.getElementById('editOverallProgress').value),
        joint_mobility_progress: parseInt(document.getElementById('editJointMobilityProgress').value),
        muscle_strength_progress: parseInt(document.getElementById('editMuscleStrengthProgress').value),
        balance_ability_progress: parseInt(document.getElementById('editBalanceAbilityProgress').value),
        training_duration: document.getElementById('editTrainingDuration').value ? parseInt(document.getElementById('editTrainingDuration').value) : null,
        training_steps: document.getElementById('editTrainingSteps').value ? parseInt(document.getElementById('editTrainingSteps').value) : null,
        performance_score: document.getElementById('editPerformanceScore').value ? parseInt(document.getElementById('editPerformanceScore').value) : null,
        notes: document.getElementById('editProgressNotes').value || null
    };
    
    const progressId = document.getElementById('editProgressId').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-progress/${progressId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_progress'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('progress_updated'), 'success');
            hideEditModal();
            const patientId = getUrlParameter('patient_id');
            loadRehabilitationProgress(patientId);
        }
    } catch (error) {
        console.error('更新康复进度错误:', error);
        showMessage(error.message);
    }
}

async function updateTrainingPlan() {
    const formData = {
        stage_id: parseInt(document.getElementById('editPlanStage').value),
        name: document.getElementById('editPlanName').value,
        start_date: document.getElementById('editPlanStartDate').value,
        end_date: document.getElementById('editPlanEndDate').value,
        weekly_sessions: parseInt(document.getElementById('editWeeklySessions').value),
        session_duration: parseInt(document.getElementById('editSessionDuration').value),
        training_content: document.getElementById('editTrainingContent').value,
        training_goals: document.getElementById('editTrainingGoals').value,
        training_intensity: document.getElementById('editTrainingIntensity').value,
        precautions: document.getElementById('editPrecautions').value || null,
        status: document.getElementById('editPlanStatus').value
    };
    
    const planId = document.getElementById('editTrainingPlanId').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/training-plans/${planId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error(getText('loading_plans'));
        
        const result = await response.json();
        if (result.id) {
            showMessage(getText('plan_updated'), 'success');
            hideEditModal();
            const patientId = getUrlParameter('patient_id');
            loadTrainingPlans(patientId);
        }
    } catch (error) {
        console.error('更新训练计划错误:', error);
        showMessage(error.message);
    }
}

// 为编辑训练计划加载阶段选项
async function loadStagesForEditTrainingPlan(patientId, selectedStageId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/rehabilitation-stages/${patientId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stages = await response.json();
            const select = document.getElementById('editPlanStage');
            const lang = i18n.currentLanguage;
            
            select.innerHTML = `<option value="">${lang === 'zh-CN' ? '选择康复阶段' : 'Select Rehabilitation Stage'}</option>`;
            
            if (Array.isArray(stages) && stages.length > 0) {
                stages.forEach(stage => {
                    const option = document.createElement('option');
                    option.value = stage.id;
                    option.textContent = stage.stage_name;
                    if (stage.id === selectedStageId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('加载阶段选项错误:', error);
    }
}

 