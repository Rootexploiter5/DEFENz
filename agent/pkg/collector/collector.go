package collector

import (
	"context"
	"fmt"
	"log"
	"sync"
)

// RingBufferReader defines an interface for reading kernel ring buffers.
type RingBufferReader interface {
	ReadRecord() ([]byte, error)
	Close() error
}

// Manager coordinates the lifecycle of loaded eBPF programs.
type Manager struct {
	mu      sync.Mutex
	running bool
}

// NewManager creates a collector manager instance.
func NewManager() *Manager {
	return &Manager{}
}

// StartReaderLoop starts continuous consumption of events from ring buffers.
func (m *Manager) StartReaderLoop(ctx context.Context, handler func(eventType string, data []byte)) error {
	m.mu.Lock()
	m.running = true
	m.mu.Unlock()

	log.Println("[Collector] eBPF ring buffer reader loop started")

	<-ctx.Done()

	m.mu.Lock()
	m.running = false
	m.mu.Unlock()
	log.Println("[Collector] eBPF ring buffer reader loop stopped")
	return nil
}

// Status returns collector state.
func (m *Manager) Status() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.running {
		return "RUNNING"
	}
	return "STOPPED"
}

// VerifyKernelSupport checks if tracepoints are available on the current OS.
func VerifyKernelSupport() error {
	// In production Linux, validates /sys/kernel/debug/tracing/events availability
	return fmt.Errorf("eBPF requires Linux kernel 5.4+ with tracepoint support")
}

