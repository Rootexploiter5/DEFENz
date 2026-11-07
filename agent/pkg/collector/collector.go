package collector

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"unsafe"

	"github.com/cilium/ebpf/ringbuf"
)

// ProcessEventLayout represents the exact memory layout from process_monitor.c
type ProcessEventLayout struct {
	TimestampNs uint64
	PID         uint32
	PPID        uint32
	UID         uint32
	GID         uint32
	Comm        [16]byte
	Filename    [256]byte
}

// NetworkEventLayout represents the exact memory layout from network_monitor.c
type NetworkEventLayout struct {
	TimestampNs uint64
	PID         uint32
	UID         uint32
	Family      uint16
	DPort       uint16
	DAddrV4     uint32
	Comm        [16]byte
}

// Manager coordinates reading real kernel ring buffer records.
type Manager struct {
	mu         sync.Mutex
	running    bool
	procReader *ringbuf.Reader
	netReader  *ringbuf.Reader
}

// NewManager creates a collector manager instance.
func NewManager() *Manager {
	return &Manager{}
}

// SetReaders attaches the compiled ebpf ringbuf readers when loaded.
func (m *Manager) SetReaders(procReader, netReader *ringbuf.Reader) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.procReader = procReader
	m.netReader = netReader
}

// StartReaderLoop starts continuous live consumption of kernel ring buffers.
func (m *Manager) StartReaderLoop(ctx context.Context, handler func(eventType string, rawBytes []byte)) error {
	m.mu.Lock()
	m.running = true
	m.mu.Unlock()

	log.Println("[Collector] eBPF ring buffer reader loop started")

	var wg sync.WaitGroup

	// Real Process Ring Buffer Reader Goroutine
	if m.procReader != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				record, err := m.procReader.Read()
				if err != nil {
					if errors.Is(err, ringbuf.ErrClosed) {
						return
					}
					log.Printf("[Collector] Process ringbuf read error: %v", err)
					continue
				}
				handler("execve", record.RawSample)
			}
		}()
	}

	// Real Network Ring Buffer Reader Goroutine
	if m.netReader != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				record, err := m.netReader.Read()
				if err != nil {
					if errors.Is(err, ringbuf.ErrClosed) {
						return
					}
					log.Printf("[Collector] Network ringbuf read error: %v", err)
					continue
				}
				handler("connect", record.RawSample)
			}
		}()
	}

	<-ctx.Done()

	m.mu.Lock()
	if m.procReader != nil {
		m.procReader.Close()
	}
	if m.netReader != nil {
		m.netReader.Close()
	}
	m.running = false
	m.mu.Unlock()

	wg.Wait()
	log.Println("[Collector] eBPF ring buffer reader loop stopped")
	return nil
}

// ParseProcessRecord converts raw byte slice directly from kernel memory struct.
func ParseProcessRecord(raw []byte) (*ProcessEventLayout, error) {
	if len(raw) < int(unsafe.Sizeof(ProcessEventLayout{})) {
		return nil, fmt.Errorf("sample too small for ProcessEventLayout: got %d bytes", len(raw))
	}
	return (*ProcessEventLayout)(unsafe.Pointer(&raw[0])), nil
}

// ParseNetworkRecord converts raw byte slice directly from kernel memory struct.
func ParseNetworkRecord(raw []byte) (*NetworkEventLayout, error) {
	if len(raw) < int(unsafe.Sizeof(NetworkEventLayout{})) {
		return nil, fmt.Errorf("sample too small for NetworkEventLayout: got %d bytes", len(raw))
	}
	return (*NetworkEventLayout)(unsafe.Pointer(&raw[0])), nil
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


