from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Doctor(Base):
    __tablename__ = "Doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    department = Column(String(100))
    position = Column(String(100))
    specialization = Column(String(255))
    
    # 关系
    user = relationship("User")
    patients = relationship("Patient", back_populates="doctor")

class Patient(Base):
    __tablename__ = "Patients"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    patient_id = Column(String(20), unique=True, index=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("Doctors.id"), nullable=False)
    register_date = Column(Date, nullable=False)
    status = Column(String(20), default='进行中')
    recovery_progress = Column(Integer, default=0)
    current_stage = Column(String(100))
    department = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User")
    doctor = relationship("Doctor", back_populates="patients")