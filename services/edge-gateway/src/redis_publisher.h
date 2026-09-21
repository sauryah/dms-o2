#ifndef DMS_REDIS_PUBLISHER_H
#define DMS_REDIS_PUBLISHER_H

#include <stdbool.h>
#include <hiredis/hiredis.h>
#include "modbus_client.h"

typedef struct {
    redisContext *ctx;
    char host[128];
    int port;
    char channel[128];
    bool is_connected;
} redis_publisher_t;

redis_publisher_t* redis_publisher_create(const char *host, int port, const char *channel);
bool redis_publisher_connect(redis_publisher_t *pub);
bool redis_publisher_publish(redis_publisher_t *pub, const char *machine_id, const machine_telemetry_t *telemetry);
void redis_publisher_close(redis_publisher_t *pub);
void redis_publisher_destroy(redis_publisher_t *pub);

#endif // DMS_REDIS_PUBLISHER_H
