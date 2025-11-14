AI康复训练平台
🏥 项目简介
基于人工智能技术的智能康复训练平台，集成语音识别、姿态分析、机器人控制等功能，为患者提供个性化的上肢、下肢、言语康复训练方案。采用前后端分离架构，支持多语言和硬件设备联动。

🚀 核心特性
智能康复训练
多模态康复：上肢、下肢、失语症全方位康复方案

AI个性化推荐：基于患者状况的智能训练计划生成

实时姿态反馈：MediaPipe姿态识别与纠正指导

语音交互训练：语音合成与智能发音评估

专业医疗支持
患者管理：完整的电子病历和康复档案

进度追踪：可视化康复进度与效果评估

医生工作台：专业医疗人员管理界面

数据统计：训练数据分析和报告生成

技术先进性
多端支持：Web端 + 移动端 + 硬件设备

离线能力：本地AI模型，保护隐私数据

硬件集成：ESP32机器人控制，步进电机驱动

多语言：中英文界面，国际化支持

🛠 技术架构
后端技术栈
框架：FastAPI (Python 3.10+)

数据库：SQLServer

AI引擎：TensorFlow, Vosk, MediaPipe

音频处理：pydub, librosa

部署：Docker, nginx

前端技术栈
核心：原生JavaScript (ES6+)

样式：Tailwind CSS

图表：Chart.js

图标：Font Awesome

部署：VSCode Live Server / nginx

硬件系统
主控：ESP32

开发：Arduino/C++

驱动：步进电机、蓝牙模块

通信：串口、蓝牙

📁 项目结构
text
AI-Rehab-Platform/
├── backend/                 # 后端服务
│   ├── main.py             # FastAPI主入口
│   ├── main_api.py         # 业务数据接口
│   ├── routers/            # 业务路由模块
│   │   ├── aphasia/        # 失语症康复
│   │   ├── upper_limb/     # 上肢康复  
│   │   ├── lower_limb/     # 下肢康复
│   │   └── users/          # 用户管理
│   ├── api/                # 数据操作接口
│   ├── models/             # 数据模型定义
│   ├── services/           # 业务逻辑服务
│   ├── ml_models/          # AI模型文件
│   └── utils.py            # 工具函数
├── frontend/               # 前端界面
│   ├── index.html          # 平台首页
│   ├── aphasia/            # 言语康复
│   │   └── index.html      # 失语症训练
│   ├── upper_limb/         # 上肢康复
│   │   └── index.html      # 上肢训练
│   ├── lower_limb/         # 下肢康复
│   │   ├── index.html      # 下肢训练
│   │   ├── login.html      # 医生登录
│   │   ├── doctor.html     # 医生工作台
│   │   ├── add-patient.html # 添加患者
│   │   ├── patient-details.html # 患者详情
│   │   └── overview.html   # 患者总览
│   └── static/             # 静态资源
│       ├── js/             # 交互脚本
│       ├── css/            # 样式文件
│       └── images/         # 训练图片
├── firmware/               # 硬件固件
│   └── esp32/              # ESP32源码
├── mobile_app/             # 移动端(预留)
├── nginx/                  # 部署配置
├── docs/                   # 项目文档
└── requirements.txt        # Python依赖
⚡ 快速开始
环境准备
bash
# 1. 安装Python依赖
pip install -r requirements.txt

# 2. 启动后端服务
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. 启动前端服务
# 方式一：使用VSCode Live Server
# 方式二：配置nginx服务
访问应用
患者训练端：http://localhost:8000 (前端服务)

医生管理端：http://localhost:8000/lower_limb/login.html

API文档：http://localhost:8000/docs (自动生成)

