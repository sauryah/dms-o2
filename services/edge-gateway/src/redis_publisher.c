#include "redis_publisher.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <cjson/cJSON.h>

redis_publisher_t* redis_publisher_create(const char *host, int port, const char *channel) {
    redis_publisher_t *p = (redis_publisher_t*)calloc(1, sizeof(redis_publisher_t));
    if (!p) return NULL;

    strncpy(p->host, host, sizeof(p->host) - 1);
    p->port = port;
    strncpy(p->channel, channel, sizeof(p->channel) - 1);
    p->is_connected = false;
    p->ctx = NULL;

    return p;
}

bool redis_publisher_connect(redis_publisher_t *pub) {
    if (!pub) return false;

    if (pub->is_connected && pub->ctx) {
        redisFree(pub->ctx);
        pub->ctx = NULL;
        pub->is_connected = false;
    }

    struct timeval timeout = { 2, 0 }; // 2-second timeout
    pub->ctx = redisConnectWithTimeout(pub->host, pub->port, timeout);
    if (!pub->ctx || pub->ctx->err) {
        if (pub->ctx) {
            fprintf(stderr, "[REDIS] Connection error (%s:%d): %s\n", pub->host, pub->port, pub->ctx->errstr);
            redisFree(pub->ctx);
            pub->ctx = NULL;
        } else {
            fprintf(stderr, "[REDIS] Cannot allocate redis context (%s:%d)\n", pub->host, pub->port);
        }
        return false;
    }

    pub->is_connected = true;
    printf("[REDIS] Successfully connected to Redis broker at %s:%d\n", pub->host, pub->port);
    return true;
}

bool redis_publisher_publish(redis_publisher_t *pub, const char *machine_id, const machine_telemetry_t *telemetry) {
    if (!pub || !pub->ctx || !pub->is_connected || !telemetry) return false;

    // Construct telemetry JSON payload using cJSON
    cJSON *root = cJSON_CreateObject();
    if (!root) return false;

    cJSON_AddStringToObject(root, "type", "MACHINE_TELEMETRY");
    cJSON_AddStringToObject(root, "machine_id", machine_id ? machine_id : "UNKNOWN");
    cJSON_AddNumberToObject(root, "speed_mpm", telemetry->speed_mpm);
    cJSON_AddNumberToObject(root, "tension_n", telemetry->tension_n);
    cJSON_AddNumberToObject(root, "lube_temp_c", telemetry->lube_temp_c);
    cJSON_AddNumberToObject(root, "actual_dia_mm", telemetry->actual_dia_mm);
    cJSON_AddNumberToObject(root, "motor_power_kw", telemetry->motor_power_kw);
    cJSON_AddNumberToObject(root, "timestamp", (double)time(NULL));

    char *json_str = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (!json_str) return false;

    // Send Redis PUBLISH command
    redisReply *reply = (redisReply*)redisCommand(pub->ctx, "PUBLISH %s %s", pub->channel, json_str);
    free(json_str);

    if (!reply) {
        fprintf(stderr, "[REDIS] Publish command error: %s\n", pub->ctx->errstr);
        pub->is_connected = false;
        return false;
    }

    freeReplyObject(reply);
    return true;
}

void redis_publisher_close(redis_publisher_t *pub) {
    if (pub && pub->ctx) {
        redisFree(pub->ctx);
        pub->ctx = NULL;
        pub->is_connected = false;
    }
}

void redis_publisher_destroy(redis_publisher_t *pub) {
    if (!pub) return;
    redis_publisher_close(pub);
    free(pub);
}
