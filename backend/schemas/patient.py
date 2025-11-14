from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from schemas.user import User

class PatientBase(BaseModel):
    patient_id: str
    register_date: date
    status: str
    recovery_progress: int
    current_stage: Optional[str]
    department: Optional[str]

class PatientCreate(PatientBase):
    user_id: int
    doctor_id: int

class Patient(PatientBase):
    id: int
    user: User
    doctor: User
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TrainingRecordBase(BaseModel):
    training_date: date
    training_duration: float
    training_content: str
    steps_count: Optional[int]
    average_speed: Optional[float]
    max_speed: Optional[float]
    min_speed: Optional[float]

class TrainingRecord(TrainingRecordBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DoctorBase(BaseModel):
    department: Optional[str]
    position: Optional[str]
    specialization: Optional[str]

class Doctor(DoctorBase):
    id: int
    user: User
    
    class Config:
        from_attributes = True

# 移除 DashboardData 从这里，它应该在 analysis.py 中