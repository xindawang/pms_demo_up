package org.iothust.controller;

import org.iothust.dao.entity.UserEntity;
import org.iothust.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpSession;

@RestController
@RequestMapping(value = "ih/sessions")
public class SessionsController {

	@Autowired
	private UserService us;

	@RequestMapping(value = "", method = RequestMethod.GET)
	public UserEntity setSessions(HttpSession session, @RequestParam Long custId) {
		UserEntity user = us.getUserCorp(custId);
		if (user != null) {
			System.out.println("登录session设置");
			session.setAttribute("custId", custId);
		}
		return user;
	}
	
	@RequestMapping(value = "remove", method = RequestMethod.GET)
	public String removeSession(HttpSession session){
		session.removeAttribute("custId");
		return "success";
	}
}
