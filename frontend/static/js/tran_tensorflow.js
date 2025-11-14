// js/tran_tensorflow.js
// 前端与 tranTensorflow.py 后端交互，支持模型训练、继续训练、管理、实时监控

const API_BASE = 'http://127.0.0.1:8000/api/tran_tensorflow';

// 工具函数：格式化进度
function formatProgress(epoch, total, loss, acc) {
  return `Epoch ${epoch}/${total} | 损失: ${loss.toFixed(4)} | 准确率: ${(acc*100).toFixed(2)}%`;
}

// 1. 模型训练系统
const trainForm = document.getElementById('trainForm');
const trainProgress = document.getElementById('trainProgress');
const trainResult = document.getElementById('trainResult');
trainForm && trainForm.addEventListener('submit', async e => {
  e.preventDefault();
  trainProgress.textContent = '正在提交训练...';
  trainResult.textContent = '';
  const fd = new FormData(trainForm);
  const params = Object.fromEntries(fd.entries());
  params.lr = parseFloat(params.lr) || 0.001;
  params.batch = parseInt(params.batch) || 8;
  params.epoch = parseInt(params.epoch) || 5;
  params.category = 'upper_limb';
  // 关键：带上MediaPipe采集数据
  params.X = mediapipeSamples;
  params.y = mediapipeLabels;
  const resp = await fetch('/api/tran_tensorflow/train', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params)
  });
  if (!resp.body) {
    trainProgress.textContent = '后端未返回流式数据';
    alert('后端未返回流式数据');
    return;
  }
  const reader = resp.body.getReader();
  let decoder = new TextDecoder();
  let resultText = '';
  let done = false;
  let success = false;
  while (!done) {
    const {value, done: doneReading} = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = decoder.decode(value);
      resultText += chunk;
      // 解析每行流式进度
      const lines = resultText.split('\n');
      trainProgress.textContent = lines.filter(l => l.trim()).slice(-3).join('\n');
      if (chunk.includes('模型已保存成功')) {
        success = true;
        alert('模型保存成功！');
        console.log('模型保存成功！');
      }
      if (chunk.includes('模型保存失败')) {
        alert('模型保存失败！');
        console.error('模型保存失败！');
      }
    }
  }
  trainResult.textContent = success ? '训练完成！' : '训练失败！';
  mediapipeSamples = [];
  mediapipeLabels = [];
});

// 2. 模型继续训练系统
const continueForm = document.getElementById('continueForm');
const continueProgress = document.getElementById('continueProgress');
const continueResult = document.getElementById('continueResult');
continueForm && continueForm.addEventListener('submit', async e => {
  e.preventDefault();
  continueProgress.textContent = '正在提交继续训练...';
  continueResult.textContent = '';
  const fd = new FormData(continueForm);
  const params = Object.fromEntries(fd.entries());
  params.additional_epochs = parseInt(params.additional_epochs) || 5;
  if (params.new_lr) params.new_lr = parseFloat(params.new_lr);
  // 发送继续训练请求（流式）
  const resp = await fetch(API_BASE + '/continue', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params)
  });
  if (!resp.body) {
    continueProgress.textContent = '后端未返回流式数据';
    return;
  }
  const reader = resp.body.getReader();
  let decoder = new TextDecoder();
  let resultText = '';
  let done = false;
  while (!done) {
    const {value, done: doneReading} = await reader.read();
    done = doneReading;
    if (value) {
      const chunk = decoder.decode(value);
      resultText += chunk;
      const lines = resultText.split('\n');
      continueProgress.textContent = lines.filter(l => l.trim()).slice(-3).join('\n');
    }
  }
  continueResult.textContent = '继续训练完成！';
});

// 3. 模型管理系统
const listModelsBtn = document.getElementById('listModelsBtn');
const refreshModelsBtn = document.getElementById('refreshModelsBtn');
const modelsList = document.getElementById('modelsList');
const modelDetail = document.getElementById('modelDetail');
listModelsBtn && listModelsBtn.addEventListener('click', async () => {
  modelsList.textContent = '正在获取模型列表...';
  const resp = await fetch(API_BASE + '/list');
  const data = await resp.json();
  modelsList.innerHTML = data.models.map(m => `<button class='underline text-accent' onclick='showModelDetail("${m}")'>${m}</button>`).join(', ');
});
refreshModelsBtn && refreshModelsBtn.addEventListener('click', () => {
  listModelsBtn.click();
});
window.showModelDetail = async function(modelName) {
  modelDetail.textContent = '正在获取详情...';
  const resp = await fetch(API_BASE + '/detail?model_name=' + encodeURIComponent(modelName));
  const data = await resp.json();
  modelDetail.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre><button class='mt-2 py-1 px-3 bg-red-500 text-white rounded' onclick='deleteModel("${modelName}")'>删除模型</button>`;
};
window.deleteModel = async function(modelName) {
  if (!confirm('确定要删除模型 ' + modelName + ' 吗？')) return;
  const resp = await fetch(API_BASE + '/delete?model_name=' + encodeURIComponent(modelName), {method: 'POST'});
  const data = await resp.json();
  alert(data.msg || '删除完成');
  listModelsBtn.click();
};

// 4. 实时监控系统（训练流式进度已集成到训练区）
// 可扩展为 WebSocket 或 SSE 实时推送

// MediaPipe数据采集与训练联动
let mediapipeSamples = [];
let mediapipeLabels = [];

// 示例：采集按钮与数据结构
const collectBtn = document.createElement('button');
collectBtn.textContent = '采集上肢数据';
collectBtn.className = 'py-2 px-4 bg-green-500 text-white rounded-lg mb-4';
document.body.prepend(collectBtn);

collectBtn.onclick = () => {
  // 假设已集成MediaPipe，采集6个关键点（x,y,z）
  // 这里用随机数据模拟，实际应从MediaPipe回调获取
  const sample = [];
  for (let i = 0; i < 6; i++) {
    sample.push(Math.random()); // x
    sample.push(Math.random()); // y
    sample.push(Math.random()); // z
  }
  mediapipeSamples.push(sample);
  mediapipeLabels.push(1); // 示例标签，实际应由动作类型决定
  alert('已采集1帧数据，当前总数：' + mediapipeSamples.length);
};

// 页面加载自动列出模型
if (listModelsBtn) listModelsBtn.click();
