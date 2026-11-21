import React, { useRef, useState, useEffect, useCallback } from 'react';
import { message, Modal, Button, notification } from 'antd';
import { WarningOutlined, CheckCircleFilled } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';

interface VideoPlayerProps {
    url: string;
    title?: string;
    /** ID của progress record trên BE (dùng để lưu tiến độ xem) */
    progressId?: string;
    /** Số giây đã xem từ lần trước (khôi phục từ BE) */
    initialWatchedSeconds?: number;
    /** Bài học này đã được đánh dấu hoàn thành trước đó chưa */
    isCompleted?: boolean;
    /** Callback khi video được đánh dấu hoàn thành (xem >= 90%) */
    onComplete?: () => void;
}

const SAVE_INTERVAL_MS = 10_000; // Lưu tiến độ lên BE mỗi 10 giây

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    url,
    title,
    progressId,
    initialWatchedSeconds = 0,
    isCompleted = false,
    onComplete,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [maxWatched, setMaxWatched] = useState(initialWatchedSeconds);
    const [showConfirm, setShowConfirm] = useState(false);
    const [popupTimes, setPopupTimes] = useState<number[]>([]);
    const [triggeredPopups, setTriggeredPopups] = useState<Set<number>>(new Set());
    const [completedLocal, setCompletedLocal] = useState(isCompleted);

    // Dùng ref để tránh stale closure trong handlers
    const completedRef = useRef(isCompleted);
    const maxWatchedRef = useRef(initialWatchedSeconds);
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef(initialWatchedSeconds);

    // Sync khi prop thay đổi (ví dụ sau khi reload)
    useEffect(() => {
        setCompletedLocal(isCompleted);
        completedRef.current = isCompleted;
    }, [isCompleted]);

    useEffect(() => {
        setMaxWatched(initialWatchedSeconds);
        maxWatchedRef.current = initialWatchedSeconds;
        lastSavedRef.current = initialWatchedSeconds;
    }, [initialWatchedSeconds, url]);

    // Helper to check if it's a YouTube link
    const getYouTubeId = (urlStr: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = urlStr.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const youtubeId = getYouTubeId(url);

    // Gửi tiến độ xem lên BE
    const saveVideoProgress = useCallback(async (watchedSeconds: number, duration: number, forceComplete = false) => {
        if (!progressId) return;
        if (!forceComplete && Math.abs(watchedSeconds - lastSavedRef.current) < 3) return; // Không lưu nếu thay đổi quá nhỏ
        try {
            lastSavedRef.current = watchedSeconds;
            const res = await apiFetch<any>(`/progresses/${progressId}/video-progress`, {
                method: 'PATCH',
                body: JSON.stringify({ watchedSeconds, duration }),
            });
            // Nếu BE báo completed (mới chuyển thành completed), cập nhật local state
            if (res?.data?.completed && !completedRef.current) {
                completedRef.current = true;
                setCompletedLocal(true);
                if (onComplete) onComplete();
            }
        } catch {
            // Silent fail - không block trải nghiệm người dùng
        }
    }, [progressId, onComplete]);

    // Bắt đầu interval lưu định kỳ khi video đang phát
    const startSaveTimer = useCallback(() => {
        if (saveTimerRef.current) return;
        saveTimerRef.current = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                const dur = videoRef.current.duration || 0;
                saveVideoProgress(maxWatchedRef.current, dur);
            }
        }, SAVE_INTERVAL_MS);
    }, [saveVideoProgress]);

    const stopSaveTimer = useCallback(() => {
        if (saveTimerRef.current) {
            clearInterval(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        // Lưu ngay khi pause / unmount
        if (videoRef.current) {
            const dur = videoRef.current.duration || 0;
            saveVideoProgress(maxWatchedRef.current, dur);
        }
    }, [saveVideoProgress]);

    // Dọn dẹp khi unmount
    useEffect(() => {
        return () => {
            stopSaveTimer();
        };
    }, [stopSaveTimer]);

    // Xử lý chống treo máy (chuyển tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (completedRef.current) return;
            if (document.hidden && videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
                message.warning('Video đã tạm dừng do bạn chuyển sang tab khác!');
                setShowConfirm(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Tính toán các mốc thời gian hiển thị popup ngẫu nhiên dựa vào độ dài video
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;

            // Khôi phục vị trí xem từ lần trước nếu chưa hoàn thành
            if (!completedRef.current && initialWatchedSeconds > 5) {
                videoRef.current.currentTime = initialWatchedSeconds;
            }

            if (duration > 180) {
                const numPopups = Math.floor(duration / 180);
                if (numPopups > 0) {
                    const interval = duration / (numPopups + 1);
                    const times: number[] = [];
                    for (let i = 1; i <= numPopups; i++) {
                        const min = interval * i - (interval * 0.2);
                        const max = interval * i + (interval * 0.2);
                        times.push(Math.random() * (max - min) + min);
                    }
                    setPopupTimes(times);
                }
            }
        }
    };

    const handleConfirmPresence = () => {
        setShowConfirm(false);
        videoRef.current?.play();
    };

    const handleTimeUpdate = () => {
        if (videoRef.current && !videoRef.current.seeking) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration || 0;

            // Cập nhật maxWatched (Chỉ cập nhật nếu tiến độ bình thường, không phải do tua nhảy vọt)
            if (current > maxWatchedRef.current && current - maxWatchedRef.current <= 2) {
                maxWatchedRef.current = current;
                setMaxWatched(current);
            }

            // Kiểm tra hoàn thành >= 90% (chỉ trigger 1 lần, ngay tại client để UX nhanh)
            if (!completedRef.current && duration > 0 && current / duration >= 0.97) {
                completedRef.current = true;
                setCompletedLocal(true);
                // Lưu ngay lên BE với flag hoàn thành
                saveVideoProgress(current, duration, true);
                if (onComplete) onComplete();
                notification.success({
                    message: 'Hoàn thành bài học!',
                    description: 'Tuyệt vời! Bạn đã hoàn thành video này. Hãy chuyển sang nội dung tiếp theo nhé.',
                    placement: 'topRight'
                });
            }

            // Kiểm tra hiện popup xác nhận hiện diện
            if (!completedRef.current && !showConfirm) {
                for (let i = 0; i < popupTimes.length; i++) {
                    const pTime = popupTimes[i];
                    if (current >= pTime && current < pTime + 1.5 && !triggeredPopups.has(i)) {
                        videoRef.current.pause();
                        setShowConfirm(true);
                        setTriggeredPopups(prev => new Set(prev).add(i));
                        break;
                    }
                }
            }
        }
    };

    const handleSeeking = () => {
        // Nếu bài học đã hoàn thành → cho tua tự do
        if (completedRef.current) return;

        if (videoRef.current) {
            if (videoRef.current.currentTime > maxWatchedRef.current + 1) {
                message.warning('Bạn không được tua nhanh qua phần chưa xem!');
                videoRef.current.currentTime = maxWatchedRef.current;
            }
        }
    };

    return (
        <div className="w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl relative">


            {youtubeId ? (
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
                    title={title || "Video Player"}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="min-h-[450px]"
                />
            ) : (
                <>
                    <video
                        ref={videoRef}
                        key={url}
                        controls
                        controlsList="nodownload"
                        className="w-full h-full min-h-[450px]"
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        onSeeking={handleSeeking}
                        onPlay={startSaveTimer}
                        onPause={stopSaveTimer}
                        poster="https://placehold.co/800x450/000000/FFFFFF?text=Course+Video"
                    >
                        <source src={url} type="video/mp4" />
                        Trình duyệt của bạn không hỗ trợ phát video.
                    </video>

                    <Modal
                        title={
                            <div className="flex items-center gap-2 text-orange-500">
                                <WarningOutlined />
                                <span>Xác nhận đang học</span>
                            </div>
                        }
                        open={showConfirm}
                        closable={false}
                        maskClosable={false}
                        footer={
                            <Button type="primary" onClick={handleConfirmPresence} className="w-full">
                                Tôi vẫn đang xem
                            </Button>
                        }
                        centered
                    >
                        <p className="text-gray-600">Hệ thống đang kiểm tra sự hiện diện của bạn. Vui lòng xác nhận để tiếp tục xem bài giảng.</p>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default VideoPlayer;
