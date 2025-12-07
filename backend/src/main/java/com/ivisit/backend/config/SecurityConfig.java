package com.ivisit.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // For API + React frontend, CSRF protection via cookies is a pain; disable for now
                .csrf().disable()

                // Allow CORS so http://localhost:5173 can call http://localhost:8080
                .cors().and()

                // Authorization rules
                .authorizeRequests()
                .antMatchers("/api/**").permitAll()   // all your APIs open for now
                .anyRequest().permitAll()            // everything else open

                .and()
                .httpBasic().disable()  // no basic auth popup
                .formLogin().disable(); // no login form

        return http.build();
    }
}
