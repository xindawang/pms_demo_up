package org.iothust.controller;

import org.iothust.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Created by ls on 2017/7/5.
 */
@RestController
@RequestMapping(value = "ih/sources")
public class SourceController {
    @Autowired
    ScheduleService ss;

    @RequestMapping(value = "{sourceId}", method = RequestMethod.GET)
    public Map<String, Object> tempName(String category, @PathVariable Long sourceId){
        return ss.getSourceStatus(category, sourceId);
    }
}
