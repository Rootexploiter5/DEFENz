package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ai-anomaly-detector/agent/pkg/collector"
	"ai-anomaly-detector/agent/pkg/formatter"
	"ai-anomaly-detector/agent/pkg/transmitter"
)

func main() {
	backendAddr := flag.String("backend", "localhost:8000", "FastAPI backend address host:port")
	authToken := flag.String("token", "defenx-internal-local-token", "Internal IPC auth token for backend WebSocket")
	flag.Parse()

	log.Println("==================================================")
	log.Println("  DEFENx eBPF Universal Endpoint Agent Starting  ")
	log.Println("==================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful termination
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("\n[Agent] Termination signal received. Shutting down...")
		cancel()
	}()

	// 1. Initialize Transmitter to Python Backend with auth token
	tx := transmitter.NewClient(*backendAddr, 10000, *authToken)
	if err := tx.Start(ctx); err != nil {
		log.Printf("[Agent Warning] Backend not reachable at %s: %v. Retrying in background...", *backendAddr, err)
	}
	defer tx.Close()

	// 2. Initialize Collector Manager
	colManager := collector.NewManager()

	// Event handler callback: maps raw ring buffer bytes to normalized JSON telemetry
	handleKernelEvent := func(eventType string, rawBytes []byte) {
		var jsonBytes []byte
		var err error

		if eventType == "execve" {
			jsonBytes, err = formatter.FormatProcessEvent(rawBytes)
		} else if eventType == "connect" {
			jsonBytes, err = formatter.FormatNetworkEvent(rawBytes)
		}

		if err != nil {
			log.Printf("[Agent Error] Failed to format %s event: %v", eventType, err)
			return
		}

		if !tx.Send(jsonBytes) {
			log.Println("[Agent Warning] Transmitter queue full, dropped telemetry frame")
		}
	}

	// 3. Start reader loop in background
	go func() {
		if err := colManager.StartReaderLoop(ctx, handleKernelEvent); err != nil {
			log.Printf("[Agent Error] Collector loop terminated: %v", err)
		}
	}()

	// Heartbeat / health log loop
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Agent] Clean shutdown complete.")
			return
		case <-ticker.C:
			log.Printf("[Agent Heartbeat] Status=%s, Backend=%s", colManager.Status(), *backendAddr)
		}
	}
}

