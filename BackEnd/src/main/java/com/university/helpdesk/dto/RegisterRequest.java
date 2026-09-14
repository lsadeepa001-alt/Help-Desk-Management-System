package com.university.helpdesk.dto;

import com.university.helpdesk.model.Role;

public class RegisterRequest {
    private String username;
    private String password;
    private String email;
    private String fullName;
    private Role role;
    private String department;
    private String phoneNumber;

    public RegisterRequest() {}

    public RegisterRequest(String username, String password, String email, String fullName, Role role, String department, String phoneNumber) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.department = department;
        this.phoneNumber = phoneNumber;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
}
