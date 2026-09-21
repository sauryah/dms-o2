module JSONUtils

export parse_json, to_json

# Pure Julia zero-dependency JSON parser & serializer

function parse_json(str::AbstractString)
    pos = 1
    s = strip(str)
    val, _ = parse_value(s, 1)
    return val
end

function skip_whitespace(s::AbstractString, pos::Int)
    n = length(s)
    while pos <= n && isspace(s[pos])
        pos += 1
    end
    return pos
end

function parse_value(s::AbstractString, pos::Int)
    pos = skip_whitespace(s, pos)
    if pos > length(s)
        error("Unexpected end of JSON input")
    end

    c = s[pos]
    if c == '{'
        return parse_object(s, pos)
    elseif c == '['
        return parse_array(s, pos)
    elseif c == '"'
        return parse_string(s, pos)
    elseif c == 't' || c == 'f'
        return parse_bool(s, pos)
    elseif c == 'n'
        return parse_null(s, pos)
    elseif c == '-' || isdigit(c)
        return parse_number(s, pos)
    else
        error("Unexpected character in JSON at pos $pos: '$c'")
    end
end

function parse_object(s::AbstractString, pos::Int)
    pos += 1 # skip '{'
    obj = Dict{String, Any}()
    pos = skip_whitespace(s, pos)

    if pos <= length(s) && s[pos] == '}'
        return obj, pos + 1
    end

    while pos <= length(s)
        pos = skip_whitespace(s, pos)
        if pos > length(s) || s[pos] != '"'
            error("Expected string key in object at pos $pos")
        end
        key, pos = parse_string(s, pos)
        pos = skip_whitespace(s, pos)
        if pos > length(s) || s[pos] != ':'
            error("Expected ':' after key at pos $pos")
        end
        pos += 1 # skip ':'
        val, pos = parse_value(s, pos)
        obj[key] = val

        pos = skip_whitespace(s, pos)
        if pos <= length(s) && s[pos] == ','
            pos += 1
            continue
        elseif pos <= length(s) && s[pos] == '}'
            pos += 1
            return obj, pos
        else
            error("Expected ',' or '}' in object at pos $pos")
        end
    end
    error("Unterminated object in JSON")
end

function parse_array(s::AbstractString, pos::Int)
    pos += 1 # skip '['
    arr = Any[]
    pos = skip_whitespace(s, pos)

    if pos <= length(s) && s[pos] == ']'
        return arr, pos + 1
    end

    while pos <= length(s)
        val, pos = parse_value(s, pos)
        push!(arr, val)

        pos = skip_whitespace(s, pos)
        if pos <= length(s) && s[pos] == ','
            pos += 1
            continue
        elseif pos <= length(s) && s[pos] == ']'
            pos += 1
            return arr, pos
        else
            error("Expected ',' or ']' in array at pos $pos")
        end
    end
    error("Unterminated array in JSON")
end

function parse_string(s::AbstractString, pos::Int)
    pos += 1 # skip opening quote
    n = length(s)
    chars = Char[]
    while pos <= n
        c = s[pos]
        if c == '"'
            return String(chars), pos + 1
        elseif c == '\\'
            pos += 1
            if pos > n
                error("Unterminated escape sequence")
            end
            esc = s[pos]
            if esc == '"' push!(chars, '"')
            elseif esc == '\\' push!(chars, '\\')
            elseif esc == '/' push!(chars, '/')
            elseif esc == 'b' push!(chars, '\b')
            elseif esc == 'f' push!(chars, '\f')
            elseif esc == 'n' push!(chars, '\n')
            elseif esc == 'r' push!(chars, '\r')
            elseif esc == 't' push!(chars, '\t')
            else push!(chars, esc)
            end
        else
            push!(chars, c)
        end
        pos += 1
    end
    error("Unterminated string in JSON")
end

function parse_number(s::AbstractString, pos::Int)
    start_pos = pos
    n = length(s)
    if s[pos] == '-'
        pos += 1
    end
    while pos <= n && isdigit(s[pos])
        pos += 1
    end
    is_float = false
    if pos <= n && s[pos] == '.'
        is_float = true
        pos += 1
        while pos <= n && isdigit(s[pos])
            pos += 1
        end
    end
    if pos <= n && (s[pos] == 'e' || s[pos] == 'E')
        is_float = true
        pos += 1
        if pos <= n && (s[pos] == '+' || s[pos] == '-')
            pos += 1
        end
        while pos <= n && isdigit(s[pos])
            pos += 1
        end
    end
    num_str = s[start_pos:pos-1]
    val = is_float ? parse(Float64, num_str) : parse(Int64, num_str)
    return val, pos
end

function parse_bool(s::AbstractString, pos::Int)
    if startswith(SubString(s, pos), "true")
        return true, pos + 4
    elseif startswith(SubString(s, pos), "false")
        return false, pos + 5
    else
        error("Invalid boolean at pos $pos")
    end
end

function parse_null(s::AbstractString, pos::Int)
    if startswith(SubString(s, pos), "null")
        return nothing, pos + 4
    else
        error("Invalid null at pos $pos")
    end
end

# Serializer
function to_json(val::Any)
    io = IOBuffer()
    write_json(io, val)
    return String(take!(io))
end

function write_json(io::IO, val::Nothing)
    print(io, "null")
end

function write_json(io::IO, val::Bool)
    print(io, val ? "true" : "false")
end

function write_json(io::IO, val::Real)
    if isfinite(val)
        print(io, val)
    else
        print(io, "null")
    end
end

function write_json(io::IO, val::AbstractString)
    print(io, "\"")
    for c in val
        if c == '"' print(io, "\\\"")
        elseif c == '\\' print(io, "\\\\")
        elseif c == '\b' print(io, "\\b")
        elseif c == '\f' print(io, "\\f")
        elseif c == '\n' print(io, "\\n")
        elseif c == '\r' print(io, "\\r")
        elseif c == '\t' print(io, "\\t")
        else print(io, c)
        end
    end
    print(io, "\"")
end

function write_json(io::IO, val::AbstractVector)
    print(io, "[")
    for (i, v) in enumerate(val)
        if i > 1 print(io, ",") end
        write_json(io, v)
    end
    print(io, "]")
end

function write_json(io::IO, val::AbstractDict)
    print(io, "{")
    first = true
    for (k, v) in val
        if !first print(io, ",") end
        first = false
        write_json(io, string(k))
        print(io, ":")
        write_json(io, v)
    end
    print(io, "}")
end

end # module
