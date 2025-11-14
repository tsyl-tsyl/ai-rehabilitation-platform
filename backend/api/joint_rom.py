from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from .dependencies import get_db_connection, get_current_user
from .models import JointROMCreate, JointROMUpdate, JointROMResponse

import logging

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/joint-rom", tags=["关节活动度管理"])

@router.get("/{patient_id}", response_model=List[JointROMResponse])
async def get_joint_rom_records(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取患者的关节活动度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT RecordID, PatientID, RecordDate, LeftHip, RightHip,
                   LeftKnee, RightKnee, LeftAnkle, RightAnkle, CreatedAt,
                   LeftHipChange, RightHipChange, LeftKneeChange, RightKneeChange,
                   LeftAnkleChange, RightAnkleChange
            FROM JointMobilityRecords 
            WHERE PatientID = ?
            ORDER BY RecordDate DESC
        """, patient_id)
        
        records = []
        for row in cursor.fetchall():
            records.append({
                "id": row.RecordID,
                "patient_id": row.PatientID,
                "record_date": row.RecordDate,
                "left_hip": row.LeftHip,
                "right_hip": row.RightHip,
                "left_knee": row.LeftKnee,
                "right_knee": row.RightKnee,
                "left_ankle": row.LeftAnkle,
                "right_ankle": row.RightAnkle,
                "left_hip_change": row.LeftHipChange,
                "right_hip_change": row.RightHipChange,
                "left_knee_change": row.LeftKneeChange,
                "right_knee_change": row.RightKneeChange,
                "left_ankle_change": row.LeftAnkleChange,
                "right_ankle_change": row.RightAnkleChange,
                "created_at": row.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if row.CreatedAt else None
            })
        
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取关节活动度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/", response_model=JointROMResponse)
async def create_joint_rom_record(
    record: JointROMCreate, 
    current_user: dict = Depends(get_current_user)
):
    """创建新的关节活动度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        logger.info(f"收到创建关节活动度记录请求: {record.dict()}")
        logger.info(f"当前用户: {current_user}")
        
        # 检查患者是否存在
        cursor.execute("SELECT PatientID, Name FROM Patients WHERE PatientID = ? AND Status != 'deleted'", record.patient_id)
        patient = cursor.fetchone()
        if not patient:
            logger.warning(f"患者不存在: {record.patient_id}")
            raise HTTPException(status_code=404, detail="患者不存在")
        logger.info(f"找到患者: {patient.Name}")
        
        # 插入关节活动度记录并直接获取ID
        logger.info("开始插入关节活动度记录到数据库...")
        
        cursor.execute("""
            INSERT INTO JointMobilityRecords (
                PatientID, RecordDate, LeftHip, RightHip, LeftKnee, RightKnee,
                LeftAnkle, RightAnkle, LeftHipChange, RightHipChange,
                LeftKneeChange, RightKneeChange, LeftAnkleChange, RightAnkleChange,
                CreatedBy
            ) 
            OUTPUT INSERTED.RecordID, INSERTED.PatientID, INSERTED.RecordDate,
                   INSERTED.LeftHip, INSERTED.RightHip, INSERTED.LeftKnee, INSERTED.RightKnee,
                   INSERTED.LeftAnkle, INSERTED.RightAnkle, INSERTED.LeftHipChange,
                   INSERTED.RightHipChange, INSERTED.LeftKneeChange, INSERTED.RightKneeChange,
                   INSERTED.LeftAnkleChange, INSERTED.RightAnkleChange, INSERTED.CreatedAt
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, 
            record.patient_id, record.record_date, record.left_hip, record.right_hip,
            record.left_knee, record.right_knee, record.left_ankle, record.right_ankle,
            record.left_hip_change, record.right_hip_change, record.left_knee_change,
            record.right_knee_change, record.left_ankle_change, record.right_ankle_change,
            current_user["user_id"]
        )
        
        new_record = cursor.fetchone()
        conn.commit()
        
        if not new_record:
            logger.error("插入成功但无法获取新记录")
            # 尝试通过其他方式获取最新记录
            cursor.execute("""
                SELECT TOP 1 RecordID, PatientID, RecordDate, LeftHip, RightHip,
                       LeftKnee, RightKnee, LeftAnkle, RightAnkle, CreatedAt,
                       LeftHipChange, RightHipChange, LeftKneeChange, RightKneeChange,
                       LeftAnkleChange, RightAnkleChange
                FROM JointMobilityRecords 
                WHERE PatientID = ? 
                ORDER BY RecordID DESC
            """, record.patient_id)
            new_record = cursor.fetchone()
            
            if not new_record:
                raise HTTPException(status_code=500, detail="创建关节活动度记录失败")
        
        logger.info(f"成功创建关节活动度记录，ID: {new_record.RecordID}")
        
        response_data = {
            "id": new_record.RecordID,
            "patient_id": new_record.PatientID,
            "patient_name": patient.Name,
            "record_date": new_record.RecordDate,
            "left_hip": new_record.LeftHip,
            "right_hip": new_record.RightHip,
            "left_knee": new_record.LeftKnee,
            "right_knee": new_record.RightKnee,
            "left_ankle": new_record.LeftAnkle,
            "right_ankle": new_record.RightAnkle,
            "left_hip_change": new_record.LeftHipChange,
            "right_hip_change": new_record.RightHipChange,
            "left_knee_change": new_record.LeftKneeChange,
            "right_knee_change": new_record.RightKneeChange,
            "left_ankle_change": new_record.LeftAnkleChange,
            "right_ankle_change": new_record.RightAnkleChange,
            "created_at": new_record.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if new_record.CreatedAt else None
        }
        
        logger.info(f"返回响应数据: {response_data}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建关节活动度记录时发生未知错误: {str(e)}", exc_info=True)
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"创建关节活动度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.put("/{record_id}", response_model=JointROMResponse)
async def update_joint_rom_record(
    record_id: int,
    record: JointROMUpdate,
    current_user: dict = Depends(get_current_user)
):
    """更新关节活动度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查记录是否存在
        cursor.execute("SELECT RecordID FROM JointMobilityRecords WHERE RecordID = ?", record_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="关节活动度记录不存在")
        
        # 构建动态更新语句
        update_fields = []
        params = []
        
        if record.record_date is not None:
            update_fields.append("RecordDate = ?")
            params.append(record.record_date)
        if record.left_hip is not None:
            update_fields.append("LeftHip = ?")
            params.append(record.left_hip)
        if record.right_hip is not None:
            update_fields.append("RightHip = ?")
            params.append(record.right_hip)
        if record.left_knee is not None:
            update_fields.append("LeftKnee = ?")
            params.append(record.left_knee)
        if record.right_knee is not None:
            update_fields.append("RightKnee = ?")
            params.append(record.right_knee)
        if record.left_ankle is not None:
            update_fields.append("LeftAnkle = ?")
            params.append(record.left_ankle)
        if record.right_ankle is not None:
            update_fields.append("RightAnkle = ?")
            params.append(record.right_ankle)
        if record.left_hip_change is not None:
            update_fields.append("LeftHipChange = ?")
            params.append(record.left_hip_change)
        if record.right_hip_change is not None:
            update_fields.append("RightHipChange = ?")
            params.append(record.right_hip_change)
        if record.left_knee_change is not None:
            update_fields.append("LeftKneeChange = ?")
            params.append(record.left_knee_change)
        if record.right_knee_change is not None:
            update_fields.append("RightKneeChange = ?")
            params.append(record.right_knee_change)
        if record.left_ankle_change is not None:
            update_fields.append("LeftAnkleChange = ?")
            params.append(record.left_ankle_change)
        if record.right_ankle_change is not None:
            update_fields.append("RightAnkleChange = ?")
            params.append(record.right_ankle_change)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="没有提供更新字段")
        
        update_fields.append("UpdatedAt = GETDATE()")
        params.append(record_id)
        
        query = f"UPDATE JointMobilityRecords SET {', '.join(update_fields)} WHERE RecordID = ?"
        cursor.execute(query, params)
        
        conn.commit()
        
        # 获取更新后的记录
        cursor.execute("""
            SELECT RecordID, PatientID, RecordDate, LeftHip, RightHip,
                   LeftKnee, RightKnee, LeftAnkle, RightAnkle, CreatedAt,
                   LeftHipChange, RightHipChange, LeftKneeChange, RightKneeChange,
                   LeftAnkleChange, RightAnkleChange
            FROM JointMobilityRecords 
            WHERE RecordID = ?
        """, record_id)
        
        updated_record = cursor.fetchone()
        
        return {
            "id": updated_record.RecordID,
            "patient_id": updated_record.PatientID,
            "record_date": updated_record.RecordDate,
            "left_hip": updated_record.LeftHip,
            "right_hip": updated_record.RightHip,
            "left_knee": updated_record.LeftKnee,
            "right_knee": updated_record.RightKnee,
            "left_ankle": updated_record.LeftAnkle,
            "right_ankle": updated_record.RightAnkle,
            "left_hip_change": updated_record.LeftHipChange,
            "right_hip_change": updated_record.RightHipChange,
            "left_knee_change": updated_record.LeftKneeChange,
            "right_knee_change": updated_record.RightKneeChange,
            "left_ankle_change": updated_record.LeftAnkleChange,
            "right_ankle_change": updated_record.RightAnkleChange,
            "created_at": updated_record.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if updated_record.CreatedAt else None
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"更新关节活动度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.delete("/{record_id}")
async def delete_joint_rom_record(record_id: int, current_user: dict = Depends(get_current_user)):
    """删除关节活动度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM JointMobilityRecords WHERE RecordID = ?", record_id)
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="关节活动度记录不存在")
        
        conn.commit()
        return {"message": "关节活动度记录删除成功"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"删除关节活动度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/{patient_id}/trend")
async def get_joint_rom_trend(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取关节活动度趋势数据"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT RecordDate, LeftHip, RightHip, LeftKnee, RightKnee, LeftAnkle, RightAnkle
            FROM JointMobilityRecords 
            WHERE PatientID = ?
            ORDER BY RecordDate
        """, patient_id)
        
        trend_data = {}
        for row in cursor.fetchall():
            date_str = row.RecordDate.strftime("%Y-%m-%d")
            trend_data[date_str] = {
                "left_hip": row.LeftHip,
                "right_hip": row.RightHip,
                "left_knee": row.LeftKnee,
                "right_knee": row.RightKnee,
                "left_ankle": row.LeftAnkle,
                "right_ankle": row.RightAnkle
            }
        
        return {
            "patient_id": patient_id,
            "trend_data": trend_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取关节活动度趋势失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()