[# AI Rehabilitation Training Platform

## Project Introduction
This is an open-source platform integrating speech, AI, robotics, and multi-scenario rehabilitation training. It supports various rehabilitation programs such as upper limb, lower limb, and aphasia training. With a separation of front-end and back-end architecture, it provides multi-language support and hardware integration capabilities.

## Technical Architecture
- **Backend**: Python 3.10+, FastAPI, SQLServer, TensorFlow, Vosk, pydub, librosa
- **Frontend**: HTML5, JavaScript (Native/ES6), Tailwind CSS, Font Awesome, Chart.js, MediaPipe
- **Hardware**: ESP32, Arduino/C++, Stepper Motors, Bluetooth, Robot Control
- **Mobile**: Android/iOS (Flutter/Native, Reserved Interfaces)
- **Deployment**: nginx, docker-compose

## Core Function Modules
- Intelligent training plan generation and personalized recommendations
- Pose recognition and real-time feedback (MediaPipe)
- Speech synthesis and voice interaction (Web Speech API)
- AI speech analysis and pronunciation evaluation (FastAPI+Vosk/TensorFlow)
- Achievement system and training statistics
- Multi-language support (Chinese/English)
- Robot/hardware interfaces (Bluetooth/Serial Port)
- Unified experience across mobile and web platforms

## Directory Structure Explanation
```
backend/        # Backend API, models, routes, services
	 main.py     # FastAPI main entry
	 main_api.py # Business data query interface
	 routers/    # Business routes (aphasia, upper limb, lower limb, user, etc.)
	 api/        # Interfaces for adding/editing/deleting business data
	 aphasia/    # Speech analysis interfaces
	 models/     # Pydantic model definitions
	 services/   # Business logic and AI analysis
	 ml_models/  # Trained AI models
	 data/       # Training/test data
	 utils.py    # Utility functions
	 config.py   # Configuration file
frontend/       # Frontend pages, JS, styles, images
	 index.html  # Main page
	 aphasia/    # Aphasia training pages
	 lower_limb/ # Lower limb training pages
	 upper_limb/ # Upper limb training pages
	 static/     # Interactive scripts, style files, training images
	 libs/       # Third-party libraries
firmware/       # ESP32/robot firmware source code
models/         # AI models and historical data
mobile_app/     # Mobile app source code (reserved)
nginx/          # Deployment and SSL certificates
saved_models/   # Trained model files
static/         # Static resources
logs/           # Logs
requirements.txt# Python dependencies
README.md       # Project description
```

## Quick Start
1. Install Python dependencies:
	```bash
	pip install -r requirements.txt
	```
2. Start the backend API service:
	```bash
	uvicorn backend.main:app --reload
	```
3. Launch frontend pages:
	- Recommended: Use VSCode Live Server or local nginx deployment
	- Access frontend/index.html or frontend/aphasia/index.html
4. ESP32 firmware flashing:
	- Refer to firmware/esp32/README.md
5. Mobile app development:
	- Refer to the mobile_app/ directory (for Flutter/native development if needed)

## Typical API Interface Description
- Speech Analysis: `POST /speech/analyze-pronunciation` - Upload audio and reference text, return pronunciation score, recognized text, suggestions, etc.
- Model Training: `POST /pose_data_stats` - Interface for generating model training files
- Query Training Files: `POST /train` - Interface for querying model training files
- Query Model Files: `POST /models` - Interface for querying model files
- Save Training Data: `POST /save_pose_data` - Interface for saving training data

- Account Login: `POST /api/login` - Account login interface
- Verify Login Status: `POST /api/users/me` - Interface to verify account login status
- Query Patients: `POST /api/patients` - Interface to query patient list data
- Query Today's Reminders: `POST /api/reminders/today` - Interface to query today's reminders
- Rehabilitation Progress: `POST /api/rehabilitation-progress/${patientId}` - Interface for querying/editing/deleting/adding rehabilitation progress data
- Joint Range of Motion: `POST /api/joint-rom/${patientId}` - Interface for querying/editing/deleting/adding joint range of motion data
- Training Plans: `POST /api/training-plans/${patientId}` - Interface for querying/editing/deleting/adding training plan data
- Stage Progress: `POST /api/rehabilitation-stages/${patientId}` - Interface for querying/editing/deleting/adding rehabilitation stage data
- Patient Data: `POST /api/patients/${patientId}` - Interface to query detailed patient information

- Training Plan Generation: `POST /generate_training_plan` - Personalized recommendation of movements and difficulty levels
- Achievement Unlocking: `POST /check_achievements` - Return unlocked achievements
- For detailed interfaces, see docs/api/README.md or each module in backend/routers/

## Main Frontend Pages
- `frontend/index.html`: Platform homepage
- `frontend/aphasia/index.html`: Aphasia rehabilitation training
- `frontend/lower_limb/index.html`: Lower limb rehabilitation training
- `frontend/upper_limb/index.html`: Upper limb rehabilitation training
- `frontend/lower_limb/login.html`: Doctor backend login interface
- `frontend/lower_limb/doctor.html`: Doctor backend workbench interface
- `frontend/lower_limb/add-patient.html`: Doctor backend interface for adding patient information
- `frontend/lower_limb/patient-details.html`: Doctor backend interface for adding patient rehabilitation training information
- `frontend/lower_limb/overview.html`: Doctor backend interface for viewing detailed information of a single patient
- Interactive scripts and styles are available in the static/js/ and static/css/ directories

## Robot/Hardware Integration
- ESP32 firmware: See firmware/esp32/
- Bluetooth/Serial communication protocol: See firmware/documentation/
- Supports stepper motors, sensors, voice broadcasting, etc.

## Contribution Guidelines
- Fork this repository and use Pull Requests for collaborative development
- Follow consistent code naming conventions: English, lowercase, underscore-separated
- For detailed instructions, see docs/ and README files of each module
- It is recommended to develop each feature/module in a separate branch

## Frequently Asked Questions
- Do not upload large models, data, logs, or virtual environments to GitHub
- Properly handle certificates and private data
- Recommended .gitignore content: .venv/, __pycache__/, logs/, saved_models/, *.sqlite3

## Contact & Support
- For detailed API documentation, hardware integration guides, and deployment instructions, refer to docs/
- Submit an Issue or contact the maintainers for any questions

LING YIN
High School Affiliated to Renmin University of China
---

> This platform aims to empower rehabilitation training with AI. Developers from medical, rehabilitation, and AI fields are welcome to contribute to the project!

](https://bnstw.com/ai/frontend/index.html)
