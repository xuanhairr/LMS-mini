export const CLASS_STATUSES: Record<string, { color: string; label: string; order: number }> = {
    gathering: { color: 'cyan',    label: 'Sắp mở / Gom HV', order: 1 },
    ready:     { color: 'blue',    label: 'Sẵn sàng',         order: 2 },
    active:    { color: 'green',   label: 'Đang diễn ra',     order: 3 },
    finished:  { color: 'default', label: 'Đã kết thúc',      order: 4 },
    cancelled: { color: 'red',     label: 'Đã hủy',           order: 5 },
};

export const COURSE_STATUSES: Record<string, { color: string; label: string }> = {
    draft:      { color: 'orange', label: 'Bản nháp'   },
    published:  { color: 'blue',   label: 'Công khai'  },
    archived:   { color: 'default',label: 'Lưu trữ'   },
};

export const ENROLLMENT_STATUSES: Record<string, { color: string; label: string }> = {
    pending:   { color: 'orange', label: 'Chờ duyệt'   },
    enrolled:  { color: 'green',  label: 'Đã ghi danh' },
    completed: { color: 'blue',   label: 'Hoàn thành'  },
    dropped:   { color: 'red',    label: 'Đã rút'       },
};
