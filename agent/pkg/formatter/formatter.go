package formatter

import (
	"encoding/json"
	"fmt"
	"net"
	"time"
)

// TelemetryEvent represents a standardized security telemetry event.
type TelemetryEvent struct {
	Timestamp   string            `json:"timestamp"`
	EventType   string            `json:"event_type"` // "execve" or "connect"
	PID         uint32            `json:"pid"`
	PPID        uint32            `json:"ppid"`
	UID         uint32            `json:"uid"`
	Comm        string            `json:"comm"`
	Path        string            `json:"path,omitempty"`
	Args        []string          `json:"args,omitempty"`
	DestIP      string            `json:"dest_ip,omitempty"`
	DestPort    uint16            `json:"dest_port,omitempty"`
	Protocol    string            `json:"protocol,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// FormatExecEvent converts raw process event data to JSON bytes.
func FormatExecEvent(pid, ppid, uid uint32, comm, path string) ([]byte, error) {
	event := TelemetryEvent{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		EventType: "execve",
		PID:       pid,
		PPID:      ppid,
		UID:       uid,
		Comm:      comm,
		Path:      path,
	}
	return json.Marshal(event)
}

// FormatConnectEvent converts raw socket connection data to JSON bytes.
func FormatConnectEvent(pid, uid uint32, comm string, daddr uint32, dport uint16) ([]byte, error) {
	// Convert IPv4 binary to human-readable string
	ip := net.IPv4(byte(daddr), byte(daddr>>8), byte(daddr>>16), byte(daddr>>24)).String()

	event := TelemetryEvent{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		EventType: "connect",
		PID:       pid,
		UID:       uid,
		Comm:      comm,
		DestIP:    ip,
		DestPort:  dport,
		Protocol:  "TCP",
	}
	return json.Marshal(event)
}

// ToJSONString helper to format any TelemetryEvent to string
func (e *TelemetryEvent) ToJSONString() (string, error) {
	bytes, err := json.Marshal(e)
	if err != nil {
		return "", fmt.Errorf("failed to marshal telemetry event: %w", err)
	}
	return string(bytes), nil
}

