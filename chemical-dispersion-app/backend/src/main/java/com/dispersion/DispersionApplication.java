package com.dispersion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableScheduling
@EnableTransactionManagement
public class DispersionApplication {

    public static void main(String[] args) {
        SpringApplication.run(DispersionApplication.class, args);
        System.out.println("Chemical Dispersion Application Started Successfully");
        System.out.println("API Documentation available at: http://localhost:8080/api/swagger-ui/index.html");
    }
}