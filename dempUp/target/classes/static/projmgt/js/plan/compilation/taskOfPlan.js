$(function () {

    var paramList = window.location.search.substring(1).split('&');
    var scheduleId
    var scheduleStatus
    for (i in paramList) {
        var param = paramList[i]
        param = param.split('=')
        if (param[0] == 'id') scheduleId = param[1]
    }
    $.ajax({
        type: "GET",//请求方式
        url: "/ih/schedules/" + scheduleId,//地址，就是action请求路径
        async: false,
        dataType: "json",//数据类型text xml json  script  jsonp
        success: function (msg) {
            $("#code").val(msg.code);
            $("#name").val(msg.name);
            $("#state").val(msg.state);
            scheduleStatus = msg.status		//记录计划状态以备后文判断
            if (scheduleStatus!='编制中'){
            	$('#createTask').attr('disabled', true)
            	$('#editPretask').attr('disabled', true)
            }
        }
    });
    
    /*
    父节点时间调整
     */
    function adjustDate(element) {
        var parentId = element.data('parent');
        if (parentId == null)return;
        var start = element.children('td:eq(4)');
        var end = element.children('td:eq(5)');
        var parent = tasksTable.$element.find('tr[data-id="' + parentId + '"]');
        var parentStart = parent.children('td:eq(4)');
        var parentEnd = parent.children('td:eq(5)');
        if (new Date(start.text()) < new Date(parentStart.text())) parentStart.text(start.text());
        if (new Date(end.text()) > new Date(parentEnd.text())) parentEnd.text(end.text());
        adjustDate(parent)
    }

    var tasksTable = $('#tasksTable').treeTable(
        {
            url: '/ih/schedules/' + scheduleId + "/tasks",
            columns: [
                {
                    title: '序号',
                    increment: 1,
                    width: '50px'
                },
                {
                    title: '任务名称',
                    data: 'name',
                    tree: true
                },
                {
                    title: '责任人',
                    data: 'responsible.name'
                },
                {
                    title: '状态',
                    data: 'status'
                },
                {
                    title: '开始时间',
                    data: 'startTime',
                },
                {
                    title: '结束时间',
                    data: 'endTime'
                },
                {
    				title : '密级',
    				data : 'securityLevel',
    				number : { //通过number元素转换所传参数
    					'ONE' : '机密',
    					'TWO' : '秘密',
    					'THREE' : '内部',
    					'FOUR' : '公开'	
    				},
    			},
                {
                    title: '前置任务',
                    idToName:'pretask',
                },
                {
                    title: '资源列表',
                    data: 'resources'
                },
                {
                    title: '操作',
                    element: "<button  class='btn btn-primary upgrade' disabled>升级</button>" + "<button  class='btn btn-primary downgrade' disabled>降级</button>"
                    + "<button  class='btn btn-primary up' disabled>上移</button>" + "<button  class='btn btn-primary down' disabled>下移</button>"
                    + "<a class='btn btn-primary details'>查看</a>" + "<a  class='btn btn-primary reallocation'>重分配</a>"
                    + "<button  class='btn btn-primary terminate' >终止</button>" + "<button  class='btn btn-danger delete' disabled style='background:#efefef'>删除</button>"
                }
            ],
            afterDraw: function () {
                var that = this;
                //将前置任务id转换为name
                $('#tasksTable .idToName').each(function (index, element) {
                	var Ids =this.textContent
                	this.textContent=getTaskNameByTaskId(Ids)
                })              
                
                //父节点时间调整
                tasksTable.$element.find('tbody>tr').each(function () {
                    adjustDate($(this));
                });

                //升级按钮事件
                $('#tasksTable button.upgrade').each(function (index, element) {
                    var taskId = $(element).parent().parent().data('id')
                    var parent = $(element).parent().parent().data('parent')
                    $(this).click(function () {
                        if (parent != null) {
                            $.ajax({
                                url: "/ih/tasks/" + taskId + "/actions/upgrade",
                                type: "post",
                                success: function (result) {
                                    if (result == 1) {
//                                        alert("升级成功!");
                                        window.location = "taskOfPlan.html?id=" + scheduleId;
                                    }
                                    else {
                                        alert("升级失败!");
                                    }
                                }
                            });

                        } else {
                            alert('此任务为一级任务，不能升级!')
                        }

                    })
                })

                //降级按钮事件
                $('#tasksTable button.downgrade').each(function (index, element) {
                    var taskId = $(element).parent().parent().data('id')
                    var order=parseInt($($(element).parents('tr').children('td')[0]).text())        //取出本行行号
                    var parent = $(element).parent().parent().data('parent')              //本行父节点
                    //                           console.log('任务的id'+taskId)
                    $(this).click(function () {
                        if (order == 1) {
                            alert("此任务不能降级")
                        }
                        else {
                            for (var i = 0; i < order - 1; i++) {
                                var prevParent = $($(this).parent().parent().prevAll()[i]).data('parent')  //循环向前查找相同父节点的节点
                                var prevTaskId = $($(this).parent().parent().prevAll()[i]).data('id')
                                if (prevParent == parent) {
                                    $.ajax({
                                        url: "/ih/tasks/" + taskId + "/actions/downgrade",
                                        type: "post",
                                        data: {
                                            prevTaskId: prevTaskId
                                        },
                                        success: function (result) {
                                            if (result == 1) {
//                                                alert("降级成功!");
                                                window.location = "taskOfPlan.html?id=" + scheduleId;
                                            }
                                            else {
                                                alert("降级失败!");
                                            }
                                        }
                                    });

                                    break;
                                } else if (i == order - 2) {
                                    alert("此任务不能降级！")
                                }

                            }    //for循环结束
                        }     //else


                    })

                })


                //上移按钮事件
                $('#tasksTable button.up').each(function (index, element) {
                    var taskId = $(element).parent().parent().data('id')
                    var order=parseInt($($(element).parents('tr').children('td')[0]).text())
                    var parent = $(element).parent().parent().data('parent')

                    $(this).click(function () {
                        if (order == 1) {
                            alert('此为首行任务无法上移!')
                        } else {
                            for (var i = 0; i < order - 1; i++) {
                                var prevParent = $($(this).parent().parent().prevAll()[i]).data('parent')  //循环向前查找相同父节点的节点
                                var prevTaskId = $($(this).parent().parent().prevAll()[i]).data('id')
                                if (prevParent == parent) {
                                    $.ajax({
                                        url: "/ih/tasks/" + taskId + "/actions/move",
                                        type: "post",
                                        data: {
                                            moveTaskId: prevTaskId
                                        },
                                        success: function (result) {
                                            if (result == 1) {
//                                                alert("上移成功!");
                                                window.location = "taskOfPlan.html?id=" + scheduleId;
                                            }
                                            else {
                                                alert("上移失败!");
                                            }
                                        }
                                    });

                                    break;
                                } else if (i == order - 2) {
                                    alert("此任务无法上移!")
                                }
                            }    //for循环结束
                        } //else
                    })

                })

                //下移按钮事件
                $('#tasksTable button.down').each(function (index, element) {
                    var taskId = $(element).parent().parent().data('id')
                    var order=parseInt($($(element).parents('tr').children('td')[0]).text())
                    var maxorder=that.list.length
                    var parent = $(element).parent().parent().data('parent')
                    $(this).click(function () {
                        if (order == maxorder) {
                            alert('此任务不能下移！')
                        } else {
                            for (var i = 0; i < (maxorder - order); i++) {
                                var nextParent = $($(this).parent().parent().nextAll()[i]).data('parent')  //循环向前查找相同父节点的节点
                                var nextTaskId = $($(this).parent().parent().nextAll()[i]).data('id')
                                if (nextParent == parent) {
                                    $.ajax({
                                        url: "/ih/tasks/" + taskId + "/actions/move",
                                        type: "post",
                                        data: {
                                            moveTaskId: nextTaskId
                                        },
                                        success: function (result) {
                                            if (result == 1) {
//                                                alert("下移成功!");
                                                window.location = "taskOfPlan.html?id=" + scheduleId;
                                            }
                                            else {
                                                alert("下移失败!");
                                            }
                                        }
                                    });

                                    break;
                                } else if (i == (maxorder - order - 1)) {
                                    alert("此任务无法下移!")
                                }
                            }    //for循环结束
                        }//else结束
                    })

                })


                //查看按钮事件
                $('#tasksTable a.details').each(function (index, element) {
                    var taskId = $(element).parent().parent().data('id')
                    var href = '/projmgt/plan/compilation/taskDetail.html?id=' + taskId
                    $(this).attr('href', href)
                })

                //重分配按钮事件
                $('#tasksTable a.reallocation').each(function (index, element) {
                    var reallocationStatus = ["审批中", "未激活", "未接受", "进行中"];
                    var status = that.list[index].status;
                    if ($.inArray(status, reallocationStatus) != -1) {
                        var taskId = that.list[index].id
                        var href = '/projmgt/plan/compilation/taskDetail.html?id=' + taskId
                        $(this).attr('href', href)
                    }
                    else {
                        $(this).attr('disabled', "disabled");
                    }
                })

                //终止按钮事件
                $('#tasksTable button.terminate').each(function (index, element) {
                    var status = $($(element).parent().prevAll()[4]).text()
                    if (status == "进行中") {
                        var taskId = $(element).parent().parent().data('id')
                        $(this).click(function () {
                            $.ajax({
                                url: "/ih/task/" + taskId + "/actions/abort",
                                type: "post",
                                success: function (result) {
                                    if (result == 1) {
//                                        alert("终止成功!");
                                        window.location = "taskOfPlan.html?id=" + scheduleId;
                                    }
                                    else {
                                        alert("终止失败!");
                                    }
                                }
                            });

                        })
                    }
                    else {
                        $(this).attr('disabled', "disabled");
                    }
                })

                //删除按钮，包含状态判断，及删除提示
                $('#tasksTable button.delete').each(function (index, element) {
                    if (scheduleStatus == "编制中") {
                        var delTaskId = $(element).parent().parent().data('id')
                        var delTaskName = $($(element).parents('tr').children('td')[1]).text()
                        var delTaskParent = $(element).parent().parent().data('parent')
                        var order=parseInt($($(element).parents('tr').children('td')[0]).text())
                        var maxorder=that.list.length
                        $(this).click(function () {
                            var that = this
                            $(this).attr('data-toggle', "modal")
                            $(this).attr('data-target', "#myModal")
                            $("#confirmDeleteInfo").text("是否确认删除" + delTaskName + "？")
                            $("#confirmDelete").click(function () {
                                var parentList = new Array()
                                parentList.push(delTaskParent)
                                var thisParent = delTaskParent
                                for (var i = 0; i < order - 1; i++) {          //向上遍历查找父节点的集合
                                    var prevParent = $($(that).parent().parent().prevAll()[i]).data('parent')  //循环向前查找父节点集合
                                    var prevTaskId = $($(that).parent().parent().prevAll()[i]).data('id')
                                    if (delTaskParent == null) {
                                        break;
                                    }

                                    if (prevTaskId == thisParent && prevParent != null) {
                                        parentList.push(prevParent)
                                        thisParent = prevParent
                                    }

                                    if (prevParent == null) {
                                        parentList.push(prevParent)
                                        break;
                                    }

                                }    //for循环结束

                                var children = new Array()
                                for (var i = 0; i < (maxorder - order); i++) {
                                    var nextParent = $($(that).parent().parent().nextAll()[i]).data('parent')  //循环向下查找相同父节点的节点
                                    var nextTaskId = $($(that).parent().parent().nextAll()[i]).data('id')

                                    if ($.inArray(nextParent, parentList) != -1) {
                                        break;
                                    } else {
                                        if (nextParent == delTaskId) {
                                            children.push(nextTaskId)
                                        }
                                    }
                                }
                                $.ajax({
                                    url: "/ih/tasks/" + delTaskId + "?children[]=" + children,
                                    type: "delete",
                                    success: function (msg) {
                                        if (msg == "success") {
//                                            alert("删除成功!");
                                            window.location = "taskOfPlan.html?id=" + scheduleId;
                                        }
                                        else {
                                            alert(msg);
                                        }
                                    }
                                });
                            })
                        })
                    } else {
                        $(this).attr('disabled', "disabled");
                        $(this).attr('style', "background:#ffffff")
                    }
                })
                
                if (scheduleStatus=='编制中'){
                	$('.upgrade').attr('disabled', false)
                	$('.downgrade').attr('disabled', false)
                	$('.up').attr('disabled', false)
                	$('.down').attr('disabled', false)
                	$('.delete').attr('disabled', false)
                	$('.delete').attr('style', 'background:#ffffff')
                }
            }
        })


    $('#createTask').click(function () {
        if (scheduleStatus == "编制中") {
            window.location = "createTask.html?id=" + scheduleId;
        } else {
            alert("此计划状态不可创建任务！");
        }
    })


    $('#returnToPlan').click(function () {
        window.location = "planDetail.html?id=" + scheduleId;
    })

    $('#returnToPlanOverview').click(function () {
        window.location = "planOverview.html";
    })
    
    $('#editPretask').click(function () {
    	$('#cancelEditPretask').attr('disabled', false)
    	$('#savePretask').attr('disabled', false)
    	
    	var eachRow = $('#tasksTable tr').each(function (index, element) {
    		//除去第一行
    		if (index!=0){   			
    			//获取前置资源一列
	    		var eachPretask=$(this).children()[7]
	    		//保存并清空原有text
	    		var eachPretaskName = $(this).children()[7].textContent
	    		$(this).children()[7].textContent=""
	    		var select = document.createElement('select');
				select.setAttribute('class', 'show-tick')
				select.setAttribute('class', 'form-control')
				select.setAttribute('multiple', 'true')		
				select.setAttribute('class', 'selectpicker')
				select.setAttribute('id', 'tmpId')
				
				
				for (var i in tasksTable.options.list){
					var otherTaskId =tasksTable.options.list[i].id;
					var name =tasksTable.options.list[i].name;
					var thisTaskId=$(this).data('id')
					if (otherTaskId!=thisTaskId){
						select.options.add(new Option(name,otherTaskId));
					}
				}
				eachPretask.appendChild(select)
				if (eachPretaskName!=""){
					var taskNameString = getTaskIdByTaskName(eachPretaskName)
					if (taskNameString!=""){
						var taskNames = taskNameString.split(",");
						var aa = $('#qqq')
						$('#tmpId').selectpicker('val', taskNames);
				 	}			   
				}else{
					$('#tmpId').selectpicker('val', '');
				}
				select.setAttribute('id', '')
	    	}
    	});
    	
		$('select').selectpicker({
			style : 'btn-info',
			size : 10,
			width : '100px'
		});

        $('.selectpicker').on('changed.bs.select',function (e) {
            var pretask = "";
            for (var i = 0; i < this.options.length; i++) {
                if (this.options[i].selected) {
                    if (pretask == "") {
                        pretask = this.options[i].value;
                    } else {
                        pretask = pretask + "," + this.options[i].value;
                    }
                }
            }
            var $tr=$(this).parents('tr');
            var id=$tr.data('id');
            tasksTable.updateListItem(id,'pretask',pretask);
        })
		
    })
    
    
    function getTaskIdByTaskName(taskNames){
    	var taskNamesArray = taskNames.split(",");
    	var taskIdString = ""
    	for (var eachTaskName in taskNamesArray){
    		for (var i in tasksTable.options.list){
    			var taskId =tasksTable.options.list[i].id;
    			var thisName =tasksTable.options.list[i].name;
    			if (thisName==taskNamesArray[eachTaskName]){
    				if (taskIdString==""){
    					taskIdString+=taskId
    				}else{
    					taskIdString+=","+taskId
    				}  				
    			}
    		}
    	}   	
    	return taskIdString
    }
    
    function getTaskNameByTaskId(taskIds){
    	var taskIdsArray = taskIds.split(",");
    	var taskNameString = ""
    	for (var eachTaskId in taskIdsArray){
    		for (var i in tasksTable.options.list){
    			var thisId =tasksTable.options.list[i].id;
    			var taskName =tasksTable.options.list[i].name;
    			if (thisId==taskIdsArray[eachTaskId]){
    				if (taskNameString==""){
    					taskNameString+=taskName
    				}else{
    					taskNameString+=","+taskName
    				}  				
    			}
    		}
    	}   	
    	return taskNameString
    }
        
    $('#cancelEditPretask').click(function () {
    	 window.location.reload()
    })
    
    $('#savePretask').click(function () {
        $.ajax({
            type:'post',
            url:'/ih/schedules/updateTaskRela',
            contentType: "application/json; charset=utf-8",
            data:JSON.stringify(tasksTable.options.list),
            success:function (msg) {
                if(msg=='success'){
                    window.location.reload();
                }else{
                	alert(msg);
                }
            }
        })
    })


})