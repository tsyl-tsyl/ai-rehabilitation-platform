// 共享的JavaScript功能
const API_BASE_URL ="http://127.0.0.1:8002";// window.location.origin;
// 模拟数据
const mockData = {
    shoulderAngle: 85,
    elbowAngle: 130,
    feedback: [
        { type: 'correction', text: '肘关节角度偏小，请尝试再伸展一些' },
        { type: 'encouragement', text: '肩关节角度保持得很好！' }
    ],
    sessionCount: 5,
    accuracyRate: '75%'
};

// 医生端模拟数据
const doctorMockData = {
    patients: [
        { id: 1, name: '张明', age: 65, condition: '脑卒中恢复期', sessions: 15, accuracy: '78%', progress: [65, 70, 68, 75, 72, 78, 80] },
        { id: 2, name: '李华', age: 58, condition: '脑卒中恢复期', sessions: 12, accuracy: '72%', progress: [60, 62, 65, 68, 70, 72, 75] },
        { id: 3, name: '王芳', age: 62, condition: '脑卒中恢复期', sessions: 18, accuracy: '82%', progress: [70, 72, 75, 78, 80, 82, 85] },
        { id: 4, name: '刘强', age: 70, condition: '脑卒中恢复期', sessions: 8, accuracy: '65%', progress: [55, 58, 60, 62, 63, 65, 68] }
    ],
    selectedPatient: null
};

// 全局状态变量（避免重复声明，挂载到 window）
if (typeof window.isTraining === 'undefined') window.isTraining = false;
if (typeof window.isPaused === 'undefined') window.isPaused = false;
if (typeof window.sessionCount === 'undefined') window.sessionCount = 0;
if (typeof window.audioEnabled === 'undefined') window.audioEnabled = false;

// 初始化摄像头
function initCamera() {
    const videoElement = document.getElementById('videoElement');
    if (!videoElement) return;
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(function(stream) {
                videoElement.srcObject = stream;
            })
            .catch(function(error) {
                console.error("无法访问摄像头: ", error);
                // 在移动设备上提供更好的错误提示
                // 仅反馈条提示，无弹窗
                if (/Mobi|Android/i.test(navigator.userAgent)) {
                    window.addFeedback && window.addFeedback("无法访问摄像头，请确保已授予摄像头权限，并尝试使用后置摄像头", "error");
                } else {
                    window.addFeedback && window.addFeedback("无法访问摄像头，请检查权限设置", "error");
                }
            });
    } else {
    window.addFeedback && window.addFeedback("您的浏览器不支持摄像头访问", "error");
    }
}

// 初始化进度图表
function initProgressChart() {
    const progressChart = document.getElementById('progressChart');
    if (!progressChart) return;
    
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const progressData = [65, 70, 68, 75, 72, 78, 80];
    
    days.forEach((day, index) => {
        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.style.height = `${progressData[index]}%`;
        
        const label = document.createElement('div');
        label.className = 'progress-bar-label';
        label.textContent = day;
        
        bar.appendChild(label);
        progressChart.appendChild(bar);
    });
}

// 渲染患者列表
function renderPatientList() {
    const patientList = document.getElementById('patientList');
    if (!patientList) return;
    
    patientList.innerHTML = '';
    
    doctorMockData.patients.forEach(patient => {
        const patientCard = document.createElement('div');
        patientCard.className = 'patient-card';
        if (doctorMockData.selectedPatient && doctorMockData.selectedPatient.id === patient.id) {
            patientCard.classList.add('selected');
        }
        
        patientCard.innerHTML = `
            <div class="patient-info">
                <div class="patient-name">${patient.name}</div>
                <div>${patient.age}岁</div>
            </div>
            <div class="patient-details">
                <div>诊断: ${patient.condition}</div>
                <div>本周训练: ${patient.sessions}次 | 准确率: ${patient.accuracy}</div>
            </div>
        `;
        
        patientCard.addEventListener('click', () => selectPatient(patient));
        patientList.appendChild(patientCard);
    });
}

