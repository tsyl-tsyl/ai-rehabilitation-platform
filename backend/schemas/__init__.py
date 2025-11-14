# schemas/__init__.py
from .user import User, UserCreate, Token, TokenData
from .patient import Patient, PatientCreate, TrainingRecord, Doctor
from .analysis import AIAnalysisReport, DashboardData

__all__ = [
    "User", "UserCreate", "Token", "TokenData",
    "Patient", "PatientCreate", "TrainingRecord", "Doctor", 
    "AIAnalysisReport", "DashboardData"
]