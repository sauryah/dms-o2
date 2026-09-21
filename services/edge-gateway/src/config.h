#ifndef DMS_CONFIG_H
#define DMS_CONFIG_H

#include <stdbool.h>

typedef struct {
    char plc_host[128];
    int plc_port;
    char redis_host[128];
    int redis_port;
    char redis_channel[128];
    char machine_id[64];
    int poll_interval_ms;
    int modbus_slave_id;
} gateway_config_t;

void config_init_defaults(gateway_config_t *cfg);
void config_load_env(gateway_config_t *cfg);
void config_print(const gateway_config_t *cfg);

#endif // DMS_CONFIG_H
