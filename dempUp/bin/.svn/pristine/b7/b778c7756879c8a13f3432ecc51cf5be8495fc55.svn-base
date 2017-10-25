package org.iothust.service;

import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.iothust.dao.entity.DataEntity;
import org.iothust.dao.entity.ScheduleEntity;
import org.iothust.dao.entity.TaskEntity;
import org.iothust.dao.mapper.DataMapper;
import org.iothust.dao.mapper.TaskMapper;
import org.iothust.dao.repository.ScheduleRepository;
import org.iothust.dao.repository.TaskRepository;
import org.iothust.exception.AddException;
import org.iothust.tools.CheckTool;
import org.iothust.tools.StatusEnum;
import org.iothust.tools.TimeTool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService extends SortService<ScheduleEntity> {
    @Autowired
    private ScheduleRepository sr;
    @Autowired
    private TaskRepository tr;
    @Autowired
    private ScheduleWorkflowService workflowService;
    @Autowired
    private TaskMapper tm;
    @Autowired
    private DataMapper dm;

    public ScheduleEntity getByProcessInstanceId(String processInstanceId) {
        return sr.getByProcessInstanceId(processInstanceId);
    }

    public List<ScheduleEntity> getAll() {
        return sr.getAll();
    }

    @Override
    public ScheduleEntity add(ScheduleEntity t) throws Exception {
        // TODO 自动生成的方法存根
        t.setStatus(StatusEnum.MAKE);
        super.add(t);
        workflowService.startScheduleProcess(t);
        return t;
    }

    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public ScheduleEntity addScheduleTransact(ScheduleEntity schedule) throws Exception {
        schedule.setStatus(StatusEnum.MAKE);
        sr.add(schedule);
        workflowService.initSchedule(schedule);
        Long universalScheduleId = schedule.getUniversalSchedule();
        if (schedule.getUniversalSchedule() != null) {
            addRelTaskAndData(schedule, universalScheduleId, schedule.getResponsibleId(), schedule.getStartTime());
        }
        workflowService.startScheduleProcess(schedule);
        return schedule;
    }

    //根据搜索条件显示计划列表
    public List<ScheduleEntity> getSchedulesByCondition(String keyWord, String searchType, String scheduleStatus,
                                                        Date searchStartTime, Date searchEndTime) {
        // TODO Auto-generated method stub
        return sr.getSchedulesByCondition(keyWord, searchType, scheduleStatus, searchStartTime, searchEndTime);
    }

    //获取计划的完整进度信息
    public Map<String, Object> getScheduleProgressInfo(Long scheduleId) {

        Map<String, Object> result = new HashMap<>();
        List<Map> allTasksInfo = new ArrayList<>();
        ScheduleEntity schedule = sr.getById(scheduleId);
        List<TaskEntity> taskEntityList = tr.getTasksByScheduleId(scheduleId);
        for (TaskEntity task : taskEntityList) {
            Map<String, Object> info = new HashMap<>();
            info.put("taskName", task.getName());
            info.put("isFinished", task.getStatus() == StatusEnum.COMPLETE);
            allTasksInfo.add(info);
        }
        result.put("scheduleId", schedule.getId());
        result.put("sourceId", schedule.getSourceId());
        result.put("category", schedule.getCategory());
        result.put("tasks", allTasksInfo);
        return result;
    }

    //根据条件搜索列表信息
    public List<ScheduleEntity> getSchedulesByFilters(Map<String, Object> params) {
        return sr.getSchedulesByFilters(params);
    }

    public Map<String, Object> getSourceStatus(String category, Long sourceId) {
        Map<String, Object> param = new HashMap<String, Object>();
        Map<String, Object> result = new HashMap<String, Object>();
        param.put("category", category);
        param.put("source_id", sourceId);

        List<ScheduleEntity> temp = getSchedulesByFilters(param);

        for (ScheduleEntity t : temp) {
            //此任务状态非完成，进行下一步判断
            if (t.getStatus() != StatusEnum.COMPLETE) {
                //是否终止
                if (t.getStatus() == StatusEnum.ABORT) {
                    //若终止直接返回
                    result.put(sourceId.toString(), "已终止");
                    return result;
                } else {
                    result.put(sourceId.toString(), "履约中");
                    return result;
                }
            }
        }

        result.put(sourceId.toString(), "已完成");

        return result;
    }

    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public boolean addRelTaskAndData(ScheduleEntity schedule, Long univScheduleId, Long responsibleId, Date startTime) throws Exception {
        Long scheduleId = schedule.getId();
        List<Long> sdataIdList = dm.getUniversalScheduleData(univScheduleId);    //获取计划模板数据表
        for (Long sdl : sdataIdList) {
            DataEntity de = dm.getDataById(sdl);                    //获取计划模板数据
            de.setId(null);
            de.setSort(null);
            if (de.getInput_output() == null) {
                de.setInput_output("");
            }
            if (dm.addData(de) == 0)                                        //插入新数据
                throw new AddException();
            dm.addScheduleData(scheduleId, de.getId());                        //在数据关系表中建立联系
        }

        HashMap<Long, Long> taskIdOldToNew = new HashMap<Long, Long>();            //用于处理层级关系
        List<Long> taskIdList = tm.getUniversalScheduleTask(univScheduleId);    //获取计划模板任务
        for (Long tl : taskIdList) {                                            //复制计划模板任务
            TaskEntity te = tm.getUniScheduleTaskById(tl);
            te.setId(null);
            te.setSort(null);
            te.setScheduleId(scheduleId);
            te.setResponsibleId(responsibleId);
            int duration = (int) ((te.getEndTime().getTime() - te.getStartTime().getTime()) / (1000 * 3600 * 24));
            String startTimeStable = startTime.toString();
            te.setStartTime(TimeTool.stringToSqlDate(startTimeStable));
            te.setEndTime(getEndTimeTool(startTime, duration));

            if (tm.addTask(te) == 0)
                throw new AddException();
            if (tm.addScheduleTask(te) == 0)                                //在计划关系表中建立联系
                throw new AddException();
            taskIdOldToNew.put(tl, te.getId());                                //建立任务新旧id映射

//			计划模板的任务数据的获取与复制
            List<Long> tdataIdList = dm.getTaskData(tl);
            HashMap<Long, Long> dataIdOldToNew = new HashMap<Long, Long>();            //用于处理层级关系
            for (Long tdl : tdataIdList) {
                DataEntity de = dm.getDataById(tdl);
                de.setId(null);
                if (dm.addData(de) == 0)
                    throw new AddException();
                if (dm.addTaskData(te.getId(), de.getId()) == 0)
                    throw new AddException();
                dataIdOldToNew.put(tdl, de.getId());
            }
            //对任务数据的父节点id进行修改
            for (Long newDataId : dataIdOldToNew.values()) {
                Long oldDataParentId = dm.getParentId(newDataId);        //获取之前插入时未改变的父级id
                if (oldDataParentId != null) {
                    Long newParentId = dataIdOldToNew.get(oldDataParentId);
                    dm.updateParentId(newDataId, newParentId);//修改为新的父级id
                }
            }
        }

        //复制任务关系
        List<TaskEntity> taskEntityList = tm.getByScheduleId(scheduleId);
        List<Map<String, Object>> noPreTaskList = new ArrayList<>();
        List<Map<String, Object>> withPreTaskList = new ArrayList<>();
        List<TaskEntity> uniTaskEntityList = tm.getByUnivScheduleId(univScheduleId);

        for (TaskEntity ut : uniTaskEntityList) {
            Map<String, Object> noPre = new HashMap<>();
            Map<String, Object> withPre = new HashMap<>();
            String uniPreTaskId = workflowService.getUniPreTaskId(ut);
            if (CheckTool.stringIsNull(uniPreTaskId)) {
                for (TaskEntity t : taskEntityList) {
                    if (t.getName().equals(ut.getName())) {
                        noPre.put("id", t.getId());
                        break;
                    }
                }
                noPreTaskList.add(noPre);
            } else {
                //解析id
                List<Long> uniPreTaskIds = workflowService.splitPreTaskId(uniPreTaskId);
                String preTask = "";
                for (Long uniPre : uniPreTaskIds) {
                    for (TaskEntity t : taskEntityList) {
                        if (t.getName().equals(tm.getUniScheduleTaskById(uniPre).getName())) {
                            if (CheckTool.stringIsNull(preTask)) {
                                preTask = Long.toString(t.getId());
                            } else {
                                preTask = preTask + "," + Long.toString(t.getId());
                            }
                            break;
                        }
                    }
                }
                //保存
                for (TaskEntity t : taskEntityList) {
                    if (t.getName().equals(ut.getName())) {
                        withPre.put("id", t.getId());
                        withPre.put("pretask", preTask);
                        break;
                    }
                }
                withPreTaskList.add(withPre);
            }
        }
        workflowService.updateTaskRel("S" + schedule.getName(), taskEntityList, noPreTaskList, withPreTaskList);


        //对任务的父节点进行修改
        for (Long newTaskId : taskIdOldToNew.values()) {
            Long oldTaskParentId = tm.getParentId(newTaskId);        //获取之前插入时未改变的父级id
            if (oldTaskParentId != null) {
                tm.updateParentId(newTaskId, taskIdOldToNew.get(oldTaskParentId));//修改为新的父级id
            }
        }
        return true;
    }

    //根据工期计算结束时间
    @SuppressWarnings("deprecation")
    private Date getEndTimeTool(Date startTime, int duration) {
        int rest = duration;
        Date nextDay = startTime;
        nextDay.setDate(nextDay.getDate() + 1);
        while (rest > 1) {
            if (isWorkday(nextDay)) {
                rest--;
            }
            nextDay.setDate(nextDay.getDate() + 1);
        }
        return nextDay;
    }

    public boolean isWorkday(Date nextDay) {
        @SuppressWarnings("deprecation")
        int day = nextDay.getDay();
        if (day == 0 || day == 6) {
            return false;
        } else {
            return true;
        }
    }
}
