package com.ivisit.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // This matches VisitorService: UPLOAD_DIR = "uploads/"
        Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
        String uploadPath = uploadDir.toUri().toString();  // e.g. "file:/.../backend/uploads/"

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath);
    }
}
