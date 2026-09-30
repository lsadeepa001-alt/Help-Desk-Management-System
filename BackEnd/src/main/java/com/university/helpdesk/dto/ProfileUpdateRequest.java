package com.university.helpdesk.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ProfileUpdateRequest {

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phoneNumber;

    // Retained for backward-compatibility with client payloads; strictly ignored by controller
    private String fullName;
    private String email;
    private String department;

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}
