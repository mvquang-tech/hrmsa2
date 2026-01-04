import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkEmailReadIcon,
  MarkEmailUnread as MarkEmailUnreadIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export type MeetingForDialog = {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  attendees?: string;
  notes?: string;
  isRead?: boolean;
  creatorName?: string;
  creatorCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function MeetingDetailDialog({
  open,
  meeting,
  onClose,
  onEdit,
  onDelete,
  onToggleRead,
  onAddCalendar,
}: {
  open: boolean;
  meeting?: MeetingForDialog | null;
  onClose: () => void;
  onEdit: (meeting?: MeetingForDialog | null) => void;
  onDelete: (meeting?: MeetingForDialog | null) => void;
  onToggleRead: (markRead: boolean, meeting?: MeetingForDialog | null) => void;
  onAddCalendar: (meeting?: MeetingForDialog | null) => void;
}) {
  if (!meeting) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="meeting-detail-title"
    >
      <DialogTitle id="meeting-detail-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">{meeting.title}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ width: 28, height: 28 }}>{(meeting.creatorName || meeting.creatorCode || 'U')[0]}</Avatar>
              <Typography variant="body2" color="text.secondary">
                {meeting.creatorName || '-'} • {meeting.creatorCode || '-'}
              </Typography>
            </Stack>
          </Box>

          <Box>
            <Chip
              label={meeting.isRead ? 'Đã đọc' : 'Chưa đọc'}
              color={meeting.isRead ? 'default' : 'primary'}
              sx={{ mr: 1 }}
            />

            <IconButton
              aria-label={meeting.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
              onClick={() => onToggleRead(!meeting.isRead, meeting)}
            >
              {meeting.isRead ? <MarkEmailUnreadIcon /> : <MarkEmailReadIcon />}
            </IconButton>

            <IconButton aria-label="Chỉnh sửa" onClick={() => onEdit(meeting)}>
              <EditIcon />
            </IconButton>

            <IconButton aria-label="Thêm vào lịch" onClick={() => onAddCalendar(meeting)}>
              <CalendarIcon />
            </IconButton>

            <IconButton aria-label="Đóng" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Thời gian</Typography>
            <Typography sx={{ mb: 1 }}>{meeting.date} • {meeting.time} • {meeting.duration} phút</Typography>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2">Địa điểm</Typography>
            <Typography sx={{ mb: 1 }}>{meeting.location || '-'}</Typography>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2">Người tham dự</Typography>
            <Box sx={{ mt: 1 }}>
              {meeting.attendees ? (
                meeting.attendees.split(',').slice(0, 8).map((a, idx) => (
                  <Chip key={idx} label={a.trim()} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">-</Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Ghi chú / Agenda</Typography>
            <Box sx={{ whiteSpace: 'pre-wrap', mt: 1, p: 1, bgcolor: (theme) => theme.palette.action.hover, borderRadius: 1 }}>
              <Typography variant="body2">{meeting.notes || '-'}</Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="caption" color="text.secondary">
              Tạo: {meeting.createdAt || '-'} • Cập nhật: {meeting.updatedAt || '-'}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button color="error" onClick={() => onDelete(meeting)} startIcon={<DeleteIcon />}>Xóa cuộc họp</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
