import React, { useState, useEffect } from 'react';
import { Button, Upload, Table, message, Alert, Typography, Tag, Space } from 'antd';
import { UploadOutlined, DownloadOutlined, SaveOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';

interface StudentImportProps {
    classId: string;
    onSuccess: () => void;
}

interface ImportRow {
    key: string;
    index: number;
    identifier: string;
    status?: 'valid' | 'invalid' | 'enrolled';
    fullName?: string;
    email?: string;
    userId?: string;
}

export const StudentImport: React.FC<StudentImportProps> = ({ classId, onSuccess }) => {
    const [data, setData] = useState<ImportRow[]>([]);
    const [validating, setValidating] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [hasValidated, setHasValidated] = useState(false);

    // Xóa data cũ nếu chuyển sang import cho lớp khác
    useEffect(() => {
        setData([]);
        setHasValidated(false);
    }, [classId]);

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Email học viên'],
            ['hocviendemo1'],
            ['hocvien2@example.com']
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'template_import_students.xlsx');
    };

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
                
                // Skip header row
                const rows = json.slice(1).filter(row => row[0]);
                
                const tableData: ImportRow[] = rows.map((row, index) => ({
                    key: index.toString(),
                    index: index + 1,
                    identifier: row[0].toString().trim(),
                }));

                setData(tableData);
                setHasValidated(false);
                validateData(tableData);
            } catch (error) {
                message.error('Lỗi khi đọc file Excel');
            }
        };
        reader.readAsBinaryString(file);
        return false; // Prevent default upload
    };

    const validateData = async (rows: ImportRow[]) => {
        if (!rows.length) return;
        setValidating(true);
        try {
            const identifiers = rows.map(r => r.identifier);
            const res = await apiFetch(`/classes/${classId}/validate-import`, { 
                method: 'POST',
                body: JSON.stringify({ identifiers })
            });
            const resultData = res.data as any[];

            const updatedData = rows.map((row, index) => {
                const idLower = row.identifier.toLowerCase();
                
                // Kiểm tra xem dòng này có bị trùng với dòng trước đó trong file không
                const firstIndex = rows.findIndex(r => r.identifier.toLowerCase() === idLower);
                if (firstIndex < index) {
                    return { ...row, status: 'invalid' as const, errMessage: 'Bị trùng lặp trong file' };
                }

                const match = resultData.find((r: any) => r.identifier.toLowerCase() === idLower);
                if (match) {
                    return { 
                        ...row, 
                        status: match.status, 
                        errMessage: match.errMessage,
                        fullName: match.fullName, 
                        email: match.email, 
                        userId: match.id 
                    };
                }

                return { ...row, status: 'invalid' as const, errMessage: 'Tài khoản không tồn tại' };
            });

            setData(updatedData);
            setHasValidated(true);
        } catch (error) {
            message.error('Lỗi khi kiểm tra dữ liệu');
        } finally {
            setValidating(false);
        }
    };

    const handleSave = async () => {
        const validUsers = data.filter(r => r.status === 'valid' && r.userId);
        if (validUsers.length === 0) {
            message.warning('Không có học viên hợp lệ nào để thêm!');
            return;
        }

        setEnrolling(true);
        try {
            const userIds = validUsers.map(r => r.userId!);
            await apiFetch(`/classes/${classId}/enroll-bulk`, { 
                method: 'POST',
                body: JSON.stringify({ userIds })
            });
            message.success(`Đã thêm thành công ${userIds.length} học viên!`);
            onSuccess();
            setData([]);
            setHasValidated(false);
        } catch (error) {
            message.error('Lỗi khi lưu học viên');
        } finally {
            setEnrolling(false);
        }
    };

    const columns = [
      { title: "STT", dataIndex: "index", width: 60 },
      { title: "Email", dataIndex: "identifier" },
      { title: "Họ tên", dataIndex: "fullName" },
      {
        title: "Trạng thái",
        key: "status",
        render: (_: any, record: ImportRow & { errMessage?: string }) => {
            if (!hasValidated) return <Tag color="default">Chờ kiểm tra</Tag>;
            if (record.status === 'valid') return <Tag color="success">Hợp lệ</Tag>;
            return <Tag color="error">Lỗi</Tag>;
        },
      },
      {
        title: "Thông báo lỗi",
        dataIndex: "errMessage",
      },
    ];

    const validCount = data.filter(d => d.status === 'valid').length;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                    Tải File Mẫu
                </Button>
            </div>
            
            <Upload.Dragger 
                beforeUpload={handleUpload} 
                showUploadList={false} 
                accept=".xlsx,.xls,.csv"
                className="bg-white"
            >
                <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                </p>
                <p className="ant-upload-text">Nhấp chuột hoặc Kéo thả file vào khu vực này để tải lên</p>
                <p className="ant-upload-hint">
                    Hỗ trợ định dạng .xlsx, .xls, .csv
                </p>
            </Upload.Dragger>

            <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <Typography.Text strong>Kết quả {data.length > 0 ? `(${data.length} dòng)` : ''}</Typography.Text>
                    <Button 
                        type="primary" 
                        icon={<SaveOutlined />} 
                        onClick={handleSave} 
                        loading={enrolling}
                        disabled={validCount === 0 || validating}
                    >
                        Lưu {validCount} học viên hợp lệ
                    </Button>
                </div>
                <Table 
                    columns={columns} 
                    dataSource={data} 
                    loading={validating}
                    size="small"
                    pagination={{ pageSize: 10 }}
                    className="border rounded-md"
                />
            </div>
        </div>
    );
};
