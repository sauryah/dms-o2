# DMS-O2 Metallurgy Analytics Engine
# Julia 1.10 runtime for Archard wear, Johnson-Cook viscoplasticity, and Weibull reliability analysis

FROM julia:1.10-alpine

# Security Rule: Run as non-root user dmsuser (UID 1001)
RUN adduser -D -u 1001 dmsuser

WORKDIR /app

# Copy project manifest and source files
COPY Project.toml /app/
COPY src/ /app/src/
COPY test/ /app/test/

RUN chown -R dmsuser:dmsuser /app

USER dmsuser

ENV JULIA_DEPOT_PATH=/home/dmsuser/.julia

ENTRYPOINT ["julia", "--project=/app", "/app/src/cli.jl"]
