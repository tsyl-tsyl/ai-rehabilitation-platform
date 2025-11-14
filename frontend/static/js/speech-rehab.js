// 语音康复训练系统 - 前端JavaScript
class SpeechRehabSystem {
    constructor() {
        this.apiBase = 'http://localhost:8000/api';
        this.currentExercise = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.userAudioUrl = null;
    }

    // 初始化系统
    async init() {
        this.setupEventListeners();
        await this.loadInitialExercises();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 练习类型选择
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectExerciseType(e.currentTarget.dataset.type);
            });
        });

        // 难度选择
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectDifficulty(parseInt(e.currentTarget.dataset.level));
            });
        });

        // 录音控制
        document.getElementById('start-record-btn').addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('stop-record-btn').addEventListener('click', () => {
            this.stopRecording();
        });

        // 播放示范
        document.getElementById('play-example-btn').addEventListener('click', () => {
            this.playExample();
        });

        // 对比分析
        document.getElementById('compare-btn').addEventListener('click', () => {
            this.analyzeSpeech();
        });

        // 下一个练习
        document.getElementById('next-item-btn').addEventListener('click', () => {
            this.nextExercise();
        });
    }

    // 选择练习类型
    async selectExerciseType(type) {
        // 更新UI
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('ring-2', 'ring-accent');
        });
        event.currentTarget.classList.add('ring-2', 'ring-accent');

        this.currentExercise = {
            type: type,
            level: this.currentExercise?.level || 1,
            index: 0
        };

        await this.loadExercises(type, this.currentExercise.level);
    }

    // 选择难度
    async selectDifficulty(level) {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('bg-accent');
            btn.classList.add('bg-white/10', 'hover:bg-white/20');
        });
        event.currentTarget.classList.remove('bg-white/10', 'hover:bg-white/20');
        event.currentTarget.classList.add('bg-accent');

        if (this.currentExercise) {
            this.currentExercise.level = level;
            await this.loadExercises(this.currentExercise.type, level);
        }
    }

    // 加载练习内容
    async loadExercises(type, level) {
        try {
            const response = await fetch(`${this.apiBase}/exercises/${type}/${level}`);
            const data = await response.json();
            
            this.currentExercise.items = data.exercises;
            this.currentExercise.index = 0;
            this.displayCurrentExercise();
        } catch (error) {
            console.error('加载练习失败:', error);
            this.showError('加载练习失败，请检查网络连接');
        }
    }

    // 显示当前练习
    displayCurrentExercise() {
        if (!this.currentExercise.items || this.currentExercise.index >= this.currentExercise.items.length) {
            return;
        }

        const exercise = this.currentExercise.items[this.currentExercise.index];
        document.getElementById('practice-text').textContent = exercise.text;
        
        // 更新图片（根据练习类型和文本）
        this.updateExerciseImage(exercise.text);
        
        // 重置状态
        this.resetAssessmentUI();
    }

    // 更新练习图片
    updateExerciseImage(text) {
        const imageMap = {
            // 元音练习图片
            '啊': '../images/aphasia/vowel/vowel_a.jpg',
            '喔': '../images/aphasia/vowel/vowel_o.jpg',
            '鹅': '../images/aphasia/vowel/vowel_e.jpg',
            // 单词练习图片
            '爸爸': '../images/aphasia/word/word_baba.jpg',
            '妈妈': '../images/aphasia/word/word_mama.jpg',
            '水': '../images/aphasia/word/word_water.jpg',
            // 短语练习图片
            '你好': '../images/aphasia/phrase/phrase_hello.jpg',
            '谢谢': '../images/aphasia/phrase/phrase_thanks.jpg',
            '再见': '../images/aphasia/phrase/phrase_goodbye.jpg'
        };

        const imgElement = document.getElementById('practice-image');
        imgElement.src = imageMap[text] || '../images/aphasia/default.jpg';
        imgElement.alt = text;
    }

    // 播放示范
    playExample() {
        if (!this.currentExercise.items) return;

        const text = this.currentExercise.items[this.currentExercise.index].text;
        this.speakText(text);
    }

    // 文本转语音
    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = parseFloat(document.getElementById('rate').value);
            utterance.volume = parseFloat(document.getElementById('volume').value;
            
            // 选择中文语音
            const voices = speechSynthesis.getVoices();
            const chineseVoice = voices.find(voice => 
                voice.lang.includes('zh') || voice.name.includes('Chinese')
            );
            if (chineseVoice) {
                utterance.voice = chineseVoice;
            }
            
            speechSynthesis.speak(utterance);
        } else {
            this.showError('您的浏览器不支持语音合成功能');
        }
    }

    // 开始录音
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.userAudioUrl = URL.createObjectURL(audioBlob);
                
                // 更新UI
                document.getElementById('play-user-btn').disabled = false;
                document.getElementById('compare-btn').disabled = false;
                document.getElementById('user-status').textContent = '已录制';
                
                // 停止所有轨道
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // 更新UI
            document.getElementById('start-record-btn').disabled = true;
            document.getElementById('stop-record-btn').disabled = false;
            document.getElementById('recording-status').classList.remove('hidden');
            
        } catch (error) {
            console.error('录音失败:', error);
            this.showError('无法访问麦克风，请检查权限设置');
        }
    }

    // 停止录音
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // 更新UI
            document.getElementById('start-record-btn').disabled = false;
            document.getElementById('stop-record-btn').disabled = true;
            document.getElementById('recording-status').classList.add('hidden');
        }
    }

    // 播放用户录音
    playUserRecording() {
        if (this.userAudioUrl) {
            const audio = new Audio(this.userAudioUrl);
            audio.play();
        }
    }

    // 分析语音
    async analyzeSpeech() {
        if (!this.userAudioUrl || !this.currentExercise.items) return;

        const exercise = this.currentExercise.items[this.currentExercise.index];
        
        try {
            // 显示加载状态
            this.showLoading(true);
            
            // 获取音频Blob
            const response = await fetch(this.userAudioUrl);
            const audioBlob = await response.blob();
            
            // 创建FormData
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'recording.webm');
            formData.append('reference_text', exercise.text);
            formData.append('exercise_type', this.currentExercise.type);
            formData.append('difficulty', this.currentExercise.level.toString());
            
            // 发送到后端分析
            const assessmentResponse = await fetch(`${this.apiBase}/assess-speech`, {
                method: 'POST',
                body: formData
            });
            
            if (!assessmentResponse.ok) {
                throw new Error('分析请求失败');
            }
            
            const result = await assessmentResponse.json();
            this.displayAssessmentResult(result);
            
            // 保存进度
            await this.saveProgress(result);
            
        } catch (error) {
            console.error('分析失败:', error);
            this.showError('语音分析失败，请重试');
        } finally {
            this.showLoading(false);
        }
    }

    // 显示分析结果
    displayAssessmentResult(result) {
        // 更新相似度分数
        document.getElementById('similarity-score').textContent = 
            `${Math.round(result.similarity_score * 100)}%`;
        
        // 更新反馈
        document.getElementById('similarity-feedback').textContent = result.feedback;
        
        // 显示问题词汇
        this.displayProblemWords(result.problem_words);
        
        // 显示建议
        this.displayRecommendations(result.recommendations);
        
        // 显示结果区域
        document.getElementById('comparison-result').classList.remove('hidden');
        
        // 更新波形显示（模拟）
        this.updateWaveforms(result.similarity_score);
    }

    // 显示问题词汇
    displayProblemWords(problemWords) {
        const container = document.getElementById('problem-words-container');
        if (!container) return;
        
        if (problemWords.length === 0) {
            container.innerHTML = '<div class="text-green-400">没有发现明显发音问题</div>';
            return;
        }
        
        let html = '<div class="space-y-2">';
        problemWords.forEach(problem => {
            html += `
                <div class="flex items-center justify-between p-2 bg-white/5 rounded">
                    <div>
                        <span class="font-medium text-red-400">${problem.word}</span>
                        <span class="text-sm opacity-80 ml-2">${problem.problem}</span>
                    </div>
                    <div class="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                        ${problem.severity}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // 显示建议
    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations-container');
        if (!container) return;
        
        let html = '<div class="space-y-2">';
        recommendations.forEach(rec => {
            html += `
                <div class="flex items-start p-2 bg-white/5 rounded">
                    <i class="fa fa-check text-green-400 mt-1 mr-2"></i>
                    <span class="text-sm">${rec}</span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // 更新波形显示
    updateWaveforms(similarityScore) {
        // 模拟波形更新
        const modelCtx = document.getElementById('model-waveform').getContext('2d');
        const userCtx = document.getElementById('user-waveform').getContext('2d');
        
        this.drawWaveform(modelCtx, '#64B5F6', 0.8);
        this.drawWaveform(userCtx, '#F97316', similarityScore);
    }

    // 绘制波形
    drawWaveform(ctx, color, intensity) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制波形线
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        for (let i = 0; i < width; i++) {
            const x = i;
            const variation = Math.sin(i * 0.05) * intensity;
            const noise = (Math.random() - 0.5) * 0.3 * (1 - intensity);
            const y = height / 2 + (variation + noise) * (height / 3);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 填充波形区域
        ctx.fillStyle = color + '33';
        ctx.fill();
    }

    // 下一个练习
    nextExercise() {
        if (!this.currentExercise.items) return;
        
        this.currentExercise.index++;
        if (this.currentExercise.index >= this.currentExercise.items.length) {
            this.currentExercise.index = 0;
        }
        
        this.displayCurrentExercise();
        this.resetRecording();
    }

    // 重置录音状态
    resetRecording() {
        this.userAudioUrl = null;
        this.audioChunks = [];
        
        document.getElementById('play-user-btn').disabled = true;
        document.getElementById('compare-btn').disabled = true;
        document.getElementById('user-status').textContent = '未录制';
        
        document.getElementById('comparison-result').classList.add('hidden');
    }

    // 重置评估UI
    resetAssessmentUI() {
        this.resetRecording();
        
        const modelCtx = document.getElementById('model-waveform').getContext('2d');
        const userCtx = document.getElementById('user-waveform').getContext('2d');
        
        this.drawEmptyWaveform(modelCtx, '#64B5F6');
        this.drawEmptyWaveform(userCtx, '#F97316');
        
        document.getElementById('model-status').textContent = '未播放';
        document.getElementById('user-status').textContent = '未录制';
    }

    // 绘制空波形
    drawEmptyWaveform(ctx, color) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // 绘制中线
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 绘制提示文字
        ctx.fillStyle = color + '80';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('等待音频数据...', width / 2, height / 2);
    }

    // 保存进度
    async saveProgress(assessmentResult) {
        try {
            const progress = {
                user_id: 'user_' + Date.now(),
                exercise_type: this.currentExercise.type,
                difficulty: this.currentExercise.level,
                score: assessmentResult.similarity_score * 100,
                duration: 60, // 模拟练习时长
                date: new Date().toISOString().split('T')[0]
            };
            
            await fetch(`${this.apiBase}/save-progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(progress)
            });
            
            this.updateProgressUI();
            
        } catch (error) {
            console.error('保存进度失败:', error);
        }
    }

    // 更新进度UI
    updateProgressUI() {
        // 更新进度条和统计信息
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const completedCount = document.getElementById('completed-count');
        const accuracyRate = document.getElementById('accuracy-rate');
        
        // 模拟进度更新
        const current = parseInt(completedCount.textContent) || 0;
        completedCount.textContent = current + 1;
        
        const total = this.currentExercise.items?.length || 5;
        const progress = Math.min(100, ((current + 1) / total) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${current + 1}/${total}`;
        
        // 更新准确率
        const currentAccuracy = parseInt(accuracyRate.textContent) || 0;
        const newAccuracy = Math.round((currentAccuracy * current + 85) / (current + 1));
        accuracyRate.textContent = `${newAccuracy}%`;
    }

    // 显示加载状态
    showLoading(show) {
        const buttons = ['compare-btn', 'start-record-btn', 'stop-record-btn', 'play-user-btn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = show;
            }
        });
        
        if (show) {
            document.getElementById('user-status').textContent = '分析中...';
        }
    }

    // 显示错误
    showError(message) {
        // 可以在这里实现更优雅的错误提示
        alert(message);
    }

    // 初始加载练习
    async loadInitialExercises() {
        this.currentExercise = {
            type: 'vowel',
            level: 1,
            index: 0
        };
        
        await this.loadExercises('vowel', 1);
        
        // 设置默认选中的任务卡和难度按钮
        document.querySelector('.task-card[data-type="vowel"]').classList.add('ring-2', 'ring-accent');
        document.querySelector('.difficulty-btn[data-level="1"]').classList.add('bg-accent');
    }
}

// 初始化系统
document.addEventListener('DOMContentLoaded', function() {
    const speechRehab = new SpeechRehabSystem();
    speechRehab.init();
});