package org.iothust.service;

import java.util.ArrayList;
import java.util.List;

import org.activiti.engine.RepositoryService;
import org.activiti.engine.repository.Deployment;
import org.iothust.dao.entity.DataEntity;
import org.iothust.dao.entity.TaskEntity;
import org.iothust.dao.entity.UniversalScheduleEntity;
import org.iothust.dao.mapper.UniversalScheduleMapper;
import org.iothust.dao.repository.TaskRepository;
import org.iothust.exception.DeleteException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(rollbackFor = Exception.class)
public class UniversalScheduleService {
	@Autowired
	private UniversalScheduleMapper universalScheduleMapper;
	@Autowired
	private ScheduleWorkflowService workflowService;
	@Autowired
	private RepositoryService rs;
	@Autowired
	private TaskRepository tr;
	@Autowired
	private DataService ds;
	
	public List<UniversalScheduleEntity> getAll() {
		return universalScheduleMapper.getAll();
	}

	@Transactional
	public int add(UniversalScheduleEntity use) {
//		if (CheckTool.stringIsNull(use.getName()) || universalScheduleMapper.getByName(use.getName()) != null)
//			return 0;
		return universalScheduleMapper.add(use);
	}

	public int delById(Long id) throws DeleteException{
		List<TaskEntity> taskList=tr.getTasksByUnivScheduleId(id);//计划模板的任务
	    List<Long> taskIdList=new ArrayList<>();
	    List<Long> dataIdList=ds.getUniversalScheduleData(id);//计划模板的数据
	    for(TaskEntity te:taskList){
	    	taskIdList.add(te.getId());
	    }
	    
       try {
	   	    for(Long l:taskIdList){
					tr.delUniScheduleTask(l);
		    }			
			} catch (DeleteException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
				throw new DeleteException();
			}           //删除计划模板的任务

	   
    	try {
    	    for(Long l:dataIdList){
    	    	DataEntity de=ds.getDataById(l);
    	    	de.setRelName("schedule_id");
    	    	de.setRelTable("universal_schedule_data");
			   ds.delDataById(de);
    	    }  
		} catch (DeleteException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			throw new DeleteException();
		}          //删除计划模板的数据

		//删除工作流中关系图
		try {
			Deployment deployment = workflowService.getDeployment("UniS" + getScheduleById(id).getName());
			rs.deleteDeployment(deployment.getId());
		} catch (Exception e) {
			e.printStackTrace();
		}

		universalScheduleMapper.delById(id);
	     
	     return 1;
	}
	
	@Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
	public UniversalScheduleEntity getScheduleById(long id) {
		return universalScheduleMapper.getScheduleById(id);
	}
}
