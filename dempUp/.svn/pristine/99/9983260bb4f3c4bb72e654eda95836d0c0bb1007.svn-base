package org.iothust.controller;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import org.iothust.dao.entity.DataEntity;
import org.iothust.dao.entity.TaskEntity;
import org.iothust.dao.entity.UniversalScheduleEntity;
import org.iothust.exception.AddException;
import org.iothust.exception.DeleteException;
import org.iothust.exception.UpdateException;
import org.iothust.service.DataService;
import org.iothust.service.ScheduleWorkflowService;
import org.iothust.service.TaskService;
import org.iothust.service.UniversalScheduleService;
import org.iothust.tools.DataRelTool;
import org.iothust.tools.JsonTool;
import org.iothust.tools.StatusEnum;
import org.iothust.tools.TimeTool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.text.ParseException;
import java.util.*;

@RestController
@RequestMapping(value = "ih/universal-schedules")
public class UnivScheduleController {
    @Autowired
    private UniversalScheduleService universalScheduleService;
    @Autowired
    private TaskService ts;
    @Autowired
    private ScheduleWorkflowService workflowService;
    @Autowired
    private DataService ds;

    @RequestMapping(value = "{schedule_id}/data", method = RequestMethod.GET)
    public String getData(@PathVariable String schedule_id) {
        DataEntity de = new DataEntity();
        de.setRelId(Long.valueOf(schedule_id));
        DataRelTool dr = new DataRelTool("universalSchedule");
        de.setRelTable(dr.getRelTable());
        de.setRelName(dr.getRelName());

        List<DataEntity> list = ds.getData(de);
        int total = list.size();
        Map<String, Object> result = new HashMap<>();
        result.put("list", list);
        result.put("total", total);
        return JsonTool.objectToJson(result);
    }

    @RequestMapping(value = "", method = RequestMethod.GET)
    public String getAllUniversalSchedules(int pageSize, int page) {
        PageHelper.startPage(page, pageSize);
        List<UniversalScheduleEntity> schedules = universalScheduleService.getAll();
        long totalItems = ((Page<UniversalScheduleEntity>) schedules).getTotal();
        Map<String, Object> result = new HashMap<>();
        result.put("list", schedules);
        result.put("total", totalItems);
        return JsonTool.objectToJson(result);
    }

    @RequestMapping(value = "univPretask", method = RequestMethod.POST)
    public String updateUniverSchedulePreTask(@RequestBody List<Map<String, Object>> list) {
        try {
            String s=workflowService.updatePreTask(list);
            return s;
        } catch (NumberFormatException e) {
            e.printStackTrace();
            return "service error!";
        }
    }


    @RequestMapping(value = "", method = RequestMethod.POST)
    public String addSchedule(HttpServletRequest request) {
        UniversalScheduleEntity use = new UniversalScheduleEntity();
        use.setName(request.getParameter("name"));
        use.setState(request.getParameter("state"));
        if (workflowService.initUniSchedule(use) == 0) {
            return "universalScheduleService error!";
        }
        return "success";
    }

