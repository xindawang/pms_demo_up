package org.iothust.service;

import org.activiti.engine.RuntimeService;
import org.activiti.engine.delegate.DelegateExecution;
import org.activiti.engine.delegate.JavaDelegate;
import org.iothust.dao.entity.ScheduleEntity;
import org.iothust.dao.repository.ScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class StartProcess implements JavaDelegate{
    @Autowired
    private RuntimeService runtimeService;
    @Autowired
    private ScheduleRepository sr;

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        Long scheduleId= (Long) execution.getVariable("scheduleId");
        Map<String, Object> variables = new HashMap<>();
        ScheduleEntity schedule=sr.getById(scheduleId);
//        variables.put("initiatorId", schedule.getResponsibleId().toString());
        variables.put("scheduleId", schedule.getId());
        String processDefinitionKey ="S"+ schedule.getName();
        try {
            System.out.println("启动任务流程");
            runtimeService.startProcessInstanceByKey(processDefinitionKey, variables);
        } catch (Exception e) {
            // TODO: handle exception
            e.printStackTrace();
            throw e;
        }
    }
}