🔌 核心API接口
康复训练接口
功能	方法	端点	说明
语音分析	POST	/speech/analyze-pronunciation	发音评估与反馈
姿态训练	POST	/save_pose_data	保存训练数据
训练计划	POST	/generate_training_plan	个性化推荐
成就系统	POST	/check_achievements	成就解锁检查
医疗管理接口
功能	方法	端点	说明
用户认证	POST	/api/login	医生登录
患者管理	POST	/api/patients	患者列表
康复进度	POST	/api/rehabilitation-progress/{id}	进度管理
训练计划	POST	/api/training-plans/{id}	计划管理
关节活动度	POST	/api/joint-rom/{id}	活动度记录
AI模型接口
功能	方法	端点	说明
模型训练	POST	/pose_data_stats	生成训练文件
模型查询	POST	/train	查询训练文件
模型文件	POST	/models	查询模型文件
🎯 功能模块详解
1. 失语症康复训练
实时语音识别：Vosk离线引擎

发音准确性评估：相似度算法分析

个性化反馈：问题诊断与改进建议

多语言支持：中英文发音训练

2. 上肢康复训练
姿态识别：MediaPipe关节追踪

动作标准度评估：角度与轨迹分析

渐进式训练：难度自适应调整

机器人辅助：ESP32硬件控制

3. 下肢康复训练
步态分析：运动模式识别

平衡训练：稳定性评估

力量训练：阻力调节控制

进度监控：康复效果追踪

4. 医生工作台
患者管理：信息录入与查询

计划制定：个性化训练方案

数据统计：康复效果分析

远程监控：训练过程监督

🔧 硬件集成
ESP32机器人控制
cpp
// 示例：步进电机控制
void controlStepper(int steps, int direction) {
    // 电机驱动逻辑
    digitalWrite(DIR_PIN, direction);
    for(int i = 0; i < steps; i++) {
        digitalWrite(STEP_PIN, HIGH);
        delayMicroseconds(500);
        digitalWrite(STEP_PIN, LOW);
        delayMicroseconds(500);
    }
}
通信协议
蓝牙连接：HC-05/06模块

串口通信：JSON数据格式

传感器集成：陀螺仪、压力传感器

📊 数据管理
患者信息
基本信息：姓名、年龄、病史

康复评估：初始状态、目标设定

训练记录：每次训练数据

进度统计：效果量化分析

训练数据
姿态数据：关节角度、运动轨迹

语音数据：发音记录、识别结果

性能指标：完成度、准确性、稳定性

时间序列：长期趋势分析

🚀 部署指南
开发环境
bash
# 克隆项目
git clone <repository-url>
cd AI-Rehab-Platform

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn backend.main:app --reload
生产环境
bash
# 使用Docker部署
docker-compose up -d

# 或使用nginx反向代理
cp nginx/conf.d/rehab.conf /etc/nginx/conf.d/
systemctl reload nginx
🤝 贡献指南
我们欢迎所有形式的贡献！请参考以下流程：

开发流程
Fork 本仓库

创建功能分支 (git checkout -b feature/AmazingFeature)

提交更改 (git commit -m 'Add some AmazingFeature')

推送到分支 (git push origin feature/AmazingFeature)

开启 Pull Request

代码规范
命名规范：英文、小写、下划线分隔

注释要求：关键函数和复杂逻辑需有注释

提交信息：清晰描述修改内容

❓ 常见问题
安装问题
Q: 依赖安装失败？
A: 确保使用Python 3.10+，可尝试使用虚拟环境

Q: 前端页面无法访问？
A: 检查端口配置，确保后端服务正常运行

使用问题
Q: 语音识别不准确？
A: 检查音频格式，确保在安静环境下录音

Q: 硬件连接失败？
A: 检查串口权限和蓝牙配对状态

📞 技术支持
文档：详细API文档见 /docs 目录

问题反馈：请提交GitHub Issue

技术交流：欢迎参与项目讨论

📄 许可证
本项目采用 MIT 许可证 - 详见 LICENSE 文件


用AI技术赋能康复医疗，让每一次训练都更有价值 ✨
·