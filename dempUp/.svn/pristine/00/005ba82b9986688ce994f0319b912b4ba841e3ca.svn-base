package org.iothust.service;

import org.activiti.bpmn.BpmnAutoLayout;
import org.activiti.bpmn.model.*;
import org.activiti.bpmn.model.Process;
import org.activiti.engine.HistoryService;
import org.activiti.engine.RepositoryService;
import org.activiti.engine.RuntimeService;
import org.activiti.engine.TaskService;
import org.activiti.engine.history.HistoricVariableInstance;
import org.activiti.engine.repository.Deployment;
import org.activiti.engine.runtime.ProcessInstance;
import org.activiti.engine.task.Task;
import org.activiti.engine.task.TaskQuery;
import org.apache.commons.io.FileUtils;
import org.iothust.dao.entity.ScheduleEntity;
import org.iothust.dao.entity.TaskEntity;
import org.iothust.dao.entity.UniversalScheduleEntity;
import org.iothust.dao.repository.ScheduleRepository;
import org.iothust.dao.repository.TaskRepository;
import org.iothust.exception.DeleteException;
import org.iothust.exception.UpdateException;
import org.iothust.tools.CheckTool;
import org.iothust.tools.GraphCheck;
import org.iothust.tools.StatusEnum;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The type Schedule workflow service.
 */
@Service
@Transactional
public class ScheduleWorkflowService {
    private static Logger logger = LoggerFactory.getLogger(ScheduleWorkflowService.class);

    @Autowired
    private ScheduleRepository sr;
    @Autowired
    private TaskRepository tr;
    @Autowired
    private org.iothust.service.TaskService ts;
    @Autowired
    private ScheduleService ss;
    @Autowired
    private RuntimeService runtimeService;
    @Autowired
    private HistoryService historyService;
    @Autowired
    private TaskService taskService;
    @Autowired
    private UniversalScheduleService universalScheduleService;
    @Autowired
    private RepositoryService repositoryService;

