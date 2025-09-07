package com.dispersion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
@EnableScheduling
@EnableTransactionManagement
public class DispersionApplication {

    public static void main(String[] args) {
        SpringApplication.run(DispersionApplication.class, args);
        System.out.println("Water Chemical Dispersion Application Started Successfully");
        System.out.println("API Documentation available at: http://localhost:8080/api/swagger-ui/index.html");
    }

    // Configure async request handling for Server-Sent Events (SSE)
    @Bean
    public WebMvcConfigurer webMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
                configurer.setDefaultTimeout(60 * 60 * 1000L); // Set a long timeout for SSE connection
            }
        };
    }
}