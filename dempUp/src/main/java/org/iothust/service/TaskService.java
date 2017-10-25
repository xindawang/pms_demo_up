package org.iothust.service;

import org.activiti.engine.RuntimeService;
import org.activiti.engine.task.Task;
import org.iothust.dao.entity.ScheduleEntity;
import org.iothust.dao.entity.TaskEntity;
import org.iothust.dao.entity.UserEntity;
import org.iothust.dao.repository.ScheduleRepository;
import org.iothust.dao.repository.TaskRepository;
import org.iothust.exception.DeleteException;
import org.iothust.exception.UpdateException;
import org.iothust.tools.CheckTool;
import org.iothust.tools.StatusEnum;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class TaskService extends TierService<TaskEntity> {
    @Autowired
    private TaskRepository tr;
    @Autowired
    private ScheduleService ss;
    @Autowired
    private ScheduleWorkflowService workflowService;
    @Autowired
    private RuntimeService rs;
    @Autowired
    private ScheduleRepository sr;
    @Autowired
    private TaskService ts;
    @Autowired
    private org.activiti.engine.TaskService taskService;

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<TaskEntity> getTasksByScheduleId(long scheduleId) {
        return tr.getTasksByScheduleId(scheduleId);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<TaskEntity> getTasksByUnivScheduleId(long scheduleId) {
        List<TaskEntity> taskList = tr.getTasksByUnivScheduleId(scheduleId);
        for (TaskEntity te : taskList) {
            int duration = (int) ((te.getEndTime().getTime() - te.getStartTime().getTime()) / (1000 * 3600 * 24));
            te.setDuration(duration);
        }
        return taskList;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<TaskEntity> getFinishedByUserId(Long userId) {
        return tr.getFinishedByUserId(userId);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<TaskEntity> getUnfinishedByUserId(Long userId) {
        return tr.getUnfinishedByUserId(userId);
    }

    public List<TaskEntity> getUnfinishedTaskByUserId(String UserId) {
        List<Task> listTask = taskService.createTaskQuery().taskAssignee(UserId).orderByTaskId().desc().list();
        List<TaskEntity> list = new ArrayList<>();
        for (Task t : listTask) {
            String tasks = t.getTaskDefinitionKey();
            if (!CheckTool.stringIsNull(tasks)&&(tasks.charAt(0)=='t')){
                Long taskId = Long.parseLong(tasks.substring(1));
                TaskEntity taskEntity = getById(taskId);
                list.add(taskEntity);
            }
        }
        return list;
    }

    //接受任务
    public void acceptTask(Long id) throws UpdateException {
        TaskEntity te = tr.getById(id);
        te.setStatus(StatusEnum.EXECUTE);
        te.setAcceptTime(new Date(System.currentTimeMillis()));
        update(te);
    }

    public TaskEntity findTaskEntity(Long id) {
        return tr.getById(id);
    }

    //结束任务
    @Transactional(rollbackFor = Exception.class)
    public void finishTask(Long id) throws Exception {
        TaskEntity te = tr.getById(id);
        UserEntity assignee=te.getResponsible();
        Long assigneeId = assignee.getId();

        Task task = taskService.createTaskQuery().taskAssignee(assigneeId.toString()).taskDefinitionKey("t" + id).singleResult();
        Map<String,Object> variables=taskService.getVariables(task.getId());
        variables.put("assigneeId",assigneeId);
        variables.put("assigneeName",assignee.getName());

        workflowService.completeScheduleTask(id,task,variables);
    }

    public void abortTask(long id) throws UpdateException {
        TaskEntity te = tr.getById(id);
        te.setStatus(StatusEnum.ABORT);
        te.setFinishTime(new Date(System.currentTimeMillis()));
        tr.update(te);
        Long scheduleId = te.getSchedule().getId();
        ScheduleEntity se = ss.getById(scheduleId);
        float progress = countProgress(scheduleId);
        se.setProgress(progress);
        if (progress == 1) {
            se.setStatus(StatusEnum.COMPLETE);
            se.setFinishTime(new Date(System.currentTimeMillis()));
        }
        ss.update(se);
    }

    @Transactional
    public void resolveTask(ScheduleEntity se) throws Exception {
        try {
            ScheduleEntity instanceSchedule = ss.addScheduleTransact(se);
        } catch (Exception e) {
            // TODO: handle exception
            if (se.getProcessInstanceId() != null) {
                rs.deleteProcessInstance(se.getProcessInstanceId(), "创建计划出错时对应流程终止");
            }
            throw e;
        }
        TaskEntity te = tr.getById(se.getTaskId());
        te.setStatus(StatusEnum.RESOLVE);
        update(te);
    }

    public float countProgress(long scheduleId) {
        List<TaskEntity> taskList = tr.getTasksByScheduleId(scheduleId);
        float total = taskList.size();
        float finished = 1;
        for (TaskEntity te : taskList) {
            if (te.getStatus() == StatusEnum.ABORT || te.getStatus() == StatusEnum.COMPLETE)
                finished += 1;
        }
        return finished / total;
    }

    @Override
    public TaskEntity add(TaskEntity t) throws Exception {
        // TODO 自动生成的方法存根
        t.setStatus(StatusEnum.MAKE);
        return super.add(t);
    }

    //删除计划模板任务
    @Transactional
    public String delUniScheduleTask(long id){
//        tr.delUniScheduleTask(id);
        //删除关系图中的关系
        return workflowService.delTask(id);
    }

    //删除计划任务
    @Transactional
    public String delScheduleTask(long id){
        //            tr.delById(id);
        //删除关系图中的关系
        return workflowService.delTask(id);
    }

    //添加计划模板任务
    public TaskEntity addUniScheudleTask(TaskEntity t) throws Exception {
        // TODO 自动生成的方法存根
        t.setStatus(StatusEnum.MAKE);
        return tr.addUniScheudleTask(t);
    }

    //上移下移任务
    public void moveTask(Long id, Long moveTaskId) throws UpdateException {
        // TODO Auto-generated method stub
        TaskEntity te = tr.getTaskById(id);
        Long teSort = te.getSort();
        TaskEntity moveTask = tr.getTaskById(moveTaskId);
        Long moveSort = moveTask.getSort();
        Long exchange = teSort;

        te.setSort(moveSort);
        moveTask.setSort(exchange);

        tr.updateLevelTask(te);
        ;
        tr.updateLevelTask(moveTask);
    }


    //修改计划模板任务
    public TaskEntity updateUniTask(TaskEntity te) throws UpdateException {
        return tr.updateUniScheduleTask(te);
    }

    public TaskEntity getUniScheduleTaskById(Long id) {
        // TODO Auto-generated method stub
        return tr.getUniScheduleTaskById(id);
    }


    //删除计划的层级任务
    public String delLevelTask(TaskEntity te, List<Long> childrenList) throws DeleteException, UpdateException {
        // TODO Auto-generated method stub
        Long delParent = te.getParent();
        List<TaskEntity> childrenEntityList = new ArrayList<>();
        for (Long l : childrenList) {
            childrenEntityList.add(tr.getById(l));
        }
        for (TaskEntity t : childrenEntityList) {
            t.setParent(delParent);
            tr.updateLevelTask(t);
        }
        return delScheduleTask(te.getId());
    }

    //删除计划模板的层级任务
    public String delUniLevelTask(TaskEntity te, List<Long> childrenList) throws DeleteException, UpdateException {
        // TODO Auto-generated method stub
        Long delParent = te.getParent();
        List<TaskEntity> childrenEntityList = new ArrayList<>();
        for (Long l : childrenList) {
            childrenEntityList.add(tr.getUniScheduleTaskById(l));
        }

        for (TaskEntity t : childrenEntityList) {
            t.setParent(delParent);
            tr.updateLevelTask(t);
        }
        return delUniScheduleTask(te.getId());
    }

    public TaskEntity getTaskById(Long id) {
        return tr.getTaskById(id);
    }

    //降级任务
    public void downgrade(Long id, Long prevTaskId) throws UpdateException {
        // TODO Auto-generated method stub
        TaskEntity te = tr.getTaskById(id);
        te.setParent(prevTaskId);
        tr.updateLevelTask(te);
    }

    //升级任务
    public void upgrade(Long id) throws UpdateException {
        // TODO Auto-generated method stub
        TaskEntity te = tr.getTaskById(id);
        Long parentId = te.getParent();
        TaskEntity parentTask = tr.getTaskById(parentId);
        Long parentsId = parentTask.getParent();        //父节点的父节点
        te.setParent(parentsId);
        tr.updateLevelTask(te);
    }


}
