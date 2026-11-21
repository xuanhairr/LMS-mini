export const CLASS_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    gathering: { color: 'cyan', label: 'Sắp mở / Gom HV' },
    ready: { color: 'blue', label: 'Sẵn sàng' },
    active: { color: 'green', label: 'Đang diễn ra' },
    finished: { color: 'default', label: 'Đã kết thúc' },
    cancelled: { color: 'red', label: 'Đã hủy' }
};