// 选择患者
function selectPatient(patient) {
    const selectedPatientInfo = document.getElementById('selectedPatientInfo');
    const patientDataDisplay = document.getElementById('patientDataDisplay');
    const weeklySessionsEl = document.getElementById('weeklySessions');
    const patientAccuracyEl = document.getElementById('patientAccuracy');
    const doctorProgressChart = document.getElementById('doctorProgressChart');
    
    if (!selectedPatientInfo || !patientDataDisplay || !weeklySessionsEl || !patientAccuracyEl || !doctorProgressChart) return;
    
    doctorMockData.selectedPatient = patient;
    renderPatientList();
    
    // 更新患者信息显示
    selectedPatientInfo.innerHTML = `
        <h3>${patient.name} (${patient.age}岁)</h3>
        <p>诊断: ${patient.condition}</p>
        <p>本周已完成训练: ${patient.sessions}次</p>
        <p>平均准确率: ${patient.accuracy}</p>
    `;
    
    // 显示患者数据
    patientDataDisplay.style.display = 'grid';
    weeklySessionsEl.textContent = patient.sessions;
    patientAccuracyEl.textContent = patient.accuracy;
    
    // 更新进度图表
    updateDoctorProgressChart(patient.progress);
}

// 更新医生端进度图表
function updateDoctorProgressChart(progressData) {
    const doctorProgressChart = document.getElementById('doctorProgressChart');
    if (!doctorProgressChart) return;
    
    doctorProgressChart.innerHTML = '';
    doctorProgressChart.style.display = 'flex';
    
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    days.forEach((day, index) => {
        const bar = document.createElement('div');
        bar.className = 'progress-bar doctor-progress-bar';
        bar.style.height = `${progressData[index]}%`;
        
        const label = document.createElement('div');
        label.className = 'progress-bar-label';
        label.textContent = day;
        
        bar.appendChild(label);
        doctorProgressChart.appendChild(bar);
    });
}

// 渲染医生端报告
function renderDoctorReport() {
    const doctorReportTableBody = document.getElementById('doctorReportTableBody');
    if (!doctorReportTableBody) return;
    
    doctorReportTableBody.innerHTML = '';
    
    doctorMockData.patients.forEach(patient => {
        const row = document.createElement('tr');
        
        // 根据准确率确定康复阶段
        let stage, statusClass;
        const accuracy = parseInt(patient.accuracy);
        if (accuracy >= 80) {
            stage = '良好';
            statusClass = 'status-good';
        } else if (accuracy >= 70) {
            stage = '一般';
            statusClass = 'status-fair';
        } else {
            stage = '需加强';
            statusClass = 'status-poor';
        }
        
        row.innerHTML = `
            <td>${patient.name}</td>
            <td>屈伸训练</td>
            <td>${patient.sessions}</td>
            <td>${patient.accuracy}</td>
            <td>${(100 - accuracy) * 0.2}°</td>
            <td>${(100 - accuracy) * 0.3}°</td>
            <td><span class="status-indicator ${statusClass}"></span>${stage}</td>
        `;
        
        doctorReportTableBody.appendChild(row);
    });
}

// 开始训练
function startTraining() {
    if (!isTraining) {
        isTraining = true;
        isPaused = false;
        
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (startBtn) startBtn.textContent = "训练中...";
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        
        // 模拟开始训练后的数据更新
        updateTrainingData();
        
        // 模拟骨骼点绘制
        simulatePoseDetection();
        
        addFeedback("训练已开始，请按照标准动作进行练习", "encouragement");
        
        // 如果启用了语音，播放开始提示
        if (audioEnabled) {
            speak("训练开始，请按照标准动作进行练习");
        }
    }
}

// 切换暂停状态
function togglePause() {
    isPaused = !isPaused;
    
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.textContent = isPaused ? "继续" : "暂停";
    
    if (isPaused) {
        addFeedback("训练已暂停", "encouragement");
    } else {
        addFeedback("训练继续", "encouragement");
    }
}

