from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from schemas.patient import Patient

class AIAnalysisReportBase(BaseModel):
    analysis_date: date
    action_completion_score: float
    left_knee_deviation: float
    right_knee_deviation: float
    left_hip_deviation: float
    right_hip_deviation: float
    training_recommendations: Optional[str]
    precautions: Optional[str]
    summary: Optional[str]

class AIAnalysisReport(AIAnalysisReportBase):
    id: int
    patient: Patient
    created_at: datetime
    
    class Config:
        from_attributes = True

# 添加 DashboardData 到这里
class DashboardData(BaseModel):
    doctor: Dict[str, Any]
    statistics: Dict[str, int]
    patient_progress_data: List[Dict[str, Any]]
    deviation_data: List[Dict[str, Any]]
    robot_status: Dict[str, int]
    reminders: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True