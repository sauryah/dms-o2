#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <time.h>
#include <unistd.h>
#include "config.h"
#include "modbus_client.h"
#include "redis_publisher.h"

static volatile sig_atomic_t g_running = 1;

static void handle_signal(int sig) {
    (void)sig;
    g_running = 0;
}

static void sleep_ms(int ms) {
    struct timespec ts;
    ts.tv_sec = ms / 1000;
    ts.tv_nsec = (ms % 1000) * 1000000L;
    nanosleep(&ts, NULL);
}

int main(int argc, char **argv) {
    (void)argc;
    (void)argv;

    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);

    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    printf("====================================================\n");
    printf("  DMS-O2 Industrial Edge Telemetry Gateway Daemon\n");
    printf("====================================================\n");

    gateway_config_t config;
    config_init_defaults(&config);
    config_load_env(&config);
    config_print(&config);

    modbus_client_t *modbus = modbus_client_create(config.plc_host, config.plc_port, config.modbus_slave_id);
    if (!modbus) {
        fprintf(stderr, "[FATAL] Unable to initialize Modbus client context\n");
        return 1;
    }

    redis_publisher_t *redis = redis_publisher_create(config.redis_host, config.redis_port, config.redis_channel);
    if (!redis) {
        fprintf(stderr, "[FATAL] Unable to initialize Redis publisher context\n");
        modbus_client_destroy(modbus);
        return 1;
    }

    printf("[GATEWAY] Ingestion loop starting (poll interval: %d ms)...\n", config.poll_interval_ms);

    unsigned long packet_count = 0;
    while (g_running) {
        // Ensure Modbus connection
        if (!modbus->is_connected) {
            if (!modbus_client_connect(modbus)) {
                printf("[GATEWAY] Retrying PLC connection in 2 seconds...\n");
                sleep_ms(2000);
                continue;
            }
        }

        // Ensure Redis connection
        if (!redis->is_connected) {
            if (!redis_publisher_connect(redis)) {
                printf("[GATEWAY] Retrying Redis connection in 2 seconds...\n");
                sleep_ms(2000);
                continue;
            }
        }

        machine_telemetry_t data;
        if (modbus_client_read_telemetry(modbus, &data)) {
            if (redis_publisher_publish(redis, config.machine_id, &data)) {
                packet_count++;
                if (packet_count % 10 == 0 || packet_count == 1) {
                    printf("[TELEMETRY #%lu] %s -> Speed: %.1f m/min | Tension: %.1f N | Temp: %.1f C | Dia: %.4f mm | Power: %.1f kW\n",
                           packet_count, config.machine_id, data.speed_mpm, data.tension_n,
                           data.lube_temp_c, data.actual_dia_mm, data.motor_power_kw);
                }
            } else {
                fprintf(stderr, "[GATEWAY] Failed to publish telemetry to Redis\n");
            }
        }

        sleep_ms(config.poll_interval_ms);
    }

    printf("\n[GATEWAY] Shutdown signal caught. Cleaning up resources...\n");
    modbus_client_destroy(modbus);
    redis_publisher_destroy(redis);

    printf("[GATEWAY] Exited gracefully. Total telemetry packets streamed: %lu\n", packet_count);
    return 0;
}
