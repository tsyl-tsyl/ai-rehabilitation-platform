from sqlalchemy import Column, Integer, Date, DECIMAL, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class AIAnalysisReport(Base):
    __tablename__ = "AIAnalysisReports"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("Patients.id"), nullable=False)
    analysis_date = Column(Date, nullable=False)
    action_completion_score = Column(DECIMAL(5, 2))
    left_knee_deviation = Column(DECIMAL(5, 2))
    right_knee_deviation = Column(DECIMAL(5, 2))
    left_hip_deviation = Column(DECIMAL(5, 2))
    right_hip_deviation = Column(DECIMAL(5, 2))
    trajectory_deviation_data = Column(Text)
    improvement_data = Column(Text)
    training_recommendations = Column(Text)
    precautions = Column(Text)
    summary = Column(Text)
    created_at = Column(DateTime, server_default=func.now())