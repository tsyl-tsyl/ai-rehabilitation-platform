# AI Rehabilitation Training Platform

An open-source integrated platform that combines robotics technology, video technology, speech recognition, and artificial intelligence, designed for multi-scenario rehabilitation training. It supports various rehabilitation programs including upper limb, lower limb, and aphasia training, adopting a front-end and back-end separation architecture to provide multi-language support and seamless hardware integration capabilities.

## ✨ Key Features

- Intelligent training plan generation with personalized difficulty adaptation

- Real-time human pose recognition & corrective feedback (powered by MediaPipe + video technology)

- AI-driven speech analysis for aphasia rehabilitation (pronunciation evaluation + improvement suggestions)

- Seamless robotics & hardware integration (Bluetooth/Serial Port communication)

- Comprehensive training statistics & achievement unlocking system

- Bilingual support (Chinese/English) & cross-platform experience (web + mobile)

## 📋 Technical Architecture

|Layer|Technologies & Tools|
|---|---|
|**Backend**|Python 3.10+, FastAPI, SQLServer, TensorFlow, Vosk, pydub, librosa|
|**Frontend**|HTML5, JavaScript (Native/ES6), Tailwind CSS, Font Awesome, Chart.js, MediaPipe|
|**Hardware**|ESP32, Arduino/C++, Stepper Motors, Bluetooth Modules|
|**Mobile**|Android/iOS (Flutter/Native, Reserved Interfaces)|
|**Deployment**|Nginx, Docker Compose|
## 🚀 Quick Start

### Prerequisites

- Python 3.10+ installed

- Git installed

- VSCode (recommended) with Live Server extension

- ESP32 development environment (for hardware integration)

### Installation Steps

1. **Clone the Repository**`git clone https://github.com/your-username/ai-rehabilitation-training-platform.git
cd ai-rehabilitation-training-platform`

2. **Install Backend Dependencies**`pip install -r requirements.txt`

3. **Start Backend Service**`uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`Backend API will be available at `http://localhost:8000`

4. **Launch Frontend**Open VSCode and navigate to the `frontend/` directory

5. Right-click `index.html` and select "Open with Live Server"

6. Access frontend at `http://localhost:5500`

7. **Flash ESP32 Firmware**Refer to detailed guide: `firmware/esp32/README.md`

## 📂 Directory Structure

```bash

backend/        # Backend core (API, models, services)
  main.py     # FastAPI entry point
  routers/    # Module routes (aphasia, limb training, user)
  api/        # CRUD interfaces for business data
  aphasia/    # Speech analysis module
  models/     # Data models (Pydantic)
  services/   # Business logic & AI analysis
  ml_models/  # Pre-trained AI models
  data/       # Training/test datasets

frontend/       # Frontend pages & resources
  index.html  # Homepage
  aphasia/    # Aphasia training pages
  lower_limb/ # Lower limb training pages
  upper_limb/ # Upper limb training pages
  static/     # Scripts, styles & images

firmware/       # ESP32/robot firmware
models/         # AI model archives
mobile_app/     # Mobile app source (reserved)
nginx/          # Deployment configs & SSL
saved_models/   # Trained model files
logs/           # Application logs
requirements.txt# Python dependencies
```

## 🔌 Core API Interfaces

### AI Analysis

- `POST /speech/analyze-pronunciation` - Speech evaluation (audio + reference text → score + suggestions)

- `POST /pose_data_stats` - Generate training files from video-captured pose data

- `POST /generate_training_plan` - Create personalized training plan

### Patient Management

- `POST /api/login` - Doctor/patient login

- `POST /api/patients` - Query patient list

- `POST /api/rehabilitation-progress/{patientId}` - Manage rehabilitation progress

Full API docs: `docs/api/README.md`

## 🤖 Hardware Integration

- Supported devices: ESP32, stepper motors, motion sensors, voice modules

- Communication protocols: Bluetooth 4.2+, Serial Port (RS232)

- Firmware development: Arduino IDE + ESP32 board support

- Guide: `firmware/documentation/communication_protocol.md`

## 📱 Demo & Support

- **Online Demo**: [AI Rehabilitation Training Platform Demo](https://bnstw.com/ai/)

- **Help Center**: Refer to demo site documentation or contact maintainers

- **Issue Tracking**: Use GitHub Issues for bug reports & feature requests

## 👥 Contribution Guidelines

1. Fork the repository

2. Create a feature branch: `git checkout -b feature/your-feature`

3. Follow coding conventions: English identifiers, snake_case naming

4. Commit changes: `git commit -m "Add your feature"`

5. Push to branch: `git push origin feature/your-feature`

6. Submit a Pull Request

## ⚠️ FAQ

- ❌ Do NOT upload large files (models, datasets, logs) to GitHub

- 🔒 Handle SSL certificates & sensitive data properly

- 📝 Recommended .gitignore entries: `.venv/, __pycache__/, logs/, saved_models/`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://www.doubao.cn) file for details (please add the LICENSE file to your repository).

## 🧑‍💻 Author & Affiliation

- Author: LING YIN

- Affiliation: High School Affiliated to Renmin University of China

