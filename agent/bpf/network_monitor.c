// +build ignore

#include <linux/bpf.h>
#include <linux/types.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#include <linux/in.h>
#include <linux/in6.h>

#define TASK_COMM_LEN 16

struct network_event_t {
    __u64 timestamp_ns;
    __u32 pid;
    __u32 uid;
    __u16 family;
    __u16 dport;
    __u32 daddr_v4;
    char comm[TASK_COMM_LEN];
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 1 << 24); // 16 MB ring buffer
} net_events SEC(".maps");

// Tracepoint: syscalls/sys_enter_connect
SEC("tracepoint/syscalls/sys_enter_connect")
int trace_sys_enter_connect(struct trace_event_raw_sys_enter *ctx) {
    struct network_event_t *event;
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = pid_tgid >> 32;

    struct sockaddr *addr = (struct sockaddr *)ctx->args[1];
    if (!addr) {
        return 0;
    }

    event = bpf_ringbuf_reserve(&net_events, sizeof(*event), 0);
    if (!event) {
        return 0;
    }

    event->timestamp_ns = bpf_ktime_get_ns();
    event->pid = pid;
    event->uid = (__u32)bpf_get_current_uid_gid();
    bpf_get_current_comm(&event->comm, sizeof(event->comm));

    __u16 family = 0;
    bpf_probe_read_user(&family, sizeof(family), &addr->sa_family);
    event->family = family;

    if (family == AF_INET) {
        struct sockaddr_in *in = (struct sockaddr_in *)addr;
        __be16 dport = 0;
        __be32 daddr = 0;

        bpf_probe_read_user(&dport, sizeof(dport), &in->sin_port);
        bpf_probe_read_user(&daddr, sizeof(daddr), &in->sin_addr.s_addr);

        // Convert big-endian network byte order port to host byte order
        event->dport = __builtin_bswap16(dport);
        event->daddr_v4 = daddr;
    } else {
        event->dport = 0;
        event->daddr_v4 = 0;
    }

    bpf_ringbuf_submit(event, 0);
    return 0;
}

char LICENSE[] SEC("license") = "GPL";
