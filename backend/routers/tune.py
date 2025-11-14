from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np

router = APIRouter()

@router.get('/api/tune_mobilenet')
async def tune_mobilenet(lr: float = Query(0.001), epoch: int = Query(10)):
    """模拟 MobileNetV2 微调并返回 loss 曲线与简要模型状态指标。

    返回 JSON:
    {
      "loss": [...],
      "pre_avg_error": float,
      "post_avg_error": float,
      "improvement_pct": float,
      "status": "trained"|"failed"
    }
    """
    # TODO: 在真正集成时，替换为真实的微调逻辑（加载模型、在用户样本上微调并评估）
    np.random.seed(42)
    # 模拟loss曲线：从初始loss逐步下降
    base = 1.2
    loss = []
    for i in range(max(1, epoch)):
        noise = float(np.random.rand() * 0.05)
        value = max(0.01, base - i * lr * 2 + noise)
        loss.append(float(value))

    # 模拟训练前后平均偏差（度量单位为度），用loss首尾近似映射到偏差
    pre_avg_error = round(24.88 + (loss[0] - 1.0) * 5.0, 2)  # 简单映射示例
    post_avg_error = round(max(0.0, pre_avg_error - (loss[0] - loss[-1]) * 10.0), 2)
    improvement_pct = round((pre_avg_error - post_avg_error) / (pre_avg_error + 1e-6) * 100.0, 2)

    resp = {
        "loss": loss,
        "pre_avg_error": pre_avg_error,
        "post_avg_error": post_avg_error,
        "improvement_pct": improvement_pct,
        "status": "trained"
    }

    return JSONResponse(resp)