    //启动流程
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public ProcessInstance startScheduleProcess(ScheduleEntity schedule) throws Exception {
        Map<String, Object> variables = new HashMap<>();
        variables.put("initiatorId", schedule.getResponsibleId().toString());
        variables.put("scheduleId", schedule.getId());
        try {
            ProcessInstance processInstance = runtimeService.startProcessInstanceByKey("approvingSchedule", variables);
            schedule.setProcessInstanceId(processInstance.getProcessInstanceId());
            float progress = 0;
            schedule.setProgress(progress);
            sr.update(schedule);
            return processInstance;
        } catch (Exception e) {
            // TODO: handle exception
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * 查询流程中用户的代办任务对应的计划实体
     *
     * @param userId 用户Id
     * @return list list
     */
    @Transactional(readOnly = true)
    public List<ScheduleEntity> findTodoSchedules(String userId) {
        List<ScheduleEntity> schedules = new ArrayList<>();
        // 根据当前人的ID查询
        TaskQuery taskQuery = taskService.createTaskQuery().taskAssignee(userId);
        List<Task> tasks = taskQuery.list();
        for (Task task : tasks) {
            String processInstanceId = task.getProcessInstanceId();
            ScheduleEntity schedule = sr.getByProcessInstanceId(processInstanceId);
            schedules.add(schedule);
        }
        return schedules;
    }

    @Transactional
    public ScheduleEntity completeTask(ScheduleEntity schedule, Task task, Map<String, Object> variables,
                                       StatusEnum scheduleStatus, StatusEnum currentTaskStatus, StatusEnum subTaskStatus) {
        //审批意见必须设为任务的局部变量，将来才能被历史记录查询
        taskService.setVariablesLocal(task.getId(), variables);
        taskService.complete(task.getId(), variables);
        try {
            List<TaskEntity> myTasks = ts.getTasksByScheduleId(schedule.getId());
            for (TaskEntity myTask : myTasks) {
                myTask.setStatus(subTaskStatus);
                ts.update(myTask);
            }
            if (currentTaskStatus != null && schedule.getTaskId() != null) {
                TaskEntity currentTask = ts.getById(schedule.getTaskId());
                currentTask.setStatus(currentTaskStatus);
                ts.update(currentTask);
            }
            schedule.setStatus(scheduleStatus);
            ss.update(schedule);
            return schedule;
        } catch (Exception e) {
            // TODO: handle exception
            e.printStackTrace();
            return null;
        }
    }

    //完成计划下任务
    @Transactional
    public TaskEntity completeScheduleTask(Long taskId, Task task, Map<String, Object> variables) {
        String processInstanceId = task.getProcessInstanceId();
        taskService.setVariablesLocal(task.getId(), variables);
        taskService.complete(task.getId(), variables);
        try {
            TaskEntity te = ts.getById(taskId);
            te.setStatus(StatusEnum.COMPLETE);//完成任务
            te.setFinishTime(new Date(System.currentTimeMillis()));
            tr.update(te);

            //若计划完成，更新计划状态
            Long scheduleId = te.getSchedule().getId();
            ScheduleEntity se = ss.getById(scheduleId);
            List<HistoricVariableInstance> scheduleStatusEnumList = historyService.createHistoricVariableInstanceQuery().processInstanceId(processInstanceId).variableName("scheduleStatusEnum").list();
            if (scheduleStatusEnumList != null && scheduleStatusEnumList.size() > 0) {
                StatusEnum scheduleStatusEnum = (StatusEnum) scheduleStatusEnumList.get(0).getValue();
                se.setStatus(scheduleStatusEnum);
                se.setFinishTime(new Date(System.currentTimeMillis()));
            }
            //更新计划进度
            float progress = ts.countProgress(scheduleId);
            se.setProgress(progress);

            //若分解计划完成则完成上级任务
            List<HistoricVariableInstance> superTaskIdList = historyService.createHistoricVariableInstanceQuery().processInstanceId(processInstanceId).variableName("superTaskId").list();
            if (superTaskIdList != null && superTaskIdList.size() > 0) {
                Long superTaskId = (Long) superTaskIdList.get(0).getValue();
                try {
                    ts.finishTask(superTaskId);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            ss.update(se);
            return te;
        } catch (UpdateException e) {
            e.printStackTrace();
            return null;
        }
    }

    //新建计划
    public Deployment initSchedule(ScheduleEntity schedule) throws Exception {
        String scheduleName = "S" + schedule.getName();
        return iniScheduleImpl(scheduleName);
    }

    //添加任务
    @Transactional(rollbackFor = Exception.class)
    public void addUserTask(TaskEntity taskEntity, String preTask) throws Exception {
        ts.add(taskEntity);
        String scheduleName = "S" + ss.getById(taskEntity.getScheduleId()).getName();//计划名称
        if (CheckTool.stringIsNull(preTask)) {
            addUserTaskImpl(scheduleName, taskEntity);
        } else {
            addUserTaskAndPreTaskImpl(scheduleName, taskEntity, preTask);
        }
    }

    //删除任务
    @Transactional
    public String delTask(long delTaskId) {
        TaskEntity task = ts.getById(delTaskId);
        String scheduleName = "";
        if (tr.isScheduleTask(delTaskId)) {
            //普通计划
            scheduleName = "S" + ss.getById(task.getScheduleId()).getName();
        } else {
            //通用计划
            scheduleName = "UniS" + universalScheduleService.getScheduleById(task.getScheduleId()).getName();
        }
        Deployment deployment = getDeployment(scheduleName);
        Process process = getProcess(deployment.getId());

        String userTaskId = "t"+delTaskId;
        if(process.getFlowElement(userTaskId+"join")!=null){
            return "此任务有前置任务，不能删除！";
        }
        if(process.getFlowElement(userTaskId+"fork")!=null){
            return "此任务有后置任务，不能删除！";
        }
        process.removeFlowElement(userTaskId);
        process.removeFlowElement("to"+userTaskId);
        process.removeFlowElement(userTaskId+"toJoin");
        updateDeployment(deployment,process);
        try {
            if (tr.isScheduleTask(delTaskId)) {
                //普通计划
                tr.delById(delTaskId);
            } else {
                //通用计划
                tr.delUniScheduleTask(delTaskId);
            }
            return "success";
        } catch (DeleteException e) {
            e.printStackTrace();
            return "删除失败！";
        }
    }

//    private String delTaskImpl(Long delTaskId,String scheduleName) {
//        Deployment deployment = getDeployment(scheduleName);
//        Process process = getProcess(deployment.getId());
//
//        String userTaskId = "t"+delTaskId.toString();
//        if(process.getFlowElement(userTaskId+"join")!=null){
//            return "此任务有前置任务，不能删除！";
//        }
//        if(process.getFlowElement(userTaskId+"fork")!=null){
//            return "此任务有后置任务，不能删除！";
//        }
//        process.removeFlowElement(userTaskId);
//        process.removeFlowElement("to"+userTaskId);
//        process.removeFlowElement(userTaskId+"toJoin");
//        updateDeployment(deployment,process);
//        return "删除成功！";
//    }

    //更新计划（普通、通用）任务前置关系
    @Transactional(rollbackFor = Exception.class)
    public String updatePreTask(List<Map<String, Object>> list) {
        List<Map<String, Object>> noPreTaskList = new ArrayList<>();
        List<Map<String, Object>> withPreTaskList = new ArrayList<>();
        List<TaskEntity> listTask = new ArrayList<>();

        for (Map<String, Object> m : list) {
            Long taskId = Long.parseLong(m.get("id").toString());
            TaskEntity taskEntity = ts.getById(taskId);
            listTask.add(taskEntity);
            String preTaskId = "";
            if (!CheckTool.stringIsNull(m.get("pretask").toString())) {
                preTaskId = m.get("pretask").toString();
            }
            if (preTaskId.length() > 0) {
                withPreTaskList.add(m);
            } else {
                noPreTaskList.add(m);
            }
        }
        if (withPreTaskList.size() > 0) {
            if (checkCycleInGraph(list)) {
                return "您的前置关系已成环，请重新设计关系！";
            }
        }
        String scheduleName = "";
        try {
            TaskEntity taskEntity = null;
            if (listTask != null && listTask.size() > 0) {
                taskEntity = ts.getById(listTask.get(0).getId());
            }
            if (tr.isScheduleTask(taskEntity.getId())) {
                //普通计划
                scheduleName = "S" + ss.getById(listTask.get(0).getScheduleId()).getName();//计划名称
            } else {
                //通用计划
                scheduleName = "UniS" + universalScheduleService.getScheduleById(listTask.get(0).getScheduleId()).getName();//计划名称
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "error";
        }
        updateTaskRel(scheduleName, listTask, noPreTaskList, withPreTaskList);
        return "success";
    }

    //更新计划（普通、通用）任务前置关系实现
    @Transactional
    public void updateTaskRel(String scheduleName, List<TaskEntity> taskEntities, List<Map<String, Object>> noPreTaskList, List<Map<String, Object>> withPreTaskList) {
        repositoryService.deleteDeployment(getDeployment(scheduleName).getId());
        Deployment deployment = iniScheduleImpl(scheduleName);
        Process process = getProcess(deployment.getId());                                              //流程
        process.removeFlowElement("toJoin");
        //遍历taskEntities,创建自由节点
        for (TaskEntity t : taskEntities) {
            String userTaskName = t.getName();
            String userId = "t" + t.getId().toString();
            String assignee = "";
            if (tr.isScheduleTask(t.getId())) {
                assignee = t.getResponsibleId().toString();         //责任人
            }
            //将所有任务添加到流程图中
            process.addFlowElement(createUserTask(userId, userTaskName, assignee));
        }
        //组合关系
        for (Map<String, Object> wm : withPreTaskList) {
            String userTaskId = "t" + wm.get("id").toString();
            String preTask = wm.get("pretask").toString();
            List<Long> preTaskIdList = splitPreTaskId(preTask);
            //为当前任务增加Join网关
            process.addFlowElement(createParallelGatewayJoin(userTaskId + "join"));
            process.addFlowElement(createSequenceFlow("to" + userTaskId, userTaskId + "join", userTaskId));

            //先检查前置任务是否有分支网关，没有再添加，后连线
            for (Long tId : preTaskIdList) {
                String preId = "t" + tId.toString();
                Boolean hasFork = false;
                if (process.getFlowElement(preId + "fork") != null) {
                    hasFork = true;
                }
                if (!hasFork) {
                    //若前置任务下没有fork
                    process.addFlowElement(createParallelGatewayFork(preId + "fork"));
                    process.addFlowElement(createSequenceFlow(preId + "to" + preId + "fork", preId, preId + "fork"));
                }
                //连线
                process.addFlowElement(createSequenceFlow(preId + "fork" + "to" + userTaskId + "join", preId + "fork", userTaskId + "join"));
            }
        }
        //成图
        // 没有前置任务的，和start的fork相连
        for (Map<String, Object> nm : noPreTaskList) {
            String taskId = "t" + nm.get("id").toString();
            //与startfork相连
            process.addFlowElement(createSequenceFlow("to" + taskId, "fork", taskId));
        }
        //没有后置fork的Task的与end的join相连
        for (TaskEntity task : taskEntities) {
            String userTaskId = "t" + task.getId().toString();
            Boolean hasFork = false;
            if (process.getFlowElement(userTaskId + "fork") != null) {
                hasFork = true;
            }
            if (!hasFork) {
                //没有后置任务，和endjoin连线
                process.addFlowElement(createSequenceFlow(userTaskId + "toJoin", userTaskId, "join"));
            }
        }
        //更新流程图
        updateDeployment(deployment, process);
    }

    //更新任务
    @Transactional
    public void updateTask(TaskEntity taskEntity) throws UpdateException {
        TaskEntity te = ts.getById(taskEntity.getId());
        ts.update(taskEntity);
        if (!te.getName().equals(taskEntity.getName()) || !te.getResponsibleId().equals(taskEntity.getResponsibleId())) {
            String scheduleName = "S" + taskEntity.getSchedule().getName();
            Deployment deployment = getDeployment(scheduleName);
            Process process = getProcess(deployment.getId());

            UserTask userTask = (UserTask) process.getFlowElement("t" + taskEntity.getId());
            userTask.setName(taskEntity.getName());
            userTask.setAssignee(taskEntity.getResponsibleId().toString());
            updateDeployment(deployment, process);
        }
    }

    //新建通用计划
    @Transactional(rollbackFor = Exception.class)
    public int initUniSchedule(UniversalScheduleEntity use) {
        if (universalScheduleService.add(use) == 0) {
            return 0;
        }
        String useName = "UniS" + use.getName();
        iniScheduleImpl(useName);
        return 1;
    }

    //为通用计划添加Task
    @Transactional(rollbackFor = Exception.class)
    public void addTaskToUniSchedule(TaskEntity taskEntity) throws Exception {
        ts.addUniScheudleTask(taskEntity);
        String scheduleName = "UniS" + universalScheduleService.getScheduleById(taskEntity.getUnivScheduleId()).getName();//计划名称
        addUserTaskImpl(scheduleName, taskEntity);
    }

    //检索流程图，获取当前任务的前置任务(普通)
    public String getPreTaskId(TaskEntity taskEntity) {
        Long scheduleId = taskEntity.getScheduleId();
        String scheduleName = "S" + sr.getById(scheduleId).getName();
        return getPreTaskIdImpl(scheduleName, taskEntity);
    }

    //检索流程图，获取当前任务的前置任务(通用)
    public String getUniPreTaskId(TaskEntity taskEntity) {
        Long scheduleId = taskEntity.getUnivScheduleId();
        String scheduleName = "UniS" + universalScheduleService.getScheduleById(scheduleId).getName();
        return getPreTaskIdImpl(scheduleName, taskEntity);
    }

    //普通初始化计划实现
    private Deployment iniScheduleImpl(String scheduleName) {
        Process process = new Process();
        process.setId(scheduleName);
        process.addFlowElement(createStartEvent());
        process.addFlowElement(createEndEvent());
        process.addFlowElement(createParallelGatewayFork("fork"));
        process.addFlowElement(createParallelGatewayJoin("join"));
        process.addFlowElement(createServiceTask("completeSchedule", "completeSchedule"));
        process.addFlowElement(createSequenceFlow("toFork", "start", "fork"));
        process.addFlowElement(createSequenceFlow("toJoin", "fork", "join"));
        process.addFlowElement(createSequenceFlow("toServiceTask", "join", "completeSchedule"));
        process.addFlowElement(createSequenceFlow("toEnd", "completeSchedule", "end"));

        BpmnModel bpmnModel = new BpmnModel();
        bpmnModel.addProcess(process);
        new BpmnAutoLayout(bpmnModel).execute();
        String resourceName = scheduleName + ".bpmn";
        Deployment deployment = repositoryService.createDeployment().addBpmnModel(resourceName, bpmnModel).name(scheduleName).deploy();
        outputDeploymentImage(deployment);
        return deployment;
    }

    //添加Task 实现
    private void addUserTaskImpl(String scheduleName, TaskEntity taskEntity) {
        String userTaskName = taskEntity.getName();//任务名称
        String useTaskId = "t" + taskEntity.getId().toString();
        String assignee = "";
        if (taskEntity.getUnivScheduleId() == null) {
            assignee = taskEntity.getResponsibleId().toString();         //责任人
        }
        Deployment deployment = getDeployment(scheduleName);
        Process process = getProcess(deployment.getId());                                              //流程
        //开始绘制流程图
        List<UserTask> userTasks = process.findFlowElementsOfType(UserTask.class);
        if (userTasks.size() == 0) {
            process.removeFlowElement("toJoin");
        }
        process.addFlowElement(createUserTask(useTaskId, userTaskName, assignee));
        process.addFlowElement(createSequenceFlow("to" + useTaskId, "fork", useTaskId));
        process.addFlowElement(createSequenceFlow(useTaskId + "toJoin", useTaskId, "join"));
        updateDeployment(deployment, process);
    }

    //添加有 preTask Task 实现
    private void addUserTaskAndPreTaskImpl(String scheduleName, TaskEntity taskEntity, String preTask) {
        String userTaskName = taskEntity.getName();
        String useTaskId = "t" + taskEntity.getId().toString();
        String assignee = taskEntity.getResponsibleId().toString();
        Deployment deployment = getDeployment(scheduleName);
        Process process = getProcess(deployment.getId());
        process.addFlowElement(createUserTask(useTaskId, userTaskName, assignee));
        process.addFlowElement(createParallelGatewayJoin(useTaskId + "join"));
        process.addFlowElement(createSequenceFlow("to" + useTaskId, useTaskId + "join", useTaskId));
        process.addFlowElement(createSequenceFlow(useTaskId + "toJoin", useTaskId, "join"));

        //添加前置任务
        List<Long> taskId = splitPreTaskId(preTask);
        for (Long t : taskId) {
            TaskEntity preTaskEntity = ts.getById(t);
            String preTaskId = "t" + preTaskEntity.getId().toString();
            Boolean hasFork = false;
            if (process.getFlowElement(preTaskId + "fork") != null) {
                hasFork = true;
            }
            if (!hasFork) {
                //若前置任务下没有fork
                process.addFlowElement(createParallelGatewayFork(preTaskId + "fork"));
                process.addFlowElement(createSequenceFlow(preTaskId + "to" + preTaskId + "fork", preTaskId, preTaskId + "fork"));
                process.removeFlowElement(preTaskId + "toJoin");
            }
            //连线
            process.addFlowElement(createSequenceFlow(preTaskId + "fork" + "to" + useTaskId + "join", preTaskId + "fork", useTaskId + "join"));
        }
        updateDeployment(deployment, process);
    }

    //检索流程图，获取当前任务的前置任务实现
    private String getPreTaskIdImpl(String scheduleName, TaskEntity taskEntity) {
        String preTask = "";
        Deployment deployment = getDeployment(scheduleName);
        Process process = getProcess(deployment.getId());

        Boolean hasJoin = false;
        ParallelGateway parallelGateway = null;
        if (process.getFlowElement("t" + taskEntity.getId() + "join") != null) {
            hasJoin = true;
            parallelGateway = (ParallelGateway) process.getFlowElement("t" + taskEntity.getId() + "join");
        }
        if (hasJoin) {
            //该任务有前置任务
            String preTaskId = "";
            List<SequenceFlow> sequenceFlowList = parallelGateway.getIncomingFlows();
            for (SequenceFlow s : sequenceFlowList) {
                preTaskId = getPreTaskIdFromSourceRef(s.getSourceRef());
                if (preTask.length() <= 0) {
                    preTask = preTaskId;
                } else {
                    preTask = preTask + "," + preTaskId;
                }
            }
        }
        return preTask;
    }

    //检查是否成环
    private Boolean checkCycleInGraph(List<Map<String, Object>> list) {
        Boolean hasCycle = false;
        List<String> listTaskId = new ArrayList<>();
        String[][] listPretask = new String[list.size()][];
        int count = 0;
        for (Map<String, Object> m : list) {
            String taskIdString = m.get("id").toString();
            listTaskId.add(taskIdString);
            String preTaskId = "";
            if (CheckTool.stringIsNull(m.get("pretask").toString())) {
                continue;
            }
            preTaskId = m.get("pretask").toString();
            List<Long> listPreTaskId = splitPreTaskId(preTaskId);
            listPretask[count] = new String[listPreTaskId.size() + 1];
            listPretask[count][0] = taskIdString;
            int count2 = 1;
            for (Long lp : listPreTaskId) {
                listPretask[count][count2] = Long.toString(lp);
                count2++;
            }
            count++;
        }
        GraphCheck gc = new GraphCheck();
        if (gc.checkCycle(listTaskId, listPretask))
            hasCycle = true;
        return hasCycle;
    }

    //从SourceRef中获取taskName
    private String getPreTaskIdFromSourceRef(String sourceRefName) {
        String preTaskId = null;
        if (sourceRefName.length() > 0) {
            int index = sourceRefName.indexOf("fork");
            preTaskId = sourceRefName.substring(1, index);
        }
        return preTaskId;
    }

    //通过计划名称获取已部署的流程
    public Deployment getDeployment(String scheduleName) {
        List<Deployment> deployments = repositoryService.createDeploymentQuery().deploymentName(scheduleName).orderByDeploymenTime().desc().list();
        Deployment deployment = null;
        if (deployments != null && deployments.size() > 0) {
            deployment = deployments.get(0);
        }
        return deployment;
    }

    //通过deploymentId获取Process
    private Process getProcess(String deploymentId) {
        String processDefId = repositoryService.createProcessDefinitionQuery().deploymentId(deploymentId).orderByProcessDefinitionVersion().desc().list().get(0).getId();
        BpmnModel bpmnModel = repositoryService.getBpmnModel(processDefId);

        List<Process> listProcess = bpmnModel.getProcesses();
        Process process = null;
        if (listProcess != null && listProcess.size() > 0) {
            process = listProcess.get(0);
        }
        return process;
    }

    //解析preTaskId从String preTask
    public List<Long> splitPreTaskId(String preTask) {
        List<Long> taskIdParse = new ArrayList<>();
        String decimeter = ",";
        if (preTask != null && preTask.length() > 0) {
            String[] temp = preTask.split(decimeter);
            for (String s : temp) {
                taskIdParse.add(Long.parseLong(s));
            }
        }
        return taskIdParse;
    }

    //更新部署，更新流程图
    private void updateDeployment(Deployment deployment, Process process) {
        BpmnModel bpmnModel = new BpmnModel();
        bpmnModel.addProcess(process);
        new BpmnAutoLayout(bpmnModel).execute();
        String deploymentResourceName = deployment.getName();

        repositoryService.deleteDeployment(deployment.getId());
        repositoryService.createDeployment().addBpmnModel(deploymentResourceName + ".bpmn", bpmnModel).name(deploymentResourceName).deploy();
    }

    //输出流程图PNG
    private void outputDeploymentImage(Deployment deployment) {
        //输出部署的流程图
        String deploymentId = deployment.getId();
        List<String> names = repositoryService.getDeploymentResourceNames(deploymentId);
        String imageName = null;
        for (String name : names) {
            if (name.contains(".png")) {
                imageName = name;
            }
        }
        if (imageName != null) {
            File f = new File("e:/" + imageName);
            // 通过部署ID和文件名称得到文件的输入流
            InputStream in = repositoryService.getResourceAsStream(deploymentId, imageName);
            try {
                FileUtils.copyInputStreamToFile(in, f);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    //定义流程图中相关组件
    //fork网关
    private ParallelGateway createParallelGatewayFork(String forkId) {
        ParallelGateway fork = new ParallelGateway();
        fork.setId(forkId);
        return fork;
    }

    //join网关
    private ParallelGateway createParallelGatewayJoin(String joinId) {
        ParallelGateway join = new ParallelGateway();
        join.setId(joinId);
        return join;
    }

    //start
    private StartEvent createStartEvent() {
        StartEvent startEvent = new StartEvent();
        startEvent.setId("start");
        return startEvent;
    }

    //end
    private EndEvent createEndEvent() {
        EndEvent endEvent = new EndEvent();
        endEvent.setId("end");
        return endEvent;
    }

    //sequenceFlow
    private SequenceFlow createSequenceFlow(String id, String from, String to) {
        SequenceFlow sequenceFlow = new SequenceFlow();
        sequenceFlow.setId(id);
        sequenceFlow.setSourceRef(from);
        sequenceFlow.setTargetRef(to);
        return sequenceFlow;
    }

    //userTask
    private UserTask createUserTask(String id, String userTaskName, String assignee) {
        UserTask userTask = new UserTask();
        userTask.setId(id);
        userTask.setName(userTaskName);
        userTask.setAssignee(assignee);
        return userTask;
    }

    //serviceTask
    private ServiceTask createServiceTask(String id, String serviceTaskName) {
        ServiceTask serviceTask = new ServiceTask();
        serviceTask.setId(id);
        serviceTask.setName(serviceTaskName);
        serviceTask.setImplementationType(ImplementationType.IMPLEMENTATION_TYPE_DELEGATEEXPRESSION);
        serviceTask.setImplementation("${completeSchedule}");
        return serviceTask;
    }
}