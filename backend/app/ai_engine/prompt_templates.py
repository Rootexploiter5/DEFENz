"""
Forensic Threat-Hunting Prompt Templates for DEFENx AI Reasoning Engine.
Enforces strict JSON schema output from local Ollama instances.
"""

SYSTEM_FORENSIC_ANALYST_PROMPT = """You are DEFENx, an autonomous on-device security orchestrator and digital forensics expert.
Your job is to analyze anomalous system telemetry and process execution trees captured from an endpoint device.

Evaluate the anomalous event, surrounding process tree, and any threat context. Determine whether this behavior represents legitimate administrative/developer activity, a living-off-the-land (LotL) abuse, zero-day malware, or malicious command-and-control communication.

You MUST respond strictly with a valid JSON object matching this exact schema:
{
  "threat_level": "Low" | "Medium" | "High" | "Critical",
  "confidence": <float between 0.0 and 1.0>,
  "mitre_technique": "<MITRE ATT&CK ID and Name, e.g. T1059.004 Unix Shell>",
  "analysis": "<Concise forensic explanation of why this process tree and parameters are suspicious or benign>",
  "recommended_action": "IGNORE" | "MONITOR" | "KILL_PROCESS" | "ISOLATE_NETWORK"
}

Do not include any prose, introduction, markdown fences, or text outside the raw JSON object.
"""

def sanitize_for_prompt(val: str, max_len: int = 500) -> str:
    """Escapes special delimiters and truncates input to prevent prompt injection."""
    if not val:
        return "N/A"
    clean = str(val).replace("[", "(").replace("]", ")").replace("\r", " ").replace("\n", " ")
    return clean[:max_len]

def generate_forensic_prompt(event_data: dict, process_tree_text: str, rag_context: str = "") -> str:
    """Formats event data, execution lineage, and vector store context into a structured LLM prompt."""
    comm = sanitize_for_prompt(event_data.get('comm', ''))
    path = sanitize_for_prompt(event_data.get('path', 'N/A'))
    dest_ip = sanitize_for_prompt(event_data.get('dest_ip', 'N/A'))
    dest_port = sanitize_for_prompt(str(event_data.get('dest_port', 'N/A')))
    tree_sanitized = sanitize_for_prompt(process_tree_text, max_len=1500)

    prompt = f"""[ANOMALOUS EVENT TELEMETRY]
Timestamp: {event_data.get('timestamp')}
Event Type: {event_data.get('event_type')}
PID: {event_data.get('pid')}
PPID: {event_data.get('ppid')}
Process Comm: {comm}
Executable Path: {path}
Destination IP: {dest_ip}
Destination Port: {dest_port}

[EXECUTION PROCESS TREE (LAST 5 MINUTES)]
{tree_sanitized}
"""
    if rag_context:
        prompt += f"\n[LOCAL THREAT INTELLIGENCE / CVE CONTEXT]\n{sanitize_for_prompt(rag_context, max_len=1000)}\n"

    prompt += "\nEvaluate this execution trace now. Provide your strict JSON forensic verdict:"
    return prompt

