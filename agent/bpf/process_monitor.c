// +build ignore

#include <linux/bpf.h>
#include <linux/types.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

#define TASK_COMM_LEN 16
#define MAX_PATH_LEN 256

struct process_event_t {
    __u64 timestamp_ns;
    __u32 pid;
    __u32 ppid;
    __u32 uid;
    __u32 gid;
    char comm[TASK_COMM_LEN];
    char filename[MAX_PATH_LEN];
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 1 << 24); // 16 MB ring buffer
} events SEC(".maps");

// BPF Map to record dropped event count under heavy kernel pressure
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 1);
    __type(key, __u32);
    __type(value, __u64);
} drop_counter SEC(".maps");

// Tracepoint: syscalls/sys_enter_execve
SEC("tracepoint/syscalls/sys_enter_execve")
int trace_sys_enter_execve(struct trace_event_raw_sys_enter *ctx) {
    struct process_event_t *event;
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = pid_tgid >> 32;

    event = bpf_ringbuf_reserve(&events, sizeof(*event), 0);
    if (!event) {
        // Track drops deterministically for security monitoring
        __u32 key = 0;
        __u64 *val = bpf_map_lookup_elem(&drop_counter, &key);
        if (val) {
            __sync_fetch_and_add(val, 1);
        }
        return 0;
    }

    event->timestamp_ns = bpf_ktime_get_ns();
    event->pid = pid;
    event->uid = (__u32)bpf_get_current_uid_gid();
    event->gid = (__u32)(bpf_get_current_uid_gid() >> 32);

    // Read process command name
    bpf_get_current_comm(&event->comm, sizeof(event->comm));

    // Pointer to filename is arg 0 in sys_enter_execve
    const char *filename_ptr = (const char *)ctx->args[0];
    bpf_probe_read_user_str(&event->filename, sizeof(event->filename), filename_ptr);

    // Read real parent PID directly from current task_struct
    struct task_struct *task = (struct task_struct *)bpf_get_current_task();
    struct task_struct *real_parent = BPF_CORE_READ(task, real_parent);
    event->ppid = BPF_CORE_READ(real_parent, tgid);

    bpf_ringbuf_submit(event, 0);
    return 0;
}

char LICENSE[] SEC("license") = "GPL";

