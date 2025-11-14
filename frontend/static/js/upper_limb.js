// 上肢康复患者端特定的JavaScript功能

class UpperLimbPatientApp {
    constructor() {
        this.videoElement = document.getElementById('videoElement');
        this.canvasElement = document.getElementById('canvasElement');
        this.processedImage = document.getElementById('processedImage');
        this.isTraining = false;
        this.websocket = null;
        this.currentSessionId = null;
        this.audioEnabled = false;
        this.angleHistory = [];
        
        this.init();
    }
    
    init() {
        this.initCamera();
        this.initProgressChart();
        this.setupEventListeners();
    }
    
    initCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: "user"
                } 
            })
            .then(stream => {
                this.videoElement.srcObject = stream;
            })
            .catch(error => {
                console.error("无法访问摄像头:", error);
                this.addFeedback("无法访问摄像头，请检查权限设置", "correction");
            });
        }
    }
    
    initProgressChart() {
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
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startTraining());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetTraining());
        document.getElementById('enableAudio').addEventListener('click', () => this.toggleAudio());
        document.getElementById('selectExercise').addEventListener('click', () => this.selectExercise());
        document.getElementById('exportReport').addEventListener('click', () => this.exportReport());
        document.getElementById('viewHistory').addEventListener('click', () => this.viewHistory());
    }
    
    async startTraining() {
        if (!this.isTraining) {
            this.isTraining = true;
            
            // 创建训练会话
            const sessionData = {
                patient_id: 1, // 从登录信息获取
                exercise_id: 1,
                start_time: new Date().toISOString()
            };
            
            try {
                const response = await fetch('/upper_limb/training_sessions/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sessionData)
                });
                
                const session = await response.json();
                this.currentSessionId = session.id;
                
                // 连接到WebSocket
                this.connectWebSocket();
                
                this.updateUIForTraining();
                this.addFeedback("训练已开始，请按照标准动作进行练习", "encouragement");
                
            } catch (error) {
                console.error("创建训练会话失败:", error);
                this.addFeedback("训练开始失败，请重试", "correction");
            }
        }
    }
    
    connectWebSocket() {
        this.websocket = new WebSocket(`ws://localhost:8000/upper_limb/ws/pose/1`);
        
        this.websocket.onopen = () => {
            console.log("WebSocket连接已建立");
            this.startPoseEstimation();
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.processPoseData(data);
        };
        
        this.websocket.onclose = () => {
            console.log("WebSocket连接已关闭");
        };
        
        this.websocket.onerror = (error) => {
            console.error("WebSocket错误:", error);
            this.addFeedback("连接错误，请检查网络", "correction");
        };
    }
    
    startPoseEstimation() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const sendFrame = () => {
            if (this.isTraining && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                // 捕获视频帧
                canvas.width = this.videoElement.videoWidth;
                canvas.height = this.videoElement.videoHeight;
                ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
                
                // 转换为Base64
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                
                // 发送到服务器
                this.websocket.send(JSON.stringify({
                    image: imageData
                }));
            }
            
            if (this.isTraining) {
                requestAnimationFrame(sendFrame);
            }
        };
        
        sendFrame();
    }
    
    processPoseData(data) {
        // 显示处理后的图像（如果存在）
        if (data.processed_image) {
            this.processedImage.src = data.processed_image;
            this.processedImage.style.display = 'block';
        }
        
        if (data.angles) {
            // 更新角度显示
            this.updateAngleDisplays(data.angles);
            
            // 存储角度历史用于分析
            this.angleHistory.push({
                timestamp: data.timestamp,
                angles: data.angles
            });
            
            // 保持历史数据长度
            if (this.angleHistory.length > 100) {
                this.angleHistory.shift();
            }
            
            // 处理比较结果
            if (data.comparison) {
                this.updateFeedback(data.comparison.feedback);
                this.updateAccuracy(data.comparison.accuracy);
                
                // 保存关节数据
                this.saveJointData(data.angles, data.comparison.accuracy);
            }
        }
        
        // 处理姿态不可见的情况
        if (!data.visibility) {
            this.addFeedback("未检测到人体姿态，请确保在摄像头范围内", "correction");
        }
    }
    
    updateAngleDisplays(angles) {
        const angleElements = {
            'left_shoulder': 'leftShoulderAngle',
            'left_elbow': 'leftElbowAngle',
            'right_shoulder': 'rightShoulderAngle',
            'right_elbow': 'rightElbowAngle'
        };
        
        for (const [joint, elementId] of Object.entries(angleElements)) {
            const element = document.getElementById(elementId);
            if (element && angles[joint]) {
                element.textContent = `${Math.round(angles[joint])}°`;
                
                // 根据角度偏差添加颜色提示
                const standardAngles = {
                    'left_shoulder': 90, 'right_shoulder': 90,
                    'left_elbow': 135, 'right_elbow': 135
                };
                
                const deviation = Math.abs(angles[joint] - standardAngles[joint]);
                if (deviation > 20) {
                    element.style.color = 'var(--danger-color)';
                } else if (deviation > 10) {
                    element.style.color = 'var(--warning-color)';
                } else {
                    element.style.color = 'var(--success-color)';
                }
            }
        }
    }
    
    updateFeedback(feedbackMessages) {
        const feedbackContainer = document.getElementById('feedbackContainer');
        
        // 清除旧反馈
        if (feedbackContainer.children.length > 5) {
            feedbackContainer.removeChild(feedbackContainer.children[0]);
        }
        
        // 添加新反馈
        feedbackMessages.forEach(message => {
            const type = message.includes('良好') ? 'encouragement' : 'correction';
            this.addFeedback(message, type);
        });
    }
    
    updateAccuracy(accuracy) {
        const accuracyElement = document.getElementById('accuracyRate');
        if (accuracyElement) {
            accuracyElement.textContent = `${Math.round(accuracy)}%`;
            
            // 更新颜色
            if (accuracy >= 80) {
                accuracyElement.style.color = 'var(--success-color)';
            } else if (accuracy >= 60) {
                accuracyElement.style.color = 'var(--warning-color)';
            } else {
                accuracyElement.style.color = 'var(--danger-color)';
            }
        }
        
        // 更新会话计数
        if (accuracy >= 70) {
            const sessionCountElement = document.getElementById('sessionCount');
            if (sessionCountElement) {
                const currentCount = parseInt(sessionCountElement.textContent);
                sessionCountElement.textContent = currentCount + 1;
            }
        }
    }
    
    async saveJointData(angles, accuracy) {
        if (!this.currentSessionId) return;
        
        try {
            const jointData = {
                session_id: this.currentSessionId,
                left_shoulder_angle: angles.left_shoulder,
                left_elbow_angle: angles.left_elbow,
                right_shoulder_angle: angles.right_shoulder,
                right_elbow_angle: angles.right_elbow,
                left_accuracy: accuracy,
                right_accuracy: accuracy,
                landmarks_data: angles // 简化处理，实际应该存储完整的landmarks数据
            };
            
            await fetch('/upper_limb/joint_data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jointData)
            });
        } catch (error) {
            console.error("保存关节数据失败:", error);
        }
    }
    
    addFeedback(text, type) {
        const feedbackContainer = document.getElementById('feedbackContainer');
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item ${type}`;
        feedbackItem.innerHTML = `<strong>${type === 'correction' ? '矫正提示' : '鼓励'}</strong> - ${text}`;
        feedbackContainer.appendChild(feedbackItem);
        feedbackContainer.scrollTop = feedbackContainer.scrollHeight;
        
        // 语音提示
        if (this.audioEnabled && type === 'correction') {
            this.speak(text);
        }
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }
    
    togglePause() {
        this.isTraining = !this.isTraining;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isTraining ? "暂停" : "继续";
        
        if (this.isTraining) {
            this.addFeedback("训练继续", "encouragement");
            this.startPoseEstimation();
        } else {
            this.addFeedback("训练已暂停", "encouragement");
        }
    }
    
    resetTraining() {
        this.isTraining = false;
        if (this.websocket) {
            this.websocket.close();
        }
        
        // 重置显示
        document.getElementById('leftShoulderAngle').textContent = "0°";
        document.getElementById('leftElbowAngle').textContent = "0°";
        document.getElementById('rightShoulderAngle').textContent = "0°";
        document.getElementById('rightElbowAngle').textContent = "0°";
        document.getElementById('accuracyRate').textContent = "0%";
        
        // 重置颜色
        const angleElements = document.querySelectorAll('.angle-value');
        angleElements.forEach(el => {
            el.style.color = 'var(--primary-color)';
        });
        
        const feedbackContainer = document.getElementById('feedbackContainer');
        feedbackContainer.innerHTML = '';
        this.addFeedback("系统已重置", "encouragement");
        
        this.processedImage.style.display = 'none';
        this.angleHistory = [];
        
        this.updateUIForIdle();
    }
    
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        const enableAudioBtn = document.getElementById('enableAudio');
        enableAudioBtn.textContent = this.audioEnabled ? "禁用语音提示" : "启用语音提示";
        enableAudioBtn.classList.toggle("success", this.audioEnabled);
        enableAudioBtn.classList.toggle("secondary", !this.audioEnabled);
        
        this.addFeedback(`语音提示已${this.audioEnabled ? '启用' : '禁用'}`, "encouragement");
    }
    
    selectExercise() {
        const exercises = ["抬手训练", "抓握训练", "屈伸训练", "旋转训练"];
        const selected = prompt(`请选择训练动作:\n${exercises.map((ex, i) => `${i+1}. ${ex}`).join('\n')}`, "1");
        
        if (selected && exercises[parseInt(selected)-1]) {
            this.addFeedback(`已选择: ${exercises[parseInt(selected)-1]}`, "encouragement");
        }
    }
    
    exportReport() {
        alert("训练报告导出功能将在完整版中实现");
    }
    
    viewHistory() {
        alert("历史数据查看功能将在完整版中实现");
    }
    
    updateUIForTraining() {
        document.getElementById('startBtn').textContent = "训练中...";
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    }
    
    updateUIForIdle() {
        document.getElementById('startBtn').textContent = "开始训练";
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = "暂停";
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new UpperLimbPatientApp();
});