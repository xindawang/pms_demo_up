package org.iothust.service;

import org.activiti.engine.delegate.DelegateExecution;
import org.activiti.engine.delegate.JavaDelegate;
import org.iothust.dao.entity.ScheduleEntity;
import org.iothust.tools.StatusEnum;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CompleteSchedule implements JavaDelegate {
    @Autowired
    private ScheduleService ss;

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        System.out.println("这是完成计划的Service");
        Long scheduleId = (Long) execution.getVariable("scheduleId");
        ScheduleEntity schedule=ss.getById(scheduleId);
        //判断是否为分解任务
        if(schedule.getTask()!=null){
            execution.setVariable("superTaskId",schedule.getTask().getId());
        }
        //完成当前计划并改变计划状态
        execution.setVariableLocal("scheduleStatusEnum", StatusEnum.COMPLETE);
    }
}