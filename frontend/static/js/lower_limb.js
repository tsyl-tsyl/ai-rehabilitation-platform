
// 语音录音功能
let mediaRecorder, audioChunks = [], audioBlob = null, audioUrl = null;
let audioContext, analyser, waveformCanvas, waveformCtx, animationId;

function drawWaveform(data) {
	waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
	waveformCtx.beginPath();
	for (let i = 0; i < data.length; i++) {
		const x = (i / data.length) * waveformCanvas.width;
		const y = (1 - data[i]) * waveformCanvas.height;
		if (i === 0) waveformCtx.moveTo(x, y);
		else waveformCtx.lineTo(x, y);
	}
	waveformCtx.strokeStyle = '#1565c0';
	waveformCtx.lineWidth = 2;
	waveformCtx.stroke();
}

function visualizeRecording() {
	if (!analyser) return;
	const bufferLength = analyser.fftSize;
	const dataArray = new Uint8Array(bufferLength);
	function draw() {
		analyser.getByteTimeDomainData(dataArray);
		const normData = Array.from(dataArray).map(v => v / 255);
		drawWaveform(normData);
		animationId = requestAnimationFrame(draw);
	}
	draw();
}

document.addEventListener('DOMContentLoaded', function() {
	waveformCanvas = document.getElementById('audioWaveform');
	if (waveformCanvas) waveformCtx = waveformCanvas.getContext('2d');
	const startBtn = document.getElementById('startRecord');
	const stopBtn = document.getElementById('stopRecord');
	const playBtn = document.getElementById('playRecord');
	const statusDiv = document.getElementById('recordStatus');

	if (startBtn) startBtn.onclick = async function() {
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			statusDiv.textContent = '浏览器不支持录音';
			return;
		}
		startBtn.disabled = true;
		stopBtn.disabled = false;
		playBtn.disabled = true;
		statusDiv.textContent = '正在录音...';
		audioChunks = [];
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder = new MediaRecorder(stream);
			mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
			mediaRecorder.onstop = () => {
				audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
				audioUrl = URL.createObjectURL(audioBlob);
				playBtn.disabled = false;
				statusDiv.textContent = '录音完成';
			};
			mediaRecorder.start();
			// 实时波形
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			visualizeRecording();
		} catch (err) {
			statusDiv.textContent = '无法访问麦克风';
			startBtn.disabled = false;
			stopBtn.disabled = true;
		}
	};

	if (stopBtn) stopBtn.onclick = function() {
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
			stopBtn.disabled = true;
			startBtn.disabled = false;
			statusDiv.textContent = '录音已停止';
			if (animationId) cancelAnimationFrame(animationId);
			if (audioContext) audioContext.close();
		}
	};

	if (playBtn) playBtn.onclick = function() {
		if (audioUrl) {
			const audio = new Audio(audioUrl);
			audio.play();
			statusDiv.textContent = '正在播放录音...';
			audio.onended = () => {
				statusDiv.textContent = '播放结束';
			};
		}
	};
});

	// 页面其他交互逻辑（训练模式选择、滑块、模拟数据）
	// 训练模式选择
	const exerciseBtns = document.querySelectorAll('.exercise-btn');
	exerciseBtns.forEach(btn => {
		btn.addEventListener('click', function() {
			exerciseBtns.forEach(b => {
				b.classList.remove('active');
				b.classList.remove('bg-accent');
				b.classList.add('bg-white/10');
			});
			this.classList.add('active');
			this.classList.add('bg-accent');
			this.classList.remove('bg-white/10');
		});
	});

	// 参数滑块更新显示值
	const rangeOfMotion = document.getElementById('rangeOfMotion');
	const rangeValue = document.getElementById('rangeValue');
	if (rangeOfMotion && rangeValue) {
		rangeOfMotion.addEventListener('input', function() {
			rangeValue.textContent = this.value + '%';
		});
	}

	const trainingSpeed = document.getElementById('trainingSpeed');
	const speedValue = document.getElementById('speedValue');
	if (trainingSpeed && speedValue) {
		trainingSpeed.addEventListener('input', function() {
			speedValue.textContent = this.value + '级';
		});
	}

	const resistanceLevel = document.getElementById('resistanceLevel');
	const resistanceValue = document.getElementById('resistanceValue');
	if (resistanceLevel && resistanceValue) {
		resistanceLevel.addEventListener('input', function() {
			resistanceValue.textContent = this.value + '级';
		});
	}

	// 模拟实时数据更新
	function updateRealTimeData() {
		// 模拟关节角度变化
		const leftHip = document.getElementById('leftHipAngle');
		const leftKnee = document.getElementById('leftKneeAngle');
		const leftAnkle = document.getElementById('leftAnkleAngle');
		const rightHip = document.getElementById('rightHipAngle');
		const rightKnee = document.getElementById('rightKneeAngle');
		const rightAnkle = document.getElementById('rightAnkleAngle');
		const stepFrequency = document.getElementById('stepFrequency');
		const gaitSymmetry = document.getElementById('gaitSymmetry');
		const supportPhase = document.getElementById('supportPhase');

		if (leftHip) leftHip.textContent = Math.floor(Math.random() * 120) + '°';
		if (leftKnee) leftKnee.textContent = Math.floor(Math.random() * 135) + '°';
		if (leftAnkle) leftAnkle.textContent = Math.floor(Math.random() * 30 + 20) + '°';
		if (rightHip) rightHip.textContent = Math.floor(Math.random() * 120) + '°';
		if (rightKnee) rightKnee.textContent = Math.floor(Math.random() * 135) + '°';
		if (rightAnkle) rightAnkle.textContent = Math.floor(Math.random() * 30 + 20) + '°';
		if (stepFrequency) stepFrequency.textContent = Math.floor(Math.random() * 40 + 60) + ' 步/分钟';
		if (gaitSymmetry) gaitSymmetry.textContent = Math.floor(Math.random() * 20 + 80) + '%';
		if (supportPhase) supportPhase.textContent = Math.floor(Math.random() * 10 + 60) + '%';
	}

	// 每3秒更新一次数据
	setInterval(updateRealTimeData, 3000);

	// 页面加载完成后执行
	document.addEventListener('DOMContentLoaded', function() {
		// 添加加载完成类
		document.body.classList.add('loaded');
	});
