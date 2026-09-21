#include "modbus_client.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>

static bool resolve_host_to_ipv4(const char *host, char *out_ip, size_t out_size) {
    if (!host || !out_ip || out_size < 16) return false;

    struct addrinfo hints, *res = NULL;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;

    if (getaddrinfo(host, NULL, &hints, &res) != 0 || !res) {
        return false;
    }

    struct sockaddr_in *ipv4 = (struct sockaddr_in *)res->ai_addr;
    const char *ptr = inet_ntop(AF_INET, &(ipv4->sin_addr), out_ip, (socklen_t)out_size);
    freeaddrinfo(res);
    return ptr != NULL;
}

modbus_client_t* modbus_client_create(const char *host, int port, int slave_id) {
    modbus_client_t *c = (modbus_client_t*)calloc(1, sizeof(modbus_client_t));
    if (!c) return NULL;

    strncpy(c->host, host, sizeof(c->host) - 1);
    c->port = port;
    c->slave_id = slave_id;
    c->is_connected = false;
    c->ctx = NULL;

    return c;
}

bool modbus_client_connect(modbus_client_t *client) {
    if (!client) return false;

    client->is_connected = false;

    if (client->ctx) {
        modbus_close(client->ctx);
        modbus_free(client->ctx);
        client->ctx = NULL;
    }

    char resolved_ip[64] = {0};
    const char *target_ip = client->host;
    if (resolve_host_to_ipv4(client->host, resolved_ip, sizeof(resolved_ip))) {
        target_ip = resolved_ip;
    }

    client->ctx = modbus_new_tcp(target_ip, client->port);
    if (!client->ctx) {
        fprintf(stderr, "[MODBUS] Failed to allocate libmodbus context for %s (%s):%d\n",
                client->host, target_ip, client->port);
        return false;
    }

    modbus_set_slave(client->ctx, client->slave_id);
    modbus_set_response_timeout(client->ctx, 2, 0);

    if (modbus_connect(client->ctx) == -1) {
        fprintf(stderr, "[MODBUS] Connection to %s (%s):%d failed: %s\n",
                client->host, target_ip, client->port, modbus_strerror(errno));
        modbus_free(client->ctx);
        client->ctx = NULL;
        return false;
    }

    client->is_connected = true;
    printf("[MODBUS] Successfully connected to PLC at %s (%s):%d\n", client->host, target_ip, client->port);
    return true;
}

bool modbus_client_read_telemetry(modbus_client_t *client, machine_telemetry_t *out) {
    if (!client || !client->ctx || !client->is_connected || !out) return false;

    uint16_t tab_reg[MODBUS_TOTAL_REGISTERS];
    memset(tab_reg, 0, sizeof(tab_reg));

    int rc = modbus_read_registers(client->ctx, 0, MODBUS_TOTAL_REGISTERS, tab_reg);
    if (rc == -1) {
        fprintf(stderr, "[MODBUS] Read failed from %s:%d: %s\n", client->host, client->port, modbus_strerror(errno));
        client->is_connected = false;
        return false;
    }

    // Scale fixed-point Modbus integer registers to real engineering units
    out->speed_mpm      = (double)tab_reg[MODBUS_REG_SPEED] / 10.0;
    out->tension_n      = (double)tab_reg[MODBUS_REG_TENSION] / 10.0;
    out->lube_temp_c    = (double)tab_reg[MODBUS_REG_LUBE_TEMP] / 10.0;
    out->actual_dia_mm  = (double)tab_reg[MODBUS_REG_ACTUAL_DIA] / 1000.0;
    out->motor_power_kw = (double)tab_reg[MODBUS_REG_MOTOR_POWER] / 10.0;

    return true;
}

void modbus_client_close(modbus_client_t *client) {
    if (client && client->ctx && client->is_connected) {
        modbus_close(client->ctx);
        client->is_connected = false;
    }
}

void modbus_client_destroy(modbus_client_t *client) {
    if (!client) return;
    modbus_client_close(client);
    if (client->ctx) {
        modbus_free(client->ctx);
        client->ctx = NULL;
    }
    free(client);
}
