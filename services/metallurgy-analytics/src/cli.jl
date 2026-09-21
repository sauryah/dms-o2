#!/usr/bin/env julia

# DMS-O2 Metallurgy Analytics CLI Daemon
# Executes Archard tool wear, Johnson-Cook viscoplasticity, and Weibull reliability models

push!(LOAD_PATH, @__DIR__)
include("MetallurgyAnalytics.jl")
using .MetallurgyAnalytics

function main(args)
    input_file = nothing
    output_file = nothing
    override_mode = nothing

    i = 1
    while i <= length(args)
        arg = args[i]
        if arg == "--input" || arg == "-i"
            if i + 1 <= length(args)
                input_file = args[i + 1]
                i += 1
            end
        elseif arg == "--output" || arg == "-o"
            if i + 1 <= length(args)
                output_file = args[i + 1]
                i += 1
            end
        elseif arg == "--mode" || arg == "-m"
            if i + 1 <= length(args)
                override_mode = args[i + 1]
                i += 1
            end
        elseif arg == "--help" || arg == "-h"
            println("DMS-O2 Metallurgy Analytics Engine (Julia)")
            println("Usage: julia src/cli.jl [OPTIONS]")
            println("  -i, --input <file>    Path to input JSON file (defaults to stdin)")
            println("  -o, --output <file>   Path to output JSON file (defaults to stdout)")
            println("  -m, --mode <mode>     Override mode (archard, johnson_cook, weibull)")
            println("  -h, --help            Show this help message")
            exit(0)
        end
        i += 1
    end

    raw_input = if input_file !== nothing
        if !isfile(input_file)
            println(stderr, "[ERROR] Input file not found: $input_file")
            exit(1)
        end
        read(input_file, String)
    else
        read(stdin, String)
    end

    if isempty(strip(raw_input))
        println(stderr, "[ERROR] Empty JSON input received")
        exit(1)
    end

    output_json = process_json_request(raw_input)

    if output_file !== nothing
        write(output_file, output_json)
    else
        println(output_json)
    end
end

if abspath(PROGRAM_FILE) == @__FILE__
    main(ARGS)
end