// 重置训练
function resetTraining() {
    isTraining = false;
    isPaused = false;
    
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const shoulderAngleEl = document.getElementById('shoulderAngle');
    const elbowAngleEl = document.getElementById('elbowAngle');
    const sessionCountEl = document.getElementById('sessionCount');
    const accuracyRateEl = document.getElementById('accuracyRate');
    const feedbackContainer = document.getElementById('feedbackContainer');
    
    if (startBtn) startBtn.textContent = "开始训练";
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
    if (pauseBtn) pauseBtn.textContent = "暂停";
    
    // 重置数据
    if (shoulderAngleEl) shoulderAngleEl.textContent = "0°";
    if (elbowAngleEl) elbowAngleEl.textContent = "0°";
    sessionCount = 0;
    if (sessionCountEl) sessionCountEl.textContent = "0";
    if (accuracyRateEl) accuracyRateEl.textContent = "0%";
    
    // 清除反馈
    if (feedbackContainer) {
        feedbackContainer.innerHTML = '';
        addFeedback("系统已重置，请重新开始训练", "encouragement");
    }
}

// 切换语音提示
function toggleAudio() {
    audioEnabled = !audioEnabled;
    
    const enableAudioBtn = document.getElementById('enableAudio');
    if (enableAudioBtn) {
        enableAudioBtn.textContent = audioEnabled ? "禁用语音提示" : "启用语音提示";
        enableAudioBtn.classList.toggle("success", audioEnabled);
        enableAudioBtn.classList.toggle("secondary", !audioEnabled);
    }
    
    if (audioEnabled) {
        addFeedback("语音提示已启用", "encouragement");
        speak("语音提示已启用");
    } else {
        addFeedback("语音提示已禁用", "encouragement");
    }
}

// 添加反馈条目
function addFeedback(text, type) {
    const feedbackContainer = document.getElementById('feedbackContainer');
    if (!feedbackContainer) return;
    
    // 清除旧反馈
    if (feedbackContainer.children.length > 5) {
        feedbackContainer.removeChild(feedbackContainer.children[0]);
    }
    
    const feedbackItem = document.createElement('div');
    feedbackItem.className = `feedback-item ${type}`;
    feedbackItem.innerHTML = `<strong>${type === 'correction' ? '矫正提示' : '鼓励'}</strong> - ${text}`;
    feedbackContainer.appendChild(feedbackItem);
    feedbackContainer.scrollTop = feedbackContainer.scrollHeight;
}

// 语音合成
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

// 更新训练数据
function updateTrainingData() {
    if (!isTraining || isPaused) return;
    
    const shoulderAngleEl = document.getElementById('shoulderAngle');
    const elbowAngleEl = document.getElementById('elbowAngle');
    const sessionCountEl = document.getElementById('sessionCount');
    const accuracyRateEl = document.getElementById('accuracyRate');
    
    if (!shoulderAngleEl || !elbowAngleEl || !sessionCountEl || !accuracyRateEl) return;
    
    // 模拟数据更新
    const shoulderAngle = 80 + Math.floor(Math.random() * 20);
    const elbowAngle = 120 + Math.floor(Math.random() * 30);
    
    shoulderAngleEl.textContent = `${shoulderAngle}°`;
    elbowAngleEl.textContent = `${elbowAngle}°`;
    
    // 模拟反馈生成
    generateFeedback(shoulderAngle, elbowAngle);
    
    // 每5次动作增加一次计数
    if (Math.random() > 0.8) {
        sessionCount++;
        sessionCountEl.textContent = sessionCount;
        
        // 更新准确率
        const accuracy = 60 + Math.floor(Math.random() * 30);
        accuracyRateEl.textContent = `${accuracy}%`;
    }
    
    // 继续更新
    setTimeout(updateTrainingData, 1000);
}

