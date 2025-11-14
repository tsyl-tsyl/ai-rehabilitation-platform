from fastapi import APIRouter, HTTPException, Depends
from typing import List
import json
from .dependencies import get_db_connection, get_current_user
from .models import (
    RehabilitationStageCreate, 
    RehabilitationStageUpdate, 
    RehabilitationStageResponse
)
import logging

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rehabilitation-stages", tags=["康复阶段管理"])

@router.get("/{patient_id}", response_model=List[RehabilitationStageResponse])
async def get_rehabilitation_stages(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取患者的康复阶段列表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT StageID, PatientID, StageName, StageNumber, StartDate, EndDate,
                   TargetGoals, CurrentProgress, Status, CreatedAt, WeeksCompleted,
                   WeeksRemaining, WeeklyFocus, TrainingIntensity, NextEvaluationDate
            FROM RehabilitationStages 
            WHERE PatientID = ? AND Status != 'deleted'
            ORDER BY StageNumber, StartDate
        """, patient_id)
        
        stages = []
        for row in cursor.fetchall():
            stages.append({
                "id": row.StageID,
                "patient_id": row.PatientID,
                "stage_name": row.StageName,
                "stage_number": row.StageNumber,
                "start_date": row.StartDate,
                "end_date": row.EndDate,
                "target_goals": row.TargetGoals,
                "current_progress": row.CurrentProgress,
                "status": row.Status,
                "weeks_completed": row.WeeksCompleted,
                "weeks_remaining": row.WeeksRemaining,
                "weekly_focus": row.WeeklyFocus,
                "training_intensity": row.TrainingIntensity,
                "next_evaluation_date": row.NextEvaluationDate,
                "created_at": row.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if row.CreatedAt else None
            })
        
        return stages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取康复阶段失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/", response_model=RehabilitationStageResponse)
async def create_rehabilitation_stage(
    stage: RehabilitationStageCreate, 
    current_user: dict = Depends(get_current_user)
):
    """创建新的康复阶段"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        logger.info(f"收到创建康复阶段请求: {stage.dict()}")
        logger.info(f"当前用户: {current_user}")
        
        # 检查患者是否存在
        cursor.execute("SELECT PatientID, Name FROM Patients WHERE PatientID = ? AND Status != 'deleted'", stage.patient_id)
        patient = cursor.fetchone()
        if not patient:
            logger.warning(f"患者不存在: {stage.patient_id}")
            raise HTTPException(status_code=404, detail="患者不存在")
        logger.info(f"找到患者: {patient.Name}")
        
        # 插入康复阶段并直接获取ID
        logger.info("开始插入康复阶段到数据库...")
        
        cursor.execute("""
            INSERT INTO RehabilitationStages (
                PatientID, StageName, StageNumber, StartDate, EndDate, 
                TargetGoals, CurrentProgress, Status, WeeksCompleted,
                WeeksRemaining, WeeklyFocus, TrainingIntensity, NextEvaluationDate,
                CreatedBy
            ) 
            OUTPUT INSERTED.StageID, INSERTED.PatientID, INSERTED.StageName, INSERTED.StageNumber,
                   INSERTED.StartDate, INSERTED.EndDate, INSERTED.TargetGoals, INSERTED.CurrentProgress,
                   INSERTED.Status, INSERTED.WeeksCompleted, INSERTED.WeeksRemaining,
                   INSERTED.WeeklyFocus, INSERTED.TrainingIntensity, INSERTED.NextEvaluationDate,
                   INSERTED.CreatedAt
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, 
            stage.patient_id, stage.stage_name, stage.stage_number, stage.start_date,
            stage.end_date, stage.target_goals, stage.current_progress, stage.status,
            stage.weeks_completed, stage.weeks_remaining, stage.weekly_focus,
            stage.training_intensity, stage.next_evaluation_date, current_user["user_id"]
        )
        
        new_stage = cursor.fetchone()
        conn.commit()
        
        if not new_stage:
            logger.error("插入成功但无法获取新记录")
            # 尝试通过其他方式获取最新记录
            cursor.execute("""
                SELECT TOP 1 StageID, PatientID, StageName, StageNumber, StartDate, EndDate,
                       TargetGoals, CurrentProgress, Status, CreatedAt, WeeksCompleted,
                       WeeksRemaining, WeeklyFocus, TrainingIntensity, NextEvaluationDate
                FROM RehabilitationStages 
                WHERE PatientID = ? 
                ORDER BY StageID DESC
            """, stage.patient_id)
            new_stage = cursor.fetchone()
            
            if not new_stage:
                raise HTTPException(status_code=500, detail="创建康复阶段失败")
        
        logger.info(f"成功创建康复阶段，ID: {new_stage.StageID}")
        
        status_display = {
            'active': '进行中',
            'pending': '待开始',
            'completed': '已完成'
        }
        intensity_display = {
            'low': '低强度',
            'medium': '中等强度',
            'high': '高强度'
        }
        
        response_data = {
            "id": new_stage.StageID,
            "patient_id": new_stage.PatientID,
            "patient_name": patient.Name,
            "stage_name": new_stage.StageName,
            "stage_number": new_stage.StageNumber,
            "start_date": new_stage.StartDate,
            "end_date": new_stage.EndDate,
            "target_goals": new_stage.TargetGoals,
            "current_progress": new_stage.CurrentProgress,
            "status": new_stage.Status,
            "status_display": status_display.get(new_stage.Status, new_stage.Status),
            "weeks_completed": new_stage.WeeksCompleted,
            "weeks_remaining": new_stage.WeeksRemaining,
            "weekly_focus": new_stage.WeeklyFocus,
            "training_intensity": new_stage.TrainingIntensity,
            "training_intensity_display": intensity_display.get(new_stage.TrainingIntensity, new_stage.TrainingIntensity),
            "next_evaluation_date": new_stage.NextEvaluationDate,
            "created_at": new_stage.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if new_stage.CreatedAt else None
        }
        
        logger.info(f"返回响应数据: {response_data}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建康复阶段时发生未知错误: {str(e)}", exc_info=True)
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"创建康复阶段失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.put("/{stage_id}", response_model=RehabilitationStageResponse)
async def update_rehabilitation_stage(
    stage_id: int,
    stage: RehabilitationStageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """更新康复阶段信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查阶段是否存在
        cursor.execute("SELECT StageID FROM RehabilitationStages WHERE StageID = ?", stage_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="康复阶段不存在")
        
        # 构建动态更新语句
        update_fields = []
        params = []
        
        if stage.stage_name is not None:
            update_fields.append("StageName = ?")
            params.append(stage.stage_name)
        if stage.stage_number is not None:
            update_fields.append("StageNumber = ?")
            params.append(stage.stage_number)
        if stage.start_date is not None:
            update_fields.append("StartDate = ?")
            params.append(stage.start_date)
        if stage.end_date is not None:
            update_fields.append("EndDate = ?")
            params.append(stage.end_date)
        if stage.target_goals is not None:
            update_fields.append("TargetGoals = ?")
            params.append(stage.target_goals)
        if stage.current_progress is not None:
            update_fields.append("CurrentProgress = ?")
            params.append(stage.current_progress)
        if stage.status is not None:
            update_fields.append("Status = ?")
            params.append(stage.status)
        if stage.weeks_completed is not None:
            update_fields.append("WeeksCompleted = ?")
            params.append(stage.weeks_completed)
        if stage.weeks_remaining is not None:
            update_fields.append("WeeksRemaining = ?")
            params.append(stage.weeks_remaining)
        if stage.weekly_focus is not None:
            update_fields.append("WeeklyFocus = ?")
            params.append(stage.weekly_focus)
        if stage.training_intensity is not None:
            update_fields.append("TrainingIntensity = ?")
            params.append(stage.training_intensity)
        if stage.next_evaluation_date is not None:
            update_fields.append("NextEvaluationDate = ?")
            params.append(stage.next_evaluation_date)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="没有提供更新字段")
        
        update_fields.append("UpdatedAt = GETDATE()")
        params.append(stage_id)
        
        query = f"UPDATE RehabilitationStages SET {', '.join(update_fields)} WHERE StageID = ?"
        cursor.execute(query, params)
        
        conn.commit()
        
        # 获取更新后的阶段信息
        cursor.execute("""
            SELECT StageID, PatientID, StageName, StageNumber, StartDate, EndDate,
                   TargetGoals, CurrentProgress, Status, CreatedAt, WeeksCompleted,
                   WeeksRemaining, WeeklyFocus, TrainingIntensity, NextEvaluationDate
            FROM RehabilitationStages 
            WHERE StageID = ?
        """, stage_id)
        
        updated_stage = cursor.fetchone()
        
        return {
            "id": updated_stage.StageID,
            "patient_id": updated_stage.PatientID,
            "stage_name": updated_stage.StageName,
            "stage_number": updated_stage.StageNumber,
            "start_date": updated_stage.StartDate,
            "end_date": updated_stage.EndDate,
            "target_goals": updated_stage.TargetGoals,
            "current_progress": updated_stage.CurrentProgress,
            "status": updated_stage.Status,
            "weeks_completed": updated_stage.WeeksCompleted,
            "weeks_remaining": updated_stage.WeeksRemaining,
            "weekly_focus": updated_stage.WeeklyFocus,
            "training_intensity": updated_stage.TrainingIntensity,
            "next_evaluation_date": updated_stage.NextEvaluationDate,
            "created_at": updated_stage.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if updated_stage.CreatedAt else None
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"更新康复阶段失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.delete("/{stage_id}")
async def delete_rehabilitation_stage(stage_id: int, current_user: dict = Depends(get_current_user)):
    """删除康复阶段"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("UPDATE RehabilitationStages SET Status = 'deleted', UpdatedAt = GETDATE() WHERE StageID = ?", stage_id)
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="康复阶段不存在")
        
        conn.commit()
        return {"message": "康复阶段删除成功"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"删除康复阶段失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()