import re

def parse_cpu_limit(cpu_str):
    """
    Helper to parse CPU limit string (e.g., "1.5" -> 1500000000 nanoCPUs).
    Allows for "N/A" or empty string to mean no limit.
    """
    if not cpu_str:
        return None
    try:
        if cpu_str.strip().lower() == 'n/a' or not cpu_str.strip():
            return None
        
        cpu_str = cpu_str.replace(' Cores', '').strip()
        
        cores = float(cpu_str)
        return int(cores * 1_000_000_000)
    except ValueError:
        return None

def parse_memory_limit(mem_str):
    """
    Helper to parse memory limit string (e.g., "512MB" -> 536870912 bytes).
    Allows for "Unlimited" or empty string to mean no limit.
    """
    if not mem_str:
        return None
    try:
        if mem_str.strip().lower() == 'unlimited' or not mem_str.strip():
            return None

        mem_str = mem_str.strip().upper()
        match = re.match(r'(\d+(\.\d+)?)\s*(K|M|G)?B?', mem_str)
        if not match:
            return None

        value = float(match.group(1))
        unit = match.group(3)

        if unit == 'K':
            return int(value * 1024)
        elif unit == 'M':
            return int(value * 1024**2)
        elif unit == 'G':
            return int(value * 1024**3)
        else:
            return int(value)
    except ValueError:
        return None