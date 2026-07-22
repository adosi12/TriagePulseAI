import re

def filter_log_noise(log_text: str) -> dict:
    """
    Regex pre-filtering strategy (90%+ noise reduction).
    Strips out standard INFO and DEBUG heartbeat logs before vectorization/LLM context injection.
    Retains core stack traces, FATAL, ERROR, WARN, and key exception signatures.
    """
    lines = log_text.split('\n')
    total_lines = len(lines)
    
    important_lines = []
    # Patterns for critical errors, exceptions, and stack traces
    critical_pattern = re.compile(
        r'(ERROR|FATAL|WARN|Exception|Error|NoSuchMethodError|SSLHandshakeException|MQRC_|Timeout|Exhausted|Refusal)',
        re.IGNORECASE
    )
    
    in_stack_trace = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Check if line explicitly has INFO or DEBUG without error signals
        if (re.search(r'\b(INFO|DEBUG|TRACE)\b', line) and not re.search(r'\b(ERROR|FATAL|WARN)\b', line)) and not in_stack_trace:
            continue
            
        # Check for stack trace indent lines (at com.bank..., \tat, Caused by)
        if stripped.startswith(('at ', '...', 'Caused by:')) or 'Exception' in stripped or 'Error' in stripped:
            important_lines.append(line)
            in_stack_trace = True
            continue
            
        if critical_pattern.search(line):
            important_lines.append(line)
            in_stack_trace = False
        else:
            in_stack_trace = False

    filtered_text = '\n'.join(important_lines) if important_lines else log_text
    filtered_lines_count = len(important_lines) if important_lines else total_lines
    reduction_percentage = round((1 - (filtered_lines_count / max(total_lines, 1))) * 100, 1)

    return {
        "original_lines": total_lines,
        "filtered_lines": filtered_lines_count,
        "reduction_percentage": reduction_percentage,
        "filtered_log": filtered_text
    }
