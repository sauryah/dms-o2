#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <time.h>
#include <math.h>
#include <unistd.h>
#include <errno.h>
#include <modbus.h>

static volatile sig_atomic_t g_running = 1;

static void handle_signal(int sig) {
    (void)sig;
    g_running = 0;
}

int main(int argc, char **argv) {
    (void)argc;
    (void)argv;

    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    int port = 1502;
    const char *port_env = getenv("PLC_PORT");
    if (port_env) {
        int p = atoi(port_env);
        if (p > 0 && p < 65536) port = p;
    }

    printf("====================================================\n");
    printf("  DMS-O2 Software Modbus PLC Simulator (Port %d)\n", port);
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);

    modbus_t *ctx = modbus_new_tcp(NULL, port);
    if (!ctx) {
        fprintf(stderr, "[PLC-SIM] Failed to create Modbus TCP context\n");
        return 1;
    }

    modbus_mapping_t *mb_mapping = modbus_mapping_new(0, 0, 10, 0);
    if (!mb_mapping) {
        fprintf(stderr, "[PLC-SIM] Failed to allocate Modbus mapping\n");
        modbus_free(ctx);
        return 1;
    }

    // Initialize baseline holding registers
    mb_mapping->tab_registers[0] = 8500; // 850.0 m/min
    mb_mapping->tab_registers[1] = 1420; // 142.0 N
    mb_mapping->tab_registers[2] = 485;  // 48.5 deg C
    mb_mapping->tab_registers[3] = 621;  // 0.621 mm
    mb_mapping->tab_registers[4] = 285;  // 28.5 kW

    int server_socket = modbus_tcp_listen(ctx, 5);
    if (server_socket == -1) {
        fprintf(stderr, "[PLC-SIM] Failed to listen on socket: %s\n", modbus_strerror(errno));
        modbus_mapping_free(mb_mapping);
        modbus_free(ctx);
        return 1;
    }

    printf("[PLC-SIM] Listening for edge gateway connections on port %d...\n", port);

    double sim_time = 0.0;

    while (g_running) {
        int s_listen = server_socket;
        int client_socket = modbus_tcp_accept(ctx, &s_listen);
        if (client_socket == -1) {
            if (!g_running) break;
            continue;
        }

        printf("[PLC-SIM] Edge gateway connected! Serving live machine telemetry...\n");

        while (g_running) {
            uint8_t query[MODBUS_TCP_MAX_ADU_LENGTH];
            int rc = modbus_receive(ctx, query);
            if (rc > 0) {
                // Update simulated machine telemetry with smooth physics dynamics
                sim_time += 0.5;
                double speed = 850.0 + 15.0 * sin(sim_time * 0.2) + ((rand() % 20) - 10) * 0.1;
                double tension = 140.0 + 8.0 * cos(sim_time * 0.15) + ((rand() % 10) - 5) * 0.1;
                double temp = 48.0 + 4.0 * (1.0 - exp(-sim_time * 0.05)) + ((rand() % 6) - 3) * 0.1;
                double dia = 0.6200 + 0.0008 * sin(sim_time * 0.3) + ((rand() % 4) - 2) * 0.0001;
                double power = 28.0 + 1.2 * (speed / 850.0);

                mb_mapping->tab_registers[0] = (uint16_t)(speed * 10.0);
                mb_mapping->tab_registers[1] = (uint16_t)(tension * 10.0);
                mb_mapping->tab_registers[2] = (uint16_t)(temp * 10.0);
                mb_mapping->tab_registers[3] = (uint16_t)(dia * 1000.0);
                mb_mapping->tab_registers[4] = (uint16_t)(power * 10.0);

                modbus_reply(ctx, query, rc, mb_mapping);
            } else if (rc == -1) {
                // Connection closed by client
                printf("[PLC-SIM] Edge gateway disconnected.\n");
                break;
            }
        }

        modbus_close(ctx);
    }

    printf("\n[PLC-SIM] Stopping server...\n");
    close(server_socket);
    modbus_mapping_free(mb_mapping);
    modbus_free(ctx);

    printf("[PLC-SIM] Cleanly stopped.\n");
    return 0;
}