    @RequestMapping(value = "{schedule_id}", method = RequestMethod.DELETE)
    public int delScheduleById(@PathVariable Long schedule_id) {
        try {
            if (universalScheduleService.delById(schedule_id) == 1)
                return 1;
        } catch (DeleteException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        return 0;
    }

    @RequestMapping(value = "{schedule_id}", method = RequestMethod.GET)
    public String getScheduleById(@PathVariable Long schedule_id) {
        return JsonTool.objectToJson(universalScheduleService.getScheduleById(schedule_id));
    }

    // 为计划模板创建任务
    @RequestMapping(value = "task", method = RequestMethod.POST)
    public String addUniScheduleTask(HttpServletRequest request) {
        TaskEntity te = new TaskEntity();
        try {
            te.setUnivScheduleId(Long.valueOf(request.getParameter("uniSchedule")));

            te.setName(request.getParameter("name"));
            te.setState(request.getParameter("state"));
            te.setStartTime(TimeTool.stringToSqlDate("1971-1-1"));

            Calendar c = Calendar.getInstance();
            c.setTime(te.getStartTime());
            c.add(Calendar.DAY_OF_MONTH, Integer.valueOf(request.getParameter("duration")));
            int endTimeYear = c.get(Calendar.YEAR);
            int endTimeMonth = c.get(Calendar.MONTH) + 1;
            int endTimeDay = c.get(Calendar.DAY_OF_MONTH);
            String endTime = endTimeYear + "-" + endTimeMonth + "-" + endTimeDay;
            te.setEndTime(TimeTool.stringToSqlDate(endTime));

            te.setSecurityLevel(Integer.valueOf(request.getParameter("securityLevel")));
            te.setPriority(Integer.valueOf(request.getParameter("priority")));
            te.setResponsibleId(Long.valueOf(request.getParameter("responsible")));
            te.setMilestone(Integer.valueOf(request.getParameter("milestone")));
            te.setResources(request.getParameter("resources"));
            te.setForm(request.getParameter("form"));
            te.setParent(null);
            if (request.getParameter("univTaskId") != null && request.getParameter("univTaskBaseId") != null) {
                te.setUniversalTask(request.getParameter("univTaskId"));
                te.setUniversalTaskBase(request.getParameter("univTaskBaseId"));
            }
        } catch (ParseException e) {
            e.printStackTrace();
        }

        try {
            workflowService.addTaskToUniSchedule(te);
//				ts.addUniScheudleTask(te);
            return "success";
        } catch (AddException e) {
            e.printStackTrace();
            return "addUniScheudleTask error!";
        } catch (Exception e) {
            e.printStackTrace();
            return "error";
        }
    }

    // 获取计划模板下的任务
    @RequestMapping(value = "{schedule_id}/tasks", method = RequestMethod.GET)
    public String getTasksByUniScheduleId(@PathVariable Long schedule_id) {
        List<TaskEntity> listTask = ts.getTasksByUnivScheduleId(schedule_id);
        List<Map<String, Object>> list = new ArrayList<>();
        for (TaskEntity t : listTask) {
            String preTaskId = workflowService.getUniPreTaskId(t);
            Map<String, Object> mapList = new HashMap<>();
            mapList.put("duration", t.getDuration());
            mapList.put("endTime", t.getEndTime());
            mapList.put("form", t.getForm());
            mapList.put("id", t.getId());
            mapList.put("milestone", t.getMilestone());
            mapList.put("name", t.getName());
            mapList.put("parent", t.getParent());
            mapList.put("pretask", preTaskId);
            mapList.put("priority", t.getPriority());
            mapList.put("resources", t.getResources());
            mapList.put("responsible", t.getResponsible());
            mapList.put("responsibleId", t.getResponsibleId());
            mapList.put("schedule", t.getSchedule());
            mapList.put("scheduleId", t.getScheduleId());
            mapList.put("securityLevel", t.getSecurityLevel());
            mapList.put("sort", t.getSort());
            mapList.put("startTime", t.getStartTime());
            mapList.put("state", t.getState());
            mapList.put("status", t.getStatus());
            mapList.put("univScheduleId", t.getUnivScheduleId());
            mapList.put("universalTask", t.getUniversalTask());
            mapList.put("universalTaskBase", t.getUniversalTaskBase());
            list.add(mapList);
        }
        int total = list.size();
        Map<String, Object> map = new HashMap<>();
        map.put("total", total);
        map.put("list", list);
        return JsonTool.objectToJson(map);
    }

    //删除计划模板的层级任务
    @RequestMapping(value = "task", method = RequestMethod.DELETE)
    public String delUniLevelTask(HttpServletRequest request) {
        Long delTaskId = Long.valueOf(request.getParameter("id"));
        TaskEntity te = ts.getTaskById(delTaskId);
        if (te.getStatus() != StatusEnum.MAKE)
            return "删除失败！";
        String taskChildren = request.getParameter("children[]");
        List<Long> childrenList = new ArrayList<>();
        if (taskChildren == null || taskChildren.isEmpty()) {
            return ts.delUniScheduleTask(delTaskId);
        } else {
            String[] taskchild = taskChildren.split(",");
            for (int i = 0; i < taskchild.length; i++)
                childrenList.add(Long.valueOf(taskchild[i]));
            try {
                return ts.delUniLevelTask(te, childrenList);
            } catch (DeleteException | UpdateException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
                return "删除失败！";
            }
        }
    }

    // 降级计划模板任务
    @RequestMapping(value = "{task_id}/actions/downgrade", method = RequestMethod.POST)
    public int downgradeUniTask(@PathVariable Long task_id, Long prevTaskId) {
        TaskEntity te = ts.getTaskById(task_id);
        if (te.getStatus() != StatusEnum.MAKE)
            return 0;
        try {
            ts.downgrade(task_id, prevTaskId);
            ;
            return 1;
        } catch (UpdateException e) {
            return 0;
        }
    }

    // 升级计划模板任务
    @RequestMapping(value = "{task_id}/actions/upgrade", method = RequestMethod.POST)
    public int upgradeUniTask(@PathVariable Long task_id) {
        TaskEntity te = ts.getTaskById(task_id);
        if (te.getStatus() != StatusEnum.MAKE)
            return 0;
        try {
            ts.upgrade(task_id);
            return 1;
        } catch (UpdateException e) {
            return 0;
        }
    }

    // 上移下移计划模板任务
    @RequestMapping(value = "{task_id}/actions/move", method = RequestMethod.POST)
    public int moveUniTask(@PathVariable Long task_id, Long moveTaskId) {
        TaskEntity te = ts.getTaskById(task_id);
        if (te.getStatus() != StatusEnum.MAKE)
            return 0;
        try {
            ts.moveTask(task_id, moveTaskId);
            return 1;
        } catch (UpdateException e) {
            return 0;
        }
    }
}
