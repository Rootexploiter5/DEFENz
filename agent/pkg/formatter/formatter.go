package formatter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"time"

	"ai-anomaly-detector/agent/pkg/collector"
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

// FormatProcessEvent converts raw kernel bytes from process_monitor.c to JSON.
func FormatProcessEvent(raw []byte) ([]byte, error) {
	record, err := collector.ParseProcessRecord(raw)
	if err != nil {
		return nil, err
	}

	comm := string(bytes.TrimRight(record.Comm[:], "\x00"))
	path := string(bytes.TrimRight(record.Filename[:], "\x00"))

	event := TelemetryEvent{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		EventType: "execve",
		PID:       record.PID,
		PPID:      record.PPID,
		UID:       record.UID,
		Comm:      comm,
		Path:      path,
	}
	return json.Marshal(event)
}

// FormatNetworkEvent converts raw kernel bytes from network_monitor.c to JSON.
func FormatNetworkEvent(raw []byte) ([]byte, error) {
	record, err := collector.ParseNetworkRecord(raw)
	if err != nil {
		return nil, err
	}

	comm := string(bytes.TrimRight(record.Comm[:], "\x00"))
	daddr := record.DAddrV4
	ip := net.IPv4(byte(daddr), byte(daddr>>8), byte(daddr>>16), byte(daddr>>24)).String()

	event := TelemetryEvent{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		EventType: "connect",
		PID:       record.PID,
		UID:       record.UID,
		Comm:      comm,
		DestIP:    ip,
		DestPort:  record.DPort,
		Protocol:  "TCP",
	}
	return json.Marshal(event)
}


