CLANG ?= clang
CFLAGS ?= -O2 -g -Wall -target bpf -D__TARGET_ARCH_x86

BPF_DIR := bpf
OUTPUT_DIR := pkg/collector

all: generate build

generate:
	go run github.com/cilium/ebpf/cmd/bpf2go -target bpfel,bpfeb -cc $(CLANG) -cflags "$(CFLAGS)" bpf_process $(BPF_DIR)/process_monitor.c -- -I/usr/include/x86_64-linux-gnu
	go run github.com/cilium/ebpf/cmd/bpf2go -target bpfel,bpfeb -cc $(CLANG) -cflags "$(CFLAGS)" bpf_network $(BPF_DIR)/network_monitor.c -- -I/usr/include/x86_64-linux-gnu
	mv bpf_process_* $(OUTPUT_DIR)/ 2>/dev/null || true
	mv bpf_network_* $(OUTPUT_DIR)/ 2>/dev/null || true

build:
	go build -o bin/defenx-agent cmd/agent/main.go

clean:
	rm -rf bin/ $(OUTPUT_DIR)/bpf_*

.PHONY: all generate build clean

