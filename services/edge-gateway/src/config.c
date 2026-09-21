#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void config_init_defaults(gateway_config_t *cfg) {
    if (!cfg) return;
    strncpy(cfg->plc_host, "127.0.0.1", sizeof(cfg->plc_host) - 1);
    cfg->plc_port = 1502;
    strncpy(cfg->redis_host, "127.0.0.1", sizeof(cfg->redis_host) - 1);
    cfg->redis_port = 6379;
    strncpy(cfg->redis_channel, "dms:events:broadcast", sizeof(cfg->redis_channel) - 1);
    strncpy(cfg->machine_id, "EN-01", sizeof(cfg->machine_id) - 1);
    cfg->poll_interval_ms = 500;
    cfg->modbus_slave_id = 1;
}

void config_load_env(gateway_config_t *cfg) {
    if (!cfg) return;

    const char *val;
    if ((val = getenv("PLC_HOST")) != NULL && strlen(val) > 0) {
        strncpy(cfg->plc_host, val, sizeof(cfg->plc_host) - 1);
    }
    if ((val = getenv("PLC_PORT")) != NULL) {
        int port = atoi(val);
        if (port > 0 && port < 65536) cfg->plc_port = port;
    }
    if ((val = getenv("REDIS_HOST")) != NULL && strlen(val) > 0) {
        strncpy(cfg->redis_host, val, sizeof(cfg->redis_host) - 1);
    }
    if ((val = getenv("REDIS_PORT")) != NULL) {
        int port = atoi(val);
        if (port > 0 && port < 65536) cfg->redis_port = port;
    }
    if ((val = getenv("REDIS_CHANNEL")) != NULL && strlen(val) > 0) {
        strncpy(cfg->redis_channel, val, sizeof(cfg->redis_channel) - 1);
    }
    if ((val = getenv("MACHINE_ID")) != NULL && strlen(val) > 0) {
        strncpy(cfg->machine_id, val, sizeof(cfg->machine_id) - 1);
    }
    if ((val = getenv("POLL_INTERVAL_MS")) != NULL) {
        int interval = atoi(val);
        if (interval >= 50 && interval <= 60000) cfg->poll_interval_ms = interval;
    }
    if ((val = getenv("MODBUS_SLAVE_ID")) != NULL) {
        int slave = atoi(val);
        if (slave >= 1 && slave <= 247) cfg->modbus_slave_id = slave;
    }
}

void config_print(const gateway_config_t *cfg) {
    if (!cfg) return;
    printf("[CONFIG] Machine ID      : %s\n", cfg->machine_id);
    printf("[CONFIG] PLC Target      : %s:%d (Slave ID: %d)\n", cfg->plc_host, cfg->plc_port, cfg->modbus_slave_id);
    printf("[CONFIG] Redis Target    : %s:%d (Channel: %s)\n", cfg->redis_host, cfg->redis_port, cfg->redis_channel);
    printf("[CONFIG] Poll Interval   : %d ms\n", cfg->poll_interval_ms);
}
