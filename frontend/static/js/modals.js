
// 获取模态框本地化文本
function getModalText(key) {
    return i18n.t(key) || key;
}
// 将模态框添加到页面
function creatModal() {
// 康复阶段模态框
const addStageModal = `
<div id="addStageModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
  <div class="bg-gradient-to-br from-deep to-med rounded-2xl p-6 w-full max-w-2xl mx-4 border border-accent/30 modal-enter">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-bold" data-i18n="add_stage">${getModalText('add_stage')}</h3>
      <button onclick="hideAddStageModal()" class="text-gray-400 hover:text-white">
        <i class="fa fa-times text-xl"></i>
      </button>
    </div>
    
    <form id="stageForm" class="space-y-4">
      <input type="hidden" id="stagePatientId" value="">
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="stage_name">${getModalText('stage_name')}</label>
          <input type="text" id="stageName" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('enter_stage_name')}" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="stage_number">${getModalText('stage_number')}</label>
          <input type="number" id="stageNumber" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('stage_order')}">
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="start_date">${getModalText('start_date')}</label>
          <input type="date" id="stageStartDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="end_date">${getModalText('end_date')}</label>
          <input type="date" id="stageEndDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="stage_goals">${getModalText('stage_goals')}</label>
        <textarea id="stageGoals" rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('stage_goals_placeholder')}"></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="current_progress">${getModalText('current_progress')}</label>
          <input type="number" id="stageProgress" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('progress_placeholder')}">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="status">${getModalText('status')}</label>
          <select id="stageStatus" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
            <option value="active">${getModalText('active')}</option>
            <option value="pending">${getModalText('pending')}</option>
            <option value="completed">${getModalText('completed')}</option>
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="weeks_completed">${getModalText('weeks_completed')}</label>
          <input type="number" id="weeksCompleted" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="weeks_remaining">${getModalText('weeks_remaining')}</label>
          <input type="number" id="weeksRemaining" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="weekly_focus">${getModalText('weekly_focus')}</label>
        <input type="text" id="weeklyFocus" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('weekly_focus_placeholder')}">
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="training_intensity">${getModalText('training_intensity')}</label>
          <select id="trainingIntensity" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
            <option value="low">${getModalText('low')}</option>
            <option value="medium" selected>${getModalText('medium')}</option>
            <option value="high">${getModalText('high')}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="next_evaluation_date">${getModalText('next_evaluation_date')}</label>
          <input type="date" id="nextEvaluationDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input">
        </div>
      </div>
      
      <div class="flex justify-end space-x-3 pt-4">
        <button type="button" onclick="hideAddStageModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300" data-i18n="cancel">
          ${getModalText('cancel')}
        </button>
        <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium" data-i18n="save_stage">
          ${getModalText('save_stage')}
        </button>
      </div>
    </form>
  </div>
</div>
`;

// 关节活动度模态框
const addROMModal = `
<div id="addROMModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
  <div class="bg-gradient-to-br from-deep to-med rounded-2xl p-6 w-full max-w-2xl mx-4 border border-accent/30 modal-enter">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-bold" data-i18n="add_rom">${getModalText('add_rom')}</h3>
      <button onclick="hideAddROMModal()" class="text-gray-400 hover:text-white">
        <i class="fa fa-times text-xl"></i>
      </button>
    </div>
    
    <form id="romForm" class="space-y-4">
      <input type="hidden" id="romPatientId" value="">
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="record_date">${getModalText('record_date')}</label>
        <input type="date" id="romRecordDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
      </div>
      
      <div class="grid grid-cols-2 gap-6">
        <!-- 左侧关节 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-accent border-b border-accent/30 pb-2" data-i18n="left_joints">${getModalText('left_joints')}</h4>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="left_hip">${getModalText('left_hip')}</label>
            <input type="number" id="leftHip" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="0-180">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="left_knee">${getModalText('left_knee')}</label>
            <input type="number" id="leftKnee" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="0-180">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="left_ankle">${getModalText('left_ankle')}</label>
            <input type="number" id="leftAnkle" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="0-180">
          </div>
        </div>
        
        <!-- 右侧关节 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-accent border-b border-accent/30 pb-2" data-i18n="right_joints">${getModalText('right_joints')}</h4>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="right_hip">${getModalText('right_hip')}</label>
            <input type="number" id="rightHip" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="0-180">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="right_knee">${getModalText('right_knee')}</label>
            <input type="number" id="rightKnee" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="0-180">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="right_ankle">${getModalText('right_ankle')}</label>
            <input type="number" id="rightAnkle" min="0" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="0-180">
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
        <!-- 左侧变化 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-warning border-b border-warning/30 pb-2" data-i18n="left_changes">${getModalText('left_changes')}</h4>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="left_hip_change">${getModalText('left_hip_change')}</label>
            <input type="number" id="leftHipChange" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('change_placeholder')}">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="left_knee_change">${getModalText('left_knee_change')}</label>
            <input type="number" id="leftKneeChange" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('change_placeholder')}">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="left_ankle_change">${getModalText('left_ankle_change')}</label>
            <input type="number" id="leftAnkleChange" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('change_placeholder')}">
          </div>
        </div>
        
        <!-- 右侧变化 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-warning border-b border-warning/30 pb-2" data-i18n="right_changes">${getModalText('right_changes')}</h4>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="right_hip_change">${getModalText('right_hip_change')}</label>
            <input type="number" id="rightHipChange" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('change_placeholder')}">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="right_knee_change">${getModalText('right_knee_change')}</label>
            <input type="number" id="rightKneeChange" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('change_placeholder')}">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2" data-i18n="right_ankle_change">${getModalText('right_ankle_change')}</label>
            <input type="number" id="rightAnkleChange" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('change_placeholder')}">
          </div>
        </div>
      </div>
      
      <div class="flex justify-end space-x-3 pt-4">
        <button type="button" onclick="hideAddROMModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300" data-i18n="cancel">
          ${getModalText('cancel')}
        </button>
        <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium" data-i18n="save_record">
          ${getModalText('save_record')}
        </button>
      </div>
    </form>
  </div>
</div>
`;

// 康复进度模态框
const addProgressModal = `
<div id="addProgressModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
  <div class="bg-gradient-to-br from-deep to-med rounded-2xl p-6 w-full max-w-2xl mx-4 border border-accent/30 modal-enter">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-bold" data-i18n="add_progress">${getModalText('add_progress')}</h3>
      <button onclick="hideAddProgressModal()" class="text-gray-400 hover:text-white">
        <i class="fa fa-times text-xl"></i>
      </button>
    </div>
    
    <form id="progressForm" class="space-y-4">
      <input type="hidden" id="progressPatientId" value="">
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="record_date">${getModalText('record_date')}</label>
          <input type="date" id="progressRecordDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="week_number">${getModalText('week_number')}</label>
          <input type="number" id="weekNumber" min="1" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('week_placeholder')}" required>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="overall_progress">${getModalText('overall_progress')}</label>
          <input type="number" id="overallProgressInput" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('progress_placeholder')}" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="performance_score">${getModalText('performance_score')}</label>
          <input type="number" id="performanceScore" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('progress_placeholder')}">
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="joint_mobility_progress">${getModalText('joint_mobility_progress')}</label>
          <input type="number" id="jointMobilityProgress" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('progress_placeholder')}" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="muscle_strength_progress">${getModalText('muscle_strength_progress')}</label>
          <input type="number" id="muscleStrengthProgress" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('progress_placeholder')}" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="balance_ability_progress">${getModalText('balance_ability_progress')}</label>
          <input type="number" id="balanceAbilityProgress" min="0" max="100" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('progress_placeholder')}" required>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="training_duration">${getModalText('training_duration')}</label>
          <input type="number" id="trainingDuration" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('training_duration_placeholder')}">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="training_steps">${getModalText('training_steps')}</label>
          <input type="number" id="trainingSteps" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('training_steps_placeholder')}">
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="notes">${getModalText('notes')}</label>
        <textarea id="progressNotes" rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('notes_placeholder')}"></textarea>
      </div>
      
      <div class="flex justify-end space-x-3 pt-4">
        <button type="button" onclick="hideAddProgressModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300" data-i18n="cancel">
          ${getModalText('cancel')}
        </button>
        <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium" data-i18n="save_progress">
          ${getModalText('save_progress')}
        </button>
      </div>
    </form>
  </div>
</div>
`;

// 训练计划模态框
const addTrainingPlanModal = `
<div id="addTrainingPlanModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
  <div class="bg-gradient-to-br from-deep to-med rounded-2xl p-6 w-full max-w-2xl mx-4 border border-accent/30 modal-enter max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-6  top-0 py-2 -mt-2">
      <h3 class="text-xl font-bold" data-i18n="add_training_plan">${getModalText('add_training_plan')}</h3>
      <button onclick="hideAddTrainingPlanModal()" class="text-gray-400 hover:text-white">
        <i class="fa fa-times text-xl"></i>
      </button>
    </div>
    
    <form id="trainingPlanForm" class="space-y-4">
      <input type="hidden" id="trainingPlanPatientId" value="">
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="plan_name">${getModalText('plan_name')}</label>
          <input type="text" id="planName" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('enter_plan_name')}" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="related_stage">${getModalText('related_stage')}</label>
          <select id="planStage" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input appearance-none" required>
            <!-- 阶段选项将动态加载 -->
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="start_date">${getModalText('start_date')}</label>
          <input type="date" id="planStartDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="end_date">${getModalText('end_date')}</label>
          <input type="date" id="planEndDate" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" required>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="training_frequency">${getModalText('training_frequency')}</label>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm opacity-80 mb-1" data-i18n="sessions_per_week">${getModalText('sessions_per_week')}</label>
            <input type="number" id="weeklySessions" min="1" max="7" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" value="3" required>
          </div>
          <div>
            <label class="block text-sm opacity-80 mb-1" data-i18n="session_duration">${getModalText('session_duration')}</label>
            <input type="number" id="sessionDuration" min="10" max="180" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" value="30" required>
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="training_content">${getModalText('training_content')}</label>
        <textarea id="trainingContent" rows="3" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('training_content_placeholder')}" required></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="training_goals">${getModalText('training_goals')}</label>
        <textarea id="trainingGoals" rows="2" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('goals_placeholder')}" required></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="training_intensity">${getModalText('training_intensity')}</label>
          <select id="trainingIntensity" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input appearance-none">
            <option value="low">${getModalText('low')}</option>
            <option value="medium" selected>${getModalText('medium')}</option>
            <option value="high">${getModalText('high')}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2" data-i18n="status">${getModalText('status')}</label>
          <select id="planStatus" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input appearance-none">
            <option value="pending">${getModalText('pending')}</option>
            <option value="active" selected>${getModalText('active')}</option>
            <option value="completed">${getModalText('completed')}</option>
            <option value="paused">${getModalText('paused')}</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2" data-i18n="precautions">${getModalText('precautions')}</label>
        <textarea id="precautions" rows="2" class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none form-input" placeholder="${getModalText('precautions_placeholder')}"></textarea>
      </div>
      
      <div class="flex justify-end space-x-3 pt-4 border-t border-white/10">
        <button type="button" onclick="hideAddTrainingPlanModal()" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300" data-i18n="cancel">
          ${getModalText('cancel')}
        </button>
        <button type="submit" class="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-all duration-300 font-medium" data-i18n="save_plan">
          ${getModalText('save_plan')}
        </button>
      </div>
    </form>
  </div>
</div>
`;

// 在CSS中添加下拉选项样式
const modalStyles = `
<style>
/* 下拉选项背景色修复 */
select.form-input option {
  background: #0A3A7A !important;
  color: white !important;
  border: none;
}

select.form-input:focus option {
  background: rgba(255, 255, 255, 0.15) !important;
}

/* 确保下拉菜单背景色一致 */
select.form-input {
  background-color: rgba(255, 255, 255, 0.1) !important;
}
 

/* 为所有模态框添加滚动支持 */
.modal-enter {
  max-height: 85vh;
  overflow-y: auto;
}

/* 修复其他模态框的下拉选项 */
#stageStatus option,
#trainingIntensity option,
#planStatus option {
  background: rgba(30, 41, 59, 0.95) !important;
  color: white !important;
}
</style>
`;

// 编辑模态框 - 通用编辑表单
const editModal = `
<div id="editModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
  <div class="bg-gradient-to-br from-deep to-med rounded-2xl p-6 w-full max-w-2xl mx-4 border border-accent/30 modal-enter max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-6 sticky top-0 bg-deep py-2 -mt-2">
      <h3 class="text-xl font-bold" id="editModalTitle">${i18n.currentLanguage === 'zh-CN' ? '编辑信息' : 'Edit Information'}</h3>
      <button onclick="hideEditModal()" class="text-gray-400 hover:text-white">
        <i class="fa fa-times text-xl"></i>
      </button>
    </div>
    
    <div id="editModalContent">
      <!-- 编辑表单将动态加载在这里 -->
    </div>
  </div>
</div>
`;


    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = addStageModal + addROMModal + addProgressModal + addTrainingPlanModal + editModal;
    document.body.appendChild(modalContainer);
    
    // 添加样式
    const styleElement = document.createElement('div');
    styleElement.innerHTML = modalStyles;
    document.head.appendChild(styleElement);
} 

// ========== 编辑模态框函数 ==========

function showEditModal(title, content) {
    document.getElementById('editModalTitle').textContent = title;
    document.getElementById('editModalContent').innerHTML = content;
    document.getElementById('editModal').classList.remove('hidden');
}

function hideEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editModalContent').innerHTML = '';
}

// 更新模态框文本的函数
function updateModalTextContent() {
    const lang = i18n.currentLanguage;
    
    // 更新所有模态框中的文本
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (modalResources[lang][key]) {
            element.textContent = modalResources[lang][key];
        }
    });
}

// 监听语言变化
document.addEventListener('languageChanged', function() {
    updateModalTextContent();
});