// 生成反馈
function generateFeedback(shoulderAngle, elbowAngle) {
    // 肩关节反馈
    if (shoulderAngle < 85) {
           window.addFeedback("肩关节角度偏小，请尝试抬高手臂", "correction");
        if (audioEnabled) speak("肩关节角度偏小，请尝试抬高手臂");
    } else if (shoulderAngle > 95) {
           window.addFeedback("肩关节角度偏大，请稍微放低手臂", "correction");
        if (audioEnabled) speak("肩关节角度偏大，请稍微放低手臂");
    } else {
           window.addFeedback("肩关节角度良好", "encouragement");
    }
    
    // 肘关节反馈
    if (elbowAngle < 125) {
           window.addFeedback("肘关节角度偏小，请尝试伸展手臂", "correction");
        if (audioEnabled) speak("肘关节角度偏小，请尝试伸展手臂");
    } else if (elbowAngle > 145) {
           window.addFeedback("肘关节角度偏大，请稍微弯曲手臂", "correction");
        if (audioEnabled) speak("肘关节角度偏大，请稍微弯曲手臂");
    } else {
           window.addFeedback("肘关节角度良好", "encouragement");
    }
}

// 模拟姿态检测绘制
function simulatePoseDetection() {
    if (!isTraining || isPaused) return;
    
    const canvasElement = document.getElementById('canvasElement');
    const videoElement = document.getElementById('videoElement');
    
    if (!canvasElement || !videoElement) return;
    
    const canvasCtx = canvasElement.getContext('2d');
    
    // 设置canvas尺寸与video一致
    canvasElement.width = videoElement.videoWidth || 640;
    canvasElement.height = videoElement.videoHeight || 480;
    
    // 清除画布
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // 模拟绘制骨骼点
    canvasCtx.strokeStyle = '#00ff00';
    canvasCtx.lineWidth = 3;
    
    // 绘制连线 (模拟上肢骨骼)
    const points = [
        {x: canvasElement.width * 0.3, y: canvasElement.height * 0.2}, // 左肩
        {x: canvasElement.width * 0.4, y: canvasElement.height * 0.4}, // 左肘
        {x: canvasElement.width * 0.5, y: canvasElement.height * 0.6}  // 左腕
    ];
    
    // 绘制骨骼连线
    canvasCtx.beginPath();
    canvasCtx.moveTo(points[0].x, points[0].y);
    canvasCtx.lineTo(points[1].x, points[1].y);
    canvasCtx.lineTo(points[2].x, points[2].y);
    canvasCtx.stroke();
    
    // 绘制关节点
    canvasCtx.fillStyle = '#ff0000';
    points.forEach(point => {
        canvasCtx.beginPath();
        canvasCtx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        canvasCtx.fill();
    });
    
    // 绘制角度文本
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = '16px Arial';
    canvasCtx.fillText(`肩: ${mockData.shoulderAngle}°`, points[0].x - 30, points[0].y - 10);
    canvasCtx.fillText(`肘: ${mockData.elbowAngle}°`, points[1].x - 30, points[1].y - 10);
    
    // 继续绘制
    requestAnimationFrame(simulatePoseDetection);
}

// 处理窗口大小变化
function handleResize() {
    // 重新调整canvas大小
    if (isTraining) {
        const canvasElement = document.getElementById('canvasElement');
        const videoElement = document.getElementById('videoElement');
        
        if (canvasElement && videoElement && videoElement.videoWidth && videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
    }
}

// 添加触摸事件支持
function addTouchSupport() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            startTraining();
        });
    }
}

// 初始化通用功能
function initCommon() {
    // 添加触摸事件支持
    addTouchSupport();
    
    // 响应窗口大小变化
    window.addEventListener('resize', handleResize);
}

// 页面加载完成后初始化通用功能
document.addEventListener('DOMContentLoaded', initCommon);



//登录后新加的功能

// 获取URL参数
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 显示消息提示
function showMessage(message, type = 'error') {
    const existingMessage = document.querySelector('.message-toast');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `message-toast fixed top-4 right-4 p-4 rounded-lg z-50 transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white shadow-lg`;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// 获取认证头
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// 检查登录状态
function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 获取本地化文本
function getText(key) {
    return i18n.t(key) || key;
}