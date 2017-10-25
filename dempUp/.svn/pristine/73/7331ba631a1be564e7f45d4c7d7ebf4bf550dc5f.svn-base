package org.iothust.dao.repository;

import java.sql.Date;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.iothust.dao.entity.DataEntity;
import org.iothust.dao.entity.ScheduleEntity;
import org.iothust.dao.entity.TaskEntity;
import org.iothust.dao.mapper.DataMapper;
import org.iothust.dao.mapper.ScheduleMapper;
import org.iothust.dao.mapper.TaskMapper;
import org.iothust.exception.AddException;
import org.iothust.exception.DeleteException;
import org.iothust.exception.UpdateException;
import org.iothust.service.ScheduleWorkflowService;
import org.iothust.tools.CheckTool;
import org.iothust.tools.TimeTool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRED)
public class ScheduleRepository implements BaseRepository<ScheduleEntity> {
    @Autowired
    private ScheduleMapper sm;
    @Autowired
    private TaskRepository tr;
    @Autowired
    private DataMapper dm;
    @Autowired
    private TaskMapper tm;

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public ScheduleEntity getById(long id) {
        // TODO 自动生成的方法存根
        return sm.getById(id);
    }

    @Override
    public ScheduleEntity update(ScheduleEntity se) throws UpdateException {
        if (sm.update(se) == 0)
            throw new UpdateException();
        return se;
    }

    @Override
    public ScheduleEntity add(ScheduleEntity se) throws AddException {
        // TODO 自动生成的方法存根
        se.setId(null);
        if (sm.add(se) == 0)
            throw new AddException();
        return se;
    }

    @Override
    public void delById(long id) throws DeleteException {
        // TODO 自动生成的方法存根
        List<TaskEntity> taskList = tr.getTasksByScheduleId(id);
        for (TaskEntity te : taskList) {
            tr.delById(te.getId());
        }
        if (sm.delScheduleById(id) == 0)
            throw new DeleteException();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public ScheduleEntity getByProcessInstanceId(String processInstanceId) {
        return sm.getByProcessInstanceId(processInstanceId);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<ScheduleEntity> getAll() {
        return sm.getAll();
    }

    //根据搜索条件显示查询结果
    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<ScheduleEntity> getSchedulesByCondition(String keyword, String type, String status, Date start, Date end) {
        // TODO Auto-generated method stub
        return sm.getByConditions(keyword, type, status, start, end);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    public List<ScheduleEntity> getSchedulesByFilters(Map<String, Object> params) {
        return sm.getByFilters(params);
    }

}
