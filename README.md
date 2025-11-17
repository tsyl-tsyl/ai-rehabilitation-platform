# AI Rehabilitation Training Platform

An open-source, integrated platform combining robotics, video technology, speech recognition, and artificial intelligence, designed for multi-scenario rehabilitation training. It supports various rehabilitation programs including upper/lower limb training and aphasia therapy, featuring a frontend-backend separation architecture with multi-language support and seamless hardware integration.

- [AI Rehabilitation Training Platform](#ai-rehabilitation-training-platform)
  - [✨ Key Features](#-key-features)
  - [✨ Project Screenshots](#-project-screenshots)
  - [📋 Technical Architecture](#-technical-architecture)
  - [🚀 Quick Start](#-quick-start)
    - [Prerequisites](#prerequisites)
    - [Installation Steps](#installation-steps)
  - [📂 Directory Structure](#-directory-structure)
  - [🔌 Core API Interfaces](#-core-api-interfaces)
    - [AI Analysis](#ai-analysis)
    - [Patient Management](#patient-management)
  - [🤖 Hardware Integration](#-hardware-integration)
  - [📱 Demo & Support](#-demo--support)
  - [📱 Future Development Plan](#-future-development-plan)
  - [👥 Contribution Guidelines](#-contribution-guidelines)
  - [⚠️ Frequently Asked Questions](#️-frequently-asked-questions)
  - [🔒 Security & Privacy](#-security--privacy)
  - [📄 License](#-license)
  - [🧑💻 Authors & Affiliations](#-authors--affiliations)

## ✨ Key Features

- Intelligent training plan generation with adaptive difficulty personalization
- Real-time human pose recognition and corrective feedback (powered by MediaPipe + video technology)
- AI-driven aphasia rehabilitation speech analysis (pronunciation assessment + improvement suggestions)
- Seamless robotics and hardware integration (Bluetooth/serial communication)
- Comprehensive training statistics and achievement unlocking system
- Bilingual support (Chinese/English) and cross-platform experience (web + mobile)

## ✨ Project Screenshots / Demo GIFs

- Platform frontend screenshots:
![images](/docs/images//1.png)

- Robot operation video/GIF:
![images](/docs/images/2-1.gif)

## 📋 Technical Architecture

| Module | Technologies & Tools |
|--------|---------------------|
| **Backend** | Python 3.10+, FastAPI, SQLServer, TensorFlow, Vosk, pydub, librosa |
| **Frontend** | HTML5, JavaScript (Native/ES6), Tailwind CSS, Font Awesome, Chart.js, MediaPipe |
| **Hardware** | ESP32, Arduino/C++, Stepper Motors, Bluetooth Modules |
| **Deployment** | Nginx, Docker Compose |

**System Architecture Diagram**
![images](/docs/images/jiagou.png)

## 🚀 Quick Start

### Prerequisites

- Python 3.10+ installed
- Git installed
- VSCode with Live Server extension (recommended)
- ESP32 development environment (for hardware integration)

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/ai-rehabilitation-training-platform.git
   cd ai-rehabilitation-training-platform
   ```

2. **Install Backend Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Dependencies List**
   ```
   absl-py==2.3.1
   annotated-types==0.7.0
   anyio==4.11.0
   astunparse==1.6.3
   certifi==2025.10.5
   charset-normalizer==3.4.3
   click==8.3.0
   colorama==0.4.6
   fastapi==0.119.0
   flatbuffers==25.9.23
   gast==0.6.0
   google-pasta==0.2.0
   grpcio==1.75.1
   h11==0.16.0
   h5py==3.15.0
   idna==3.11
   keras==3.11.3
   libclang==18.1.1
   Markdown==3.9
   markdown-it-py==4.0.0
   MarkupSafe==3.0.3
   mdurl==0.1.2
   ml_dtypes==0.5.3
   namex==0.1.0
   numpy==2.3.3
   opt_einsum==3.4.0
   optree==0.17.0
   packaging==25.0
   pillow==11.3.0
   protobuf==6.32.1
   pydantic==2.12.0
   pydantic_core==2.41.1
   Pygments==2.19.2
   python-multipart==0.0.20
   requests==2.32.5
   rich==14.2.0
   six==1.17.0
   sniffio==1.3.1
   starlette==0.48.0
   tensorboard==2.20.0
   tensorboard-data-server==0.7.2
   tensorflow==2.20.0
   termcolor==3.1.0
   typing-inspection==0.4.2
   typing_extensions==4.15.0
   urllib3==2.5.0
   uvicorn==0.37.0
   Werkzeug==3.1.3
   wrapt==1.17.3
   sqlalchemy==2.0.23
   pyodbc==5.0.1
   python-dotenv==1.0.0
   python-jose[cryptography]==3.3.0
   PyJWT==2.8.0
   passlib==1.7.4
   jinja2==3.1.2
   bcrypt==3.2.2
   python-dateutil==2.8.2
   Flask==2.3.3
   librosa>=0.10.0
   vosk>=0.3.45
   pydub>=0.25.1
   ```

4. **Nginx Reverse Proxy Configuration**
   
   Refer to: `/nginx/config/mywebsite`

5. **Start Backend Service**
   ```bash
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Backend API will be available at `http://localhost:8000`

6. **Launch Frontend**
   - Open VSCode and navigate to `frontend/` directory
   - Right-click `index.html` and select "Open with Live Server"
   - Access frontend at `http://localhost:5500`

7. **Flash ESP32 Firmware**
   Refer to detailed guide: `firmware/esp32/README.md`

## 📂 Directory Structure

```
backend/                 # Backend core (API, models, services)
  main.py               # FastAPI entry point
  routers/              # Module routes (aphasia, limb training, users)
  api/                  # CRUD interfaces for business data
  aphasia/              # Speech analysis module
  models/               # Data models (Pydantic)
  services/             # Business logic & AI analysis
  ml_models/            # Pre-trained AI models
  data/                 # Training/test datasets

frontend/               # Frontend pages and resources
  index.html            # Homepage
  aphasia/              # Aphasia training pages
  lower_limb/           # Lower limb training pages
  upper_limb/           # Upper limb training pages
  static/               # Scripts, styles, and images

firmware/               # ESP32/robot firmware
nginx/                  # Deployment configuration & SSL
requirements.txt        # Python dependencies
```

## 🔌 Core API Interfaces

### AI Analysis

- `POST /speech/analyze-pronunciation` - Speech evaluation (audio + reference text → score + suggestions)
- `POST /pose_data_stats` - Generate training files from video-captured pose data
- `POST /generate_training_plan` - Create personalized training plans

### Patient Management

- `POST /api/login` - Doctor/patient login
- `POST /api/patients` - Query patient list
- `POST /api/rehabilitation-progress/{patientId}` - Manage rehabilitation progress

Complete API documentation: `docs/api/README`

## 🤖 Hardware Integration

- Supported devices: ESP32, stepper motors, motion sensors, voice modules
- Communication protocols: Bluetooth 4.2+, Serial (RS232)
- Firmware development: Arduino IDE + ESP32 board support
- Guide: `firmware/documentation/communication_protocol.md`

## 📱 Demo & Support

- **Online Demo**: [AI Rehabilitation Training Platform Demo](https://bnstw.com/ai/frontend/index.html)
- **Help Center**: Refer to demo site documentation or contact maintainers
- **Issue Tracking**: Use GitHub Issues for bug reports and feature requests

## 📱 Future Development Plan

Centered around "intelligentization, scenario-based applications, and remote capabilities," we will iteratively upgrade through phased development, gradually improving the rehabilitation service ecosystem:

- **v1.1: Mobile Application & Offline Mode**
  - Develop iOS/Android dual-platform apps for cross-platform coverage
  - Integrate mobile devices and balance instruments to upgrade upper limb system into full-body rehabilitation solution
  - Add offline mode supporting weak/no network environments, enhancing user privacy protection

- **v1.2: Hardware Integration & Open Source Ecosystem Expansion**
  - Establish secure communication mechanisms supporting WiFi, BLE, and serial protocols
  - Implement multi-sensor fusion (infrared IR, IMU posture, optional pressure/EMG sensors)
  - Develop joint angle estimation functionality and motion heatmap generation module
  - Collaborate with public health institutions and NGOs to launch low-cost remote rehabilitation equipment solutions

- **v2.0: Medical-grade Rehabilitation AI & Hospital Systems**
  - Build standardized rehabilitation models based on Clinical Guidelines
  - Integrate IRB ethical review processes and patient informed consent modules
  - Develop physician backend system supporting remote monitoring, online consultations, and rehabilitation data analysis
  - Interface with EMR/HIS hospital electronic medical record systems for comprehensive medical workflow integration

- **v3.0: AI Rehabilitation & Health World Model**
  - Integrate professional rehabilitation medical knowledge base to enhance model decision-making capabilities
  - Support multimodal understanding (video, keypoints, voice, sensor data)
  - Implement multimodal health prediction and risk warning functions
  - Build long-term functional recovery trend modeling system
  - Compatible with mainstream wearable device data (smartwatches, specialized sensors)
  - Establish complete "prevention-rehabilitation-management" health closed-loop, forming an ecological service system

## 👥 Contribution Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow coding conventions: English identifiers, snake_case naming
4. Commit changes: `git commit -m "Add your feature"`
5. Push to branch: `git push origin feature/your-feature`
6. Submit pull request

## ⚠️ Frequently Asked Questions

- ❌ Do not upload large files (models, datasets, logs) to GitHub
- 🔒 Handle SSL certificates and sensitive data properly
- 📝 Recommended .gitignore entries: `.venv/, __pycache__/, logs/, saved_models/`
- ❌ MediaPipe not supported by some device browsers
- ❌ Speech recognition accuracy decreases in noisy environments
- ❌ ESP32 Bluetooth latency issues
- ❌ Model inference time is relatively long

## 🔒 Security & Privacy

- Patient data doesn't need to be uploaded to public servers; relevant AI models are deployed locally
- The system supports local deployment

## 📄 License

This project is licensed under the MIT License - see the [LICENSE] file for details.

## 🧑💻 Authors & Affiliations

- Author: tomy

This project is licensed under the MIT License - see the [LICENSE] file for details.
