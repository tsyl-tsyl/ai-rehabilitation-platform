from sqlalchemy import Column, Integer, String, Date, DECIMAL, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class TrainingRecord(Base):
    __tablename__ = "TrainingRecords"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("Patients.id"), nullable=False)
    training_date = Column(Date, nullable=False)
    training_duration = Column(DECIMAL(5, 2), nullable=False)
    training_content = Column(Text, nullable=False)
    steps_count = Column(Integer)
    average_speed = Column(DECIMAL(5, 2))
    max_speed = Column(DECIMAL(5, 2))
    min_speed = Column(DECIMAL(5, 2))
    created_at = Column(DateTime, server_default=func.now())

class JointMobilityRecord(Base):
    __tablename__ = "JointMobilityRecords"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("Patients.id"), nullable=False)
    record_date = Column(Date, nullable=False)
    left_hip = Column(DECIMAL(5, 2))
    right_hip = Column(DECIMAL(5, 2))
    left_knee = Column(DECIMAL(5, 2))
    right_knee = Column(DECIMAL(5, 2))
    left_ankle = Column(DECIMAL(5, 2))
    right_ankle = Column(DECIMAL(5, 2))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

class RobotStatus(Base):
    __tablename__ = "RobotStatus"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("Patients.id"), nullable=False)
    check_time = Column(DateTime, nullable=False)
    main_controller = Column(String(20), default='运行正常')
    motor_status = Column(String(20), default='运行正常')
    sensor_status = Column(String(20), default='运行正常')
    battery_level = Column(Integer, default=100)
    self_test_result = Column(String(20), default='正常运行')
    created_at = Column(DateTime, server_default=func.now())

class RehabilitationStage(Base):
    __tablename__ = "RehabilitationStages"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("Patients.id"), nullable=False)
    stage_name = Column(String(100), nullable=False)
    stage_progress = Column(Integer, default=0)
    start_date = Column(Date, nullable=False)
    expected_end_date = Column(Date)
    actual_end_date = Column(Date)
    stage_goal = Column(Text)
    weekly_focus = Column(Text)
    training_intensity = Column(String(20))
    next_evaluation_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DailyReminder(Base):
    __tablename__ = "DailyReminders"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("Patients.id"), nullable=False)
    reminder_date = Column(Date, nullable=False)
    reminder_type = Column(String(20))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    reminder_time = Column(DateTime)
    is_completed = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())