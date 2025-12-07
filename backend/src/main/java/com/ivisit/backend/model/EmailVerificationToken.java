package com.ivisit.backend.model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String token;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private UserAccount user;

    @Column(nullable = false)
    private Timestamp expiresAt;

    @Column(nullable = false)
    private Boolean used = false;

    @Column(nullable = false)
    private Timestamp createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = new Timestamp(System.currentTimeMillis());
        }
        if (used == null) {
            used = false;
        }
    }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }
    public void setToken(String token) {
        this.token = token;
    }

    public UserAccount getUser() {
        return user;
    }
    public void setUser(UserAccount user) {
        this.user = user;
    }

    public Timestamp getExpiresAt() {
        return expiresAt;
    }
    public void setExpiresAt(Timestamp expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Boolean getUsed() {
        return used;
    }
    public void setUsed(Boolean used) {
        this.used = used;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
}
