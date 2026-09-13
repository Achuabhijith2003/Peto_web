-- =========================================================================
-- Migration 18: Peto Admin Notification Center & Operational Alerts
-- =========================================================================

-- 1. Admin Notifications Table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE, -- NULL indicates platform-wide broadcast to all active admins
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'HIGH_PRIORITY_REPORT',
            'PENDING_MODERATION',
            'PENDING_ADVERTISEMENT',
            'SYSTEM_FAILURE',
            'STORAGE_WARNING',
            'API_ERROR_SPIKE',
            'SECURITY_EVENT',
            'COMPLIANCE_REQUEST'
        )
    ),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (
        priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
    ),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    dedup_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for Performance & Scalability
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread 
    ON public.admin_notifications (is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_category 
    ON public.admin_notifications (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority 
    ON public.admin_notifications (priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_dedup 
    ON public.admin_notifications (dedup_key, is_read);

-- 3. Initial Seeded Admin Alerts for Testing & Verification
INSERT INTO public.admin_notifications (
    id, category, priority, title, message, link, metadata, is_read, dedup_key, created_at
) VALUES 
    (
        'e0000000-0000-0000-0000-000000000001',
        'HIGH_PRIORITY_REPORT',
        'CRITICAL',
        'Urgent: Animal Safety Report Filed',
        'A user post was flagged for severe safety violations by multiple community members requiring immediate review.',
        '/moderation?priority=HIGH',
        '{"report_id": "5088d4e6-4db4-4ebd-b8dc-3e1f9df405cc", "target_type": "post", "reason": "animal_abuse"}'::jsonb,
        FALSE,
        'report:high_priority:5088d4e6',
        NOW() - INTERVAL '12 minutes'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'API_ERROR_SPIKE',
        'HIGH',
        'Elevated 5xx Error Rate Detected',
        'Media upload endpoint /api/media/upload experienced a 6.4% 500 error rate over the last 15 minutes.',
        '/system',
        '{"endpoint": "/api/media/upload", "error_rate": 0.064, "threshold": 0.05}'::jsonb,
        FALSE,
        'system:api_spike:upload:5xx',
        NOW() - INTERVAL '28 minutes'
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'PENDING_ADVERTISEMENT',
        'MEDIUM',
        'New Ad Campaign Awaiting Review',
        'Bark & Whiskers Organic Foods submitted "Spring Organic Feast" campaign with 2 creatives.',
        '/ads',
        '{"campaign_id": "c0000000-0000-0000-0000-000000000001", "advertiser": "Bark & Whiskers Organic Foods"}'::jsonb,
        FALSE,
        'ads:pending_review:c0000000',
        NOW() - INTERVAL '45 minutes'
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'STORAGE_WARNING',
        'HIGH',
        'Storage Capacity Warning (>85%)',
        'Supabase Storage bucket "peto-media" has reached 87.3% capacity (873 GB of 1 TB).',
        '/system',
        '{"bucket": "peto-media", "used_gb": 873, "capacity_gb": 1000, "usage_pct": 87.3}'::jsonb,
        FALSE,
        'storage:capacity:peto-media:87pct',
        NOW() - INTERVAL '2 hours'
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        'SECURITY_EVENT',
        'CRITICAL',
        'Multiple Failed Admin Login Attempts',
        '5 consecutive failed login attempts detected from IP 198.51.100.44 for administrator account @superadmin.',
        '/audit-logs',
        '{"target_username": "superadmin", "ip_address": "198.51.100.44", "attempts": 5}'::jsonb,
        FALSE,
        'security:failed_login:superadmin:198.51.100.44',
        NOW() - INTERVAL '3 hours'
    ),
    (
        'e0000000-0000-0000-0000-000000000006',
        'COMPLIANCE_REQUEST',
        'HIGH',
        'Urgent GDPR Erasure Request',
        'User user_88291 filed a statutory Article 17 "Right to be Forgotten" account deletion request.',
        '/compliance',
        '{"request_type": "ACCOUNT_DELETION", "jurisdiction": "GDPR", "user_id": "88291"}'::jsonb,
        FALSE,
        'compliance:erasure:88291',
        NOW() - INTERVAL '5 hours'
    ),
    (
        'e0000000-0000-0000-0000-000000000007',
        'PENDING_MODERATION',
        'MEDIUM',
        'Moderation Queue Threshold Exceeded',
        'There are currently 14 pending reports in the moderation queue requiring triage.',
        '/moderation',
        '{"pending_count": 14, "threshold": 10}'::jsonb,
        TRUE,
        'moderation:queue_depth:14',
        NOW() - INTERVAL '1 day'
    ),
    (
        'e0000000-0000-0000-0000-000000000008',
        'SYSTEM_FAILURE',
        'LOW',
        'Background Video Transcoding Worker Restared',
        'Worker process video-transcoder-02 exited unexpectedly and was automatically recovered by PM2/Docker.',
        '/system',
        '{"worker_id": "video-transcoder-02", "restart_count": 1}'::jsonb,
        TRUE,
        'system:worker_restart:video-transcoder-02',
        NOW() - INTERVAL '2 days'
    )
ON CONFLICT (id) DO NOTHING;
