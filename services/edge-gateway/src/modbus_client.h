#ifndef DMS_MODBUS_CLIENT_H
#define DMS_MODBUS_CLIENT_H

#include <stdbool.h>
#include <stdint.h>
#include <modbus.h>
#include "config.h"

#define MODBUS_REG_SPEED       0
#define MODBUS_REG_TENSION     1
#define MODBUS_REG_LUBE_TEMP   2
#define MODBUS_REG_ACTUAL_DIA  3
#define MODBUS_REG_MOTOR_POWER 4
#define MODBUS_TOTAL_REGISTERS 5

typedef struct {
    double speed_mpm;
    double tension_n;
    double lube_temp_c;
    double actual_dia_mm;
    double motor_power_kw;
} machine_telemetry_t;

typedef struct {
    modbus_t *ctx;
    char mode[16];
    char host[128];
    int port;
    char serial_device[128];
    int baud_rate;
    char parity;
    int data_bits;
    int stop_bits;
    int slave_id;
    bool is_connected;
} modbus_client_t;

modbus_client_t* modbus_client_create(const char *host, int port, int slave_id);
modbus_client_t* modbus_client_create_from_config(const gateway_config_t *cfg);
bool modbus_client_connect(modbus_client_t *client);
bool modbus_client_read_telemetry(modbus_client_t *client, machine_telemetry_t *out);
void modbus_client_close(modbus_client_t *client);
void modbus_client_destroy(modbus_client_t *client);

#endif // DMS_MODBUS_CLIENT_H
