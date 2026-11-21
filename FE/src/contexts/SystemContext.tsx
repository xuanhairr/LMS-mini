import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface StatusConfig {
    color: string;
    label: string;
    order?: number;
}

export interface SystemConstants {
    classStatuses: Record<string, StatusConfig>;
    courseStatuses: Record<string, StatusConfig>;
    enrollmentStatuses: Record<string, StatusConfig>;
}

// Fallback defaults (used while loading or if API fails)
const DEFAULT_CONSTANTS: SystemConstants = {
    classStatuses: {
        gathering: { color: 'cyan',    label: 'Sắp mở / Gom HV', order: 1 },
        ready:     { color: 'blue',    label: 'Sẵn sàng',         order: 2 },
        active:    { color: 'green',   label: 'Đang diễn ra',     order: 3 },
        finished:  { color: 'default', label: 'Đã kết thúc',      order: 4 },
        cancelled: { color: 'red',     label: 'Đã hủy',           order: 5 },
    },
    courseStatuses: {
        draft:     { color: 'orange',  label: 'Bản nháp'   },
        published: { color: 'blue',    label: 'Công khai'  },
        archived:  { color: 'default', label: 'Lưu trữ'   },
    },
    enrollmentStatuses: {
        pending:   { color: 'orange', label: 'Chờ duyệt'   },
        enrolled:  { color: 'green',  label: 'Đã ghi danh' },
        completed: { color: 'blue',   label: 'Hoàn thành'  },
        dropped:   { color: 'red',    label: 'Đã rút'       },
    },
};

const SystemContext = createContext<SystemConstants>(DEFAULT_CONSTANTS);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [constants, setConstants] = useState<SystemConstants>(DEFAULT_CONSTANTS);

    useEffect(() => {
        apiFetch<SystemConstants>('/system/constants')
            .then((res) => {
                // apiFetch wraps data in res.data on success, but /system/constants returns directly
                const data = (res as any).data ?? res;
                if (data?.classStatuses) {
                    setConstants(data as SystemConstants);
                }
            })
            .catch(() => {
                // Keep defaults silently
            });
    }, []);

    return (
        <SystemContext.Provider value={constants}>
            {children}
        </SystemContext.Provider>
    );
};

export const useSystemConstants = () => useContext(SystemContext);

/** Helper to get a status tag config, with a safe fallback */
export const getStatusConfig = (
    statusMap: Record<string, StatusConfig>,
    status: string
): StatusConfig => {
    return statusMap[status] ?? { color: 'default', label: status };
